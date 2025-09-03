import { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getPaymentConfig, getMercadoPagoClientConfig } from '../lib/config/contexts/payment.config.js';
import { MercadoPagoClient, MercadoPagoPaymentRequest, MercadoPagoPaymentResponse } from '../lib/infrastructure/mercadopago/MercadoPagoClient.js';
import { ProfileService } from '../lib/domain/services/ProfileService.js';
import { PaymentRepository } from '../lib/infrastructure/repositories/PaymentRepository.js';
import { ProfileRepository } from '../lib/infrastructure/repositories/ProfileRepository.js';
import { Payment } from '../lib/domain/entities/Payment.js';
import { PaymentStatus } from '../lib/domain/value-objects/PaymentStatus.js';
import { PaymentMethod } from '../lib/domain/value-objects/PaymentMethod.js';

// ❌ NUNCA usar any - SEMPRE validar com Zod
// ✅ Schema para dados do pagador (campos obrigatórios do Payment Brick)
const PayerSchema = z.object({
  email: z.string().email('Email inválido'),
  identification: z.object({
    type: z.literal('CPF'),
    number: z.string().regex(/^\d{11}$/, 'CPF deve conter 11 dígitos')
  }).optional()
});

// ✅ Schema para dados de cartão de crédito/débito
const CreditCardPaymentSchema = z.object({
  paymentType: z.literal('credit_card'),
  selectedPaymentMethod: z.literal('credit_card'),
  formData: z.object({
    token: z.string().min(1, 'Token do cartão é obrigatório'),
    issuer_id: z.string().min(1, 'Issuer ID é obrigatório'),
    payment_method_id: z.string().min(1, 'Payment method ID é obrigatório'),
    transaction_amount: z.number().refine(val => val === 5 || val === 10, 'Valor deve ser R$ 5,00 ou R$ 10,00'),
    installments: z.number().min(1).max(12),
    payer: PayerSchema
  })
});

// ✅ Schema para pagamentos PIX
const PixPaymentSchema = z.object({
  paymentType: z.literal('bank_transfer'),
  selectedPaymentMethod: z.literal('bank_transfer'),
  formData: z.object({
    payment_method_id: z.literal('pix'),
    transaction_amount: z.number().refine(val => val === 5 || val === 10, 'Valor deve ser R$ 5,00 ou R$ 10,00'),
    payer: PayerSchema
  })
});

// ✅ Schema unificado para ambos os tipos de pagamento
const ProcessPaymentSchema = z.discriminatedUnion('paymentType', [
  CreditCardPaymentSchema,
  PixPaymentSchema
]);

// ✅ Schema para dados adicionais (perfil médico)
const ProfileDataSchema = z.object({
  profileId: z.string().optional(),
  fullName: z.string().min(1, 'Nome completo é obrigatório').optional(),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve conter 11 dígitos').optional(),
  phone: z.string().min(10, 'Telefone inválido').optional(),
  bloodType: z.string().optional(),
  emergencyContact: z.string().min(1, 'Contato de emergência é obrigatório').optional(),
  medicalInfo: z.string().optional(),
  subscriptionPlan: z.enum(['basic', 'premium']).optional()
});

// ✅ Schema completo do request
const RequestSchema = z.object({
  payment: ProcessPaymentSchema,
  profile: ProfileDataSchema.optional(),
  metadata: z.object({
    deviceId: z.string().min(1, 'Device ID é obrigatório para segurança'),
    userAgent: z.string().optional(),
    ipAddress: z.string().optional()
  }).optional()
});

type ProcessPaymentData = z.infer<typeof ProcessPaymentSchema>;
type ProfileData = z.infer<typeof ProfileDataSchema>;
type RequestData = z.infer<typeof RequestSchema>;

