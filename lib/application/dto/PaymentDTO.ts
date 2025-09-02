import { z } from 'zod';

// Schema base sem validações condicionais
const CreatePaymentSchemaBase = z.object({
  profileId: z.string()
    .min(1, 'ID do perfil é obrigatório')
    .regex(/^profile_\d+_[a-z0-9]+$/, 'Formato de ID do perfil inválido'),
    
  amount: z.number()
    .min(5, 'Valor mínimo é R$ 5,00')
    .max(10000, 'Valor máximo é R$ 10.000,00')
    .positive('Valor deve ser positivo')
    .refine((val) => Number.isFinite(val), 'Valor deve ser um número válido')
    .transform((val) => Math.round(val * 100) / 100), // Arredondar para 2 casas decimais
    
  paymentMethodId: z.string()
    .min(1, 'ID do método de pagamento é obrigatório'),
    
  paymentMethod: z.enum(['credit_card', 'debit_card', 'pix', 'boleto'], {
    errorMap: () => ({ message: 'Método de pagamento deve ser credit_card, debit_card, pix ou boleto' })
  }),
  
  installments: z.number()
    .int('Parcelas deve ser um número inteiro')
    .min(1, 'Mínimo de 1 parcela')
    .max(12, 'Máximo de 12 parcelas')
    .optional()
    .default(1),
    
  description: z.string()
    .max(255, 'Descrição deve ter no máximo 255 caracteres')
    .optional(),
    
  token: z.string().optional(), // ✅ Token do Payment Brick para cartões
  deviceId: z.string().optional(), // ✅ Device ID para segurança MercadoPago
    
  // Dados do pagador (para MercadoPago)
  payer: z.object({
    email: z.string().email('Email do pagador inválido'),
    identification: z.object({
      type: z.enum(['CPF', 'CNPJ']).default('CPF'),
      number: z.string().min(11, 'CPF deve ter pelo menos 11 dígitos')
    }).optional()
  }).optional()
});

// Schema com validações condicionais
const CreatePaymentSchema = CreatePaymentSchemaBase.refine((data) => {
  // PIX e boleto não aceitam parcelamento
  if (['pix', 'boleto'].includes(data.paymentMethod) && data.installments > 1) {
    return false;
  }
  
  return true;
}, {
  message: 'Configuração de pagamento inválida',
  path: ['paymentMethod']
});

// Schema para webhook do MercadoPago
// Baseado na estrutura real recebida do MercadoPago
const WebhookSchema = z.object({
  id: z.number(),
  live_mode: z.boolean(),
  type: z.string(),
  date_created: z.string(),
  // Campos opcionais - nem sempre enviados pelo MercadoPago
  application_id: z.number().optional(),
  user_id: z.union([z.number(), z.string()]), // Pode vir como string ou number
  version: z.number().optional(),
  api_version: z.string(),
  action: z.string(),
  data: z.object({
    id: z.union([z.string(), z.number()]) // ID pode vir como string ou number
  })
});

// Schema para atualizar status de pagamento
const UpdatePaymentStatusSchema = z.object({
  paymentId: z.string().min(1, 'ID do pagamento é obrigatório'),
  status: z.enum([
    'pending', 'approved', 'authorized', 'in_process', 
    'in_mediation', 'rejected', 'cancelled', 'refunded', 'charged_back'
  ]),
  reason: z.string().optional(),
  mercadoPagoData: z.object({
    id: z.string(),
    status: z.string(),
    status_detail: z.string(),
    pixQrCode: z.string().optional(),
    pixQrCodeBase64: z.string().optional(),
    boletoUrl: z.string().optional()
  }).optional()
});

export type CreatePaymentData = z.infer<typeof CreatePaymentSchema>;
export type WebhookData = z.infer<typeof WebhookSchema>;
export type UpdatePaymentStatusData = z.infer<typeof UpdatePaymentStatusSchema>;

