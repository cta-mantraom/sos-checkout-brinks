import { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getPaymentConfig } from '../lib/config';
import { MercadoPagoClient, MercadoPagoPaymentResponse } from '../lib/infrastructure/mercadopago/MercadoPagoClient';
import { ProfileService } from '../lib/domain/services/ProfileService';
import { PaymentRepository } from '../lib/infrastructure/repositories/PaymentRepository';
import { ProfileRepository } from '../lib/infrastructure/repositories/ProfileRepository';
import { QRCodeService } from '../lib/domain/services/QRCodeService';
import { Payment } from '../lib/domain/entities/Payment';
import { PaymentStatus } from '../lib/domain/value-objects/PaymentStatus';
import { PaymentMethod } from '../lib/domain/value-objects/PaymentMethod';
import { PaymentAmount } from '../lib/domain/value-objects/PaymentAmount';
import { PaymentDescription } from '../lib/domain/value-objects/PaymentDescription';

// Schema de validação para o request
const validatePaymentSchema = z.object({
  paymentId: z.string().min(1, 'ID do pagamento é obrigatório'),
  profileData: z.object({
    fullName: z.string(),
    cpf: z.string(),
    phone: z.string(),
    email: z.string().email(),
    bloodType: z.string(),
    emergencyContact: z.string(),
    medicalInfo: z.string().optional(),
    subscriptionPlan: z.enum(['basic', 'premium'])
  }).optional(),
  profileId: z.string().optional(),
  amount: z.number().positive(),
  subscriptionType: z.enum(['basic', 'premium']).optional()
});

type ValidatePaymentData = z.infer<typeof validatePaymentSchema>;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'https://memoryys.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Device-Session-Id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('[validate-payment] ✅ MODO DIRETO: Validando pagamento já processado pelo Payment Brick');

    // 1. Validar dados de entrada
    const validatedData = validatePaymentSchema.parse(req.body);
    const { paymentId, profileData, profileId, amount, subscriptionType } = validatedData;

    console.log('[validate-payment] Dados validados:', {
      paymentId,
      hasProfileData: !!profileData,
      hasProfileId: !!profileId,
      amount
    });

    // 2. Configurar cliente MercadoPago
    const paymentConfig = getPaymentConfig();
    const mercadopagoClient = new MercadoPagoClient({
      accessToken: paymentConfig.mercadopago.accessToken,
      webhookSecret: paymentConfig.mercadopago.webhookSecret,
      environment: paymentConfig.mercadopago.environment
    });

    // 3. ✅ MODO DIRETO: Buscar pagamento JÁ PROCESSADO no MercadoPago
    console.log('[validate-payment] 🔍 Consultando pagamento processado pelo Payment Brick:', paymentId);
    const mpPayment = await mercadopagoClient.getPaymentById(paymentId);
    
    if (!mpPayment) {
      console.error('[validate-payment] ❌ Pagamento não encontrado no MercadoPago');
      return res.status(404).json({
        success: false,
        message: 'Pagamento não encontrado no MercadoPago. Verifique se o Payment Brick processou corretamente.'
      });
    }

    console.log('[validate-payment] ✅ Pagamento encontrado (já processado):', {
      id: mpPayment.id,
      status: mpPayment.status,
      status_detail: mpPayment.status_detail,
      amount: mpPayment.transaction_amount,
      payment_method_id: mpPayment.payment_method_id,
      mode: 'DIRECT_PROCESSED' // Indicador de que foi processado pelo Brick
    });

    // 4. Se pagamento aprovado, salvar no banco
    let savedProfile = null;
    let qrCodeUrl = null;

    if (mpPayment.status === 'approved') {
      console.log('[validate-payment] Pagamento aprovado, salvando dados...');

      // Inicializar repositórios
      const profileRepository = new ProfileRepository();
      const paymentRepository = new PaymentRepository();
      const qrCodeService = new QRCodeService();

      // Se tem profileData (novo perfil), criar
      if (profileData && !profileId) {
        const profileService = new ProfileService(profileRepository, qrCodeService);
        
        console.log('[validate-payment] Criando novo perfil médico...');
        savedProfile = await profileService.createProfile({
          fullName: profileData.fullName,
          cpf: profileData.cpf,
          phone: profileData.phone,
          email: profileData.email,
          bloodType: profileData.bloodType,
          emergencyContact: profileData.emergencyContact,
          medicalInfo: profileData.medicalInfo,
          subscriptionPlan: profileData.subscriptionPlan
        });

        // Gerar QR Code
        try {
          qrCodeUrl = await qrCodeService.generateQRCode(savedProfile.getId());
          console.log('[validate-payment] QR Code gerado com sucesso');
        } catch (error) {
          console.error('[validate-payment] Erro ao gerar QR Code:', error);
        }
      }

      // Salvar pagamento no banco
      const payment = new Payment(
        `payment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        profileId || savedProfile?.getId() || 'unknown',
        new PaymentAmount(mpPayment.transaction_amount),
        PaymentMethod.fromString(mpPayment.payment_method_id),
        new PaymentDescription(subscriptionType || 'basic'),
        PaymentStatus.APPROVED
      );

      payment.setMercadoPagoData(mpPayment.id, {
        qrCode: mpPayment.point_of_interaction?.transaction_data?.qr_code || '',
        qrCodeBase64: mpPayment.point_of_interaction?.transaction_data?.qr_code_base64 || ''
      });

      await paymentRepository.save(payment);
      console.log('[validate-payment] Pagamento salvo no banco');
    }

    // 5. Retornar resultado
    const response = {
      success: true,
      payment: {
        id: mpPayment.id,
        status: mpPayment.status,
        status_detail: mpPayment.status_detail,
        transaction_amount: mpPayment.transaction_amount,
        payment_method_id: mpPayment.payment_method_id,
        point_of_interaction: mpPayment.point_of_interaction
      },
      profile: savedProfile ? {
        id: savedProfile.getId(),
        qrCodeUrl: qrCodeUrl
      } : null
    };

    console.log('[validate-payment] Validação concluída com sucesso');
    return res.status(200).json(response);

  } catch (error) {
    console.error('[validate-payment] Erro na validação:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: error.errors
      });
    }

    if (error instanceof Error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erro interno ao validar pagamento'
    });
  }
}