/**
 * Endpoint para processar pagamentos do Payment Brick
 * 
 * IMPORTANTE: Este endpoint cria pagamentos no MercadoPago usando os dados
 * coletados pelo Payment Brick. Para cartões, usa o token seguro gerado.
 * Para PIX, gera QR code e chave copia-cola.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ✅ Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'https://memoryys.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Device-Session-Id, X-Idempotency-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido. Use POST.' 
    });
  }

  try {
    console.log('[process-payment] 🚀 Iniciando processamento de pagamento');
    console.log('[process-payment] Headers recebidos:', {
      deviceId: req.headers['x-device-session-id'],
      idempotencyKey: req.headers['x-idempotency-key'],
      userAgent: req.headers['user-agent']
    });

    // ✅ 1. VALIDAÇÃO CRÍTICA: Device ID obrigatório
    const deviceId = req.headers['x-device-session-id'] as string;
    if (!deviceId) {
      console.error('[process-payment] ❌ Device ID ausente - CRÍTICO para segurança');
      return res.status(400).json({
        success: false,
        error: 'Device ID é obrigatório para segurança. Verifique se o script do MercadoPago foi carregado.',
        code: 'DEVICE_ID_REQUIRED'
      });
    }

    // ✅ 2. Validar dados de entrada com Zod (NUNCA usar any)
    const validatedData: RequestData = RequestSchema.parse({
      payment: req.body.payment,
      profile: req.body.profile,
      metadata: {
        deviceId,
        userAgent: req.headers['user-agent'] as string,
        ipAddress: req.headers['x-forwarded-for'] as string || req.connection.remoteAddress
      }
    });

    const { payment: paymentData, profile: profileData, metadata } = validatedData;

    console.log('[process-payment] ✅ Dados validados:', {
      paymentType: paymentData.paymentType,
      amount: paymentData.formData.transaction_amount,
      paymentMethod: paymentData.formData.payment_method_id,
      hasProfileData: !!profileData,
      deviceId: metadata?.deviceId
    });

    // ✅ 3. Carregar configurações desacopladas (NUNCA acessar process.env diretamente)
    const paymentConfig = getPaymentConfig();
    const mercadoPagoConfig = getMercadoPagoClientConfig();

    // ✅ 4. Validar valores permitidos
    const allowedAmounts = [paymentConfig.prices.basic, paymentConfig.prices.premium];
    if (!allowedAmounts.includes(paymentData.formData.transaction_amount)) {
      console.error('[process-payment] ❌ Valor inválido:', paymentData.formData.transaction_amount);
      return res.status(400).json({
        success: false,
        error: `Valor inválido. Valores permitidos: R$ ${paymentConfig.prices.basic.toFixed(2)} ou R$ ${paymentConfig.prices.premium.toFixed(2)}`,
        code: 'INVALID_AMOUNT'
      });
    }

    // ✅ 5. Inicializar cliente MercadoPago
    const mercadoPagoClient = new MercadoPagoClient({
      accessToken: mercadoPagoConfig.accessToken,
      webhookSecret: mercadoPagoConfig.webhookSecret,
      environment: mercadoPagoConfig.environment
    });

    // ✅ 6. Construir request para MercadoPago baseado no tipo de pagamento
    const mpPaymentRequest: MercadoPagoPaymentRequest = buildMercadoPagoRequest(
      paymentData, 
      profileData, 
      deviceId
    );

    console.log('[process-payment] 🔄 Enviando pagamento para MercadoPago:', {
      amount: mpPaymentRequest.transaction_amount,
      method: mpPaymentRequest.payment_method_id,
      hasToken: !!mpPaymentRequest.token,
      hasDeviceId: !!metadata?.deviceId
    });

    // ✅ 7. Processar pagamento no MercadoPago
    // NOTA: Como o MercadoPagoClient não tem createPayment, vamos implementar aqui
    const mpResponse = await processPaymentInMercadoPago(
      mercadoPagoClient, 
      mpPaymentRequest, 
      deviceId
    );

    console.log('[process-payment] ✅ Resposta do MercadoPago:', {
      id: mpResponse.id,
      status: mpResponse.status,
      statusDetail: mpResponse.status_detail,
      method: mpResponse.payment_method_id,
      hasQrCode: !!mpResponse.point_of_interaction?.transaction_data?.qr_code
    });

    // ✅ 8. Salvar pagamento no banco de dados local
    let savedProfile: { id: string } | null = null;
    
    try {
      const paymentRepository = new PaymentRepository();
      const profileRepository = new ProfileRepository();

      // Se tem dados de perfil e pagamento foi aprovado/pendente, criar perfil
      if (profileData && (mpResponse.status === 'approved' || mpResponse.status === 'pending')) {
        // TODO: Implementar criação de perfil quando necessário
        console.log('[process-payment] 📝 Perfil será criado em processo separado');
      }

      // Criar entidade Payment
      const subscriptionType = paymentData.formData.transaction_amount === paymentConfig.prices.premium ? 'premium' : 'basic';
      
      const payment = Payment.create({
        profileId: profileData?.profileId || 'temp-' + mpResponse.id,
        amount: mpResponse.transaction_amount,
        paymentMethodId: mpResponse.payment_method_id,
        paymentMethod: mapToPaymentMethod(mpResponse.payment_method_id),
        description: subscriptionType
      });

      // Definir status baseado na resposta do MercadoPago
      const paymentStatus = mapMercadoPagoStatus(mpResponse.status);
      payment.updateStatus(paymentStatus);

      // Adicionar dados do MercadoPago
      payment.setMercadoPagoData(mpResponse.id, {
        qrCode: mpResponse.point_of_interaction?.transaction_data?.qr_code || '',
        qrCodeBase64: mpResponse.point_of_interaction?.transaction_data?.qr_code_base64 || ''
      });

      await paymentRepository.save(payment);
      
      console.log('[process-payment] 💾 Pagamento salvo no banco:', {
        localId: payment.getId(),
        mercadoPagoId: mpResponse.id,
        status: payment.getStatus().toString()
      });

    } catch (dbError) {
      console.error('[process-payment] ⚠️ Erro ao salvar no banco (pagamento já processado no MP):', dbError);
      // Não falhar o request se o pagamento foi processado com sucesso no MercadoPago
    }

    // ✅ 9. Retornar resposta apropriada baseada no tipo de pagamento
    const response = buildResponse(mpResponse, paymentData.paymentType, savedProfile);

    console.log('[process-payment] 🎉 Pagamento processado com sucesso:', {
      paymentId: mpResponse.id,
      status: mpResponse.status,
      type: paymentData.paymentType
    });

    return res.status(200).json(response);

  } catch (error) {
    console.error('[process-payment] ❌ Erro no processamento:', error);

    // ✅ Tratamento específico para erros de validação Zod
    if (error instanceof z.ZodError) {
      console.error('[process-payment] Erros de validação:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })),
        code: 'VALIDATION_ERROR'
      });
    }

    // ✅ Tratamento para erros do MercadoPago
    if (error instanceof Error) {
      if (error.message.includes('HTTP 4')) {
        return res.status(400).json({
          success: false,
          error: 'Erro nos dados de pagamento',
          message: error.message,
          code: 'MERCADOPAGO_CLIENT_ERROR'
        });
      }

      if (error.message.includes('HTTP 5')) {
        return res.status(503).json({
          success: false,
          error: 'Serviço de pagamento temporariamente indisponível',
          message: 'Tente novamente em alguns minutos',
          code: 'MERCADOPAGO_SERVER_ERROR'
        });
      }
    }

    // ✅ Erro genérico (sem expor detalhes internos)
    return res.status(500).json({
      success: false,
      error: 'Erro interno no processamento do pagamento',
      message: 'Entre em contato com o suporte',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * Constrói request para o MercadoPago baseado no tipo de pagamento
 */