export class PaymentDTO {
  static validateCreatePayment(data: unknown): CreatePaymentData {
    try {
      return CreatePaymentSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new Error(`Dados de pagamento inválidos: ${messages.join(', ')}`);
      }
      throw error;
    }
  }

  static validateWebhook(data: unknown): WebhookData {
    try {
      return WebhookSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new Error(`Webhook inválido: ${messages.join(', ')}`);
      }
      throw error;
    }
  }

  static validateUpdateStatus(data: unknown): UpdatePaymentStatusData {
    try {
      return UpdatePaymentStatusSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new Error(`Dados de atualização inválidos: ${messages.join(', ')}`);
      }
      throw error;
    }
  }

  // Métodos utilitários
  static validateAmount(amount: number): boolean {
    try {
      CreatePaymentSchemaBase.shape.amount.parse(amount);
      return true;
    } catch {
      return false;
    }
  }

  static validatePaymentMethod(method: string): boolean {
    try {
      CreatePaymentSchemaBase.shape.paymentMethod.parse(method);
      return true;
    } catch {
      return false;
    }
  }

  static validateInstallments(installments: number, paymentMethod: string): boolean {
    try {
      CreatePaymentSchema.parse({
        profileId: 'profile_123_abc',
        amount: 100,
        paymentMethodId: 'test',
        paymentMethod,
        installments
      });
      return true;
    } catch {
      return false;
    }
  }

  // Método para limpar dados antes da validação
  static clean(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const input = data as Record<string, unknown>;
    const cleaned = { ...input };

    // Converter amount para número se for string
    if (typeof cleaned.amount === 'string') {
      const numValue = parseFloat(cleaned.amount);
      if (!isNaN(numValue)) {
        cleaned.amount = numValue;
      }
    }

    // Converter installments para número se for string
    if (typeof cleaned.installments === 'string') {
      const numValue = parseInt(cleaned.installments);
      if (!isNaN(numValue)) {
        cleaned.installments = numValue;
      }
    }

    // Limpar email do pagador
    const payer = cleaned.payer as Record<string, unknown> | undefined;
    if (payer?.email && typeof payer.email === 'string') {
      payer.email = payer.email.toLowerCase().trim();
    }

    // Limpar CPF/CNPJ
    const identification = payer?.identification as Record<string, unknown> | undefined;
    if (identification?.number && typeof identification.number === 'string') {
      identification.number = identification.number.replace(/\D/g, '');
    }

    // Garantir que deviceId seja string ou undefined
    if (cleaned.deviceId !== undefined && typeof cleaned.deviceId !== 'string') {
      cleaned.deviceId = String(cleaned.deviceId);
    }

    return cleaned;
  }

  static validateAndClean(data: unknown): CreatePaymentData {
    const cleaned = this.clean(data);
    return this.validateCreatePayment(cleaned);
  }

  // Validações específicas por método de pagamento
  static getPaymentMethodRequirements(method: string): {
    allowsInstallments: boolean;
    maxInstallments: number;
    description: string;
  } {
    const requirements = {
      credit_card: {
        allowsInstallments: true,
        maxInstallments: 12,
        description: 'Cartão de Crédito'
      },
      debit_card: {
        allowsInstallments: false,
        maxInstallments: 1,
        description: 'Cartão de Débito'
      },
      pix: {
        allowsInstallments: false,
        maxInstallments: 1,
        description: 'PIX'
      },
      boleto: {
        allowsInstallments: false,
        maxInstallments: 1,
        description: 'Boleto Bancário'
      }
    };

    return requirements[method as keyof typeof requirements] || {
      allowsInstallments: false,
      maxInstallments: 1,
      description: 'Método desconhecido'
    };
  }

  static calculateInstallmentAmount(amount: number, installments: number): number {
    return Math.round((amount / installments) * 100) / 100;
  }

  static calculateTotalWithInterest(amount: number, installments: number, method: string): number {
    if (method === 'credit_card' && installments > 1) {
      const interestRate = 0.02; // 2% ao mês
      const interest = amount * interestRate * (installments - 1);
      return Math.round((amount + interest) * 100) / 100;
    }
    return amount;
  }
}