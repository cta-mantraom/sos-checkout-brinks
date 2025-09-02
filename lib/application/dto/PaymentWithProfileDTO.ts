import { z } from 'zod';

// Schema para dados do perfil que serão incluídos no pagamento
const ProfileDataSchema = z.object({
  fullName: z.string().min(3, 'Nome completo deve ter pelo menos 3 caracteres'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve conter exatamente 11 dígitos numéricos'),
  phone: z.string().regex(/^\d{10,11}$/, 'Telefone deve conter 10 ou 11 dígitos'),
  email: z.string().email('Email inválido'),
  bloodType: z.string().optional(),
  emergencyContact: z.object({
    name: z.string().min(3, 'Nome do contato deve ter pelo menos 3 caracteres'),
    phone: z.string().regex(/^\d{10,11}$/, 'Telefone do contato deve conter 10 ou 11 dígitos'),
    relationship: z.string().min(2, 'Relacionamento deve ter pelo menos 2 caracteres')
  }),
  medicalInfo: z.object({
    allergies: z.array(z.string()).default([]),
    medications: z.array(z.object({
      name: z.string(),
      dosage: z.string(),
      frequency: z.string()
    })).default([]),
    medicalConditions: z.array(z.string()).default([]),
    additionalNotes: z.string().optional()
  }).optional(),
  subscriptionPlan: z.enum(['basic', 'premium'])
});

// Schema para pagamento com dados do perfil
const PaymentWithProfileSchema = z.object({
  // Dados do pagamento
  amount: z.number().positive('Valor deve ser positivo'),
  paymentMethodId: z.string().min(1, 'Método de pagamento é obrigatório'),
  paymentMethod: z.enum(['credit_card', 'debit_card', 'pix', 'boleto']),
  installments: z.number().int().min(1).max(12).default(1),
  description: z.string().optional(),
  token: z.string().optional(), // ✅ Token do Payment Brick para cartões
  
  // Dados do pagador
  payer: z.object({
    email: z.string().email('Email do pagador inválido').optional(),
    identification: z.object({
      type: z.string(),
      number: z.string()
    }).optional()
  }).optional(),
  
  // Dados do perfil a ser criado (NÃO salvo ainda)
  profileData: ProfileDataSchema,
  
  // ID do perfil existente (opcional, para compatibilidade)
  profileId: z.string().optional()
});

export type PaymentWithProfileData = z.infer<typeof PaymentWithProfileSchema>;
export type ProfileData = z.infer<typeof ProfileDataSchema>;

export class PaymentWithProfileDTO {
  static validateAndClean(data: unknown): PaymentWithProfileData {
    try {
      // Parsear e validar dados
      const parsed = PaymentWithProfileSchema.parse(data);
      
      // Limpar CPF (remover formatação)
      if (parsed.profileData.cpf) {
        parsed.profileData.cpf = parsed.profileData.cpf.replace(/\D/g, '');
      }
      
      // Limpar telefone (remover formatação)
      if (parsed.profileData.phone) {
        parsed.profileData.phone = parsed.profileData.phone.replace(/\D/g, '');
      }
      
      if (parsed.profileData.emergencyContact.phone) {
        parsed.profileData.emergencyContact.phone = parsed.profileData.emergencyContact.phone.replace(/\D/g, '');
      }
      
      // Garantir valor correto baseado no plano
      const expectedAmounts: Record<string, number> = {
        basic: 5.00,
        premium: 10.00
      };
      
      const expectedAmount = expectedAmounts[parsed.profileData.subscriptionPlan];
      if (Math.abs(parsed.amount - expectedAmount) > 0.01) {
        throw new Error(`Valor incorreto para o plano ${parsed.profileData.subscriptionPlan}`);
      }
      
      return parsed;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        throw new Error(`Erro de validação: ${firstError.path.join('.')} - ${firstError.message}`);
      }
      throw error;
    }
  }
  
  static hasProfileData(data: PaymentWithProfileData): boolean {
    return !!data.profileData && !data.profileId;
  }
  
  static hasProfileId(data: PaymentWithProfileData): boolean {
    return !!data.profileId && !data.profileData;
  }
  
  static getPaymentMethodRequirements(method: string): {
    allowsInstallments: boolean;
    maxInstallments: number;
  } {
    switch (method) {
      case 'credit_card':
        return {
          allowsInstallments: true,
          maxInstallments: 12
        };
      case 'debit_card':
        return {
          allowsInstallments: false,
          maxInstallments: 1
        };
      case 'pix':
        return {
          allowsInstallments: false,
          maxInstallments: 1
        };
      case 'boleto':
        return {
          allowsInstallments: false,
          maxInstallments: 1
        };
      default:
        throw new Error(`Método de pagamento inválido: ${method}`);
    }
  }
}