function buildMercadoPagoRequest(
  paymentData: ProcessPaymentData, 
  profileData: ProfileData | undefined,
  deviceId: string
): MercadoPagoPaymentRequest {
  
  const baseRequest: MercadoPagoPaymentRequest = {
    transaction_amount: paymentData.formData.transaction_amount,
    payment_method_id: paymentData.formData.payment_method_id,
    payer: {
      email: paymentData.formData.payer.email,
      ...(paymentData.formData.payer.identification && {
        identification: {
          type: paymentData.formData.payer.identification.type,
          number: paymentData.formData.payer.identification.number
        }
      })
    },
    description: paymentData.formData.transaction_amount === 10 
      ? 'QR Code Emergência Médica - Plano Premium' 
      : 'QR Code Emergência Médica - Plano Básico',
    metadata: {
      subscription_plan: paymentData.formData.transaction_amount === 10 ? 'premium' : 'basic',
      profile_id: profileData?.profileId || 'new-profile',
      device_id: deviceId
    }
  };

  // ✅ Para cartão de crédito: adicionar token e installments
  if (paymentData.paymentType === 'credit_card') {
    return {
      ...baseRequest,
      token: paymentData.formData.token,
      installments: paymentData.formData.installments
    };
  }

  // ✅ Para PIX: request básico (QR code será gerado automaticamente)
  return baseRequest;
}

/**
 * Processa pagamento no MercadoPago usando o cliente
 * NOTA: Implementação temporária até o MercadoPagoClient ter createPayment
 */
async function processPaymentInMercadoPago(
  client: MercadoPagoClient, 
  paymentRequest: MercadoPagoPaymentRequest,
  deviceId: string
): Promise<MercadoPagoPaymentResponse> {
  
  // Como o MercadoPagoClient não tem createPayment, vamos usar fetch diretamente
  // TODO: Adicionar método createPayment no MercadoPagoClient
  
  const config = getMercadoPagoClientConfig();
  const url = config.environment === 'production' 
    ? 'https://api.mercadopago.com/v1/payments' 
    : 'https://api.mercadopago.com/v1/payments';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.accessToken}`,
      'X-Idempotency-Key': generateIdempotencyKey(),
      'X-meli-session-id': deviceId,
      'User-Agent': 'SOS-Checkout-Brinks/1.0'
    },
    body: JSON.stringify(paymentRequest)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData && typeof errorData === 'object' && 'message' in errorData 
      ? String(errorData.message) 
      : response.statusText;
    
    console.error('[process-payment] Erro do MercadoPago:', {
      status: response.status,
      error: errorData,
      request: paymentRequest
    });

    throw new Error(`HTTP ${response.status}: ${errorMessage}`);
  }

  const mpResponse = await response.json() as unknown;
  
  // ✅ Validar estrutura básica da resposta (sem usar any)
  if (!mpResponse || typeof mpResponse !== 'object' || !('id' in mpResponse)) {
    throw new Error('Resposta inválida do MercadoPago');
  }

  return mpResponse as MercadoPagoPaymentResponse;
}

/**
 * Constrói resposta apropriada baseada no tipo de pagamento
 */
function buildResponse(
  mpResponse: MercadoPagoPaymentResponse, 
  paymentType: string,
  savedProfile: { id: string } | null
) {
  const baseResponse = {
    success: true,
    payment: {
      id: mpResponse.id,
      status: mpResponse.status,
      status_detail: mpResponse.status_detail,
      amount: mpResponse.transaction_amount,
      payment_method_id: mpResponse.payment_method_id
    },
    profile: savedProfile
  };

  // ✅ Para PIX: incluir QR code e chave copia-cola
  if (paymentType === 'bank_transfer' && mpResponse.payment_method_id === 'pix') {
    return {
      ...baseResponse,
      pix: {
        qr_code: mpResponse.point_of_interaction?.transaction_data?.qr_code || '',
        qr_code_base64: mpResponse.point_of_interaction?.transaction_data?.qr_code_base64 || '',
        expiration_time: 1800 // 30 minutos
      }
    };
  }

  // ✅ Para cartão: resposta básica
  return baseResponse;
}

/**
 * Mapeia status do MercadoPago para PaymentStatus do domínio
 */
function mapMercadoPagoStatus(status: string): PaymentStatus {
  switch (status) {
    case 'approved':
      return PaymentStatus.APPROVED;
    case 'pending':
      return PaymentStatus.PENDING;
    case 'rejected':
      return PaymentStatus.REJECTED;
    case 'cancelled':
      return PaymentStatus.CANCELLED;
    default:
      return PaymentStatus.PENDING;
  }
}

/**
 * Mapeia payment_method_id do MercadoPago para PaymentMethod do domínio
 */
function mapToPaymentMethod(paymentMethodId: string): 'credit_card' | 'debit_card' | 'pix' | 'boleto' {
  if (paymentMethodId === 'pix') return 'pix';
  if (paymentMethodId === 'bolbradesco' || paymentMethodId === 'boleto') return 'boleto';
  if (paymentMethodId.includes('debito') || paymentMethodId.includes('debit')) return 'debit_card';
  return 'credit_card';
}

/**
 * Gera chave de idempotência única
 */
function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}