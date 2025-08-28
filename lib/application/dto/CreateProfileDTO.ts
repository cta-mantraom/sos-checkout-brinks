import { z } from 'zod';

// Schema para contato de emergência
const EmergencyContactSchema = z.object({
  name: z.string()
    .min(3, 'Nome do contato deve ter pelo menos 3 caracteres')
    .max(100, 'Nome do contato deve ter no máximo 100 caracteres')
    .trim(),
  phone: z.string()
    .regex(/^\d{11}$/, 'Telefone deve ter 11 dígitos'),
  relationship: z.string()
    .min(2, 'Relacionamento deve ter pelo menos 2 caracteres')
    .max(50, 'Relacionamento deve ter no máximo 50 caracteres')
    .trim()
});

// Schema para informações médicas (opcional)
const MedicalInfoSchema = z.object({
  allergies: z.array(z.string().trim()).optional(),
  medications: z.array(z.string().trim()).optional(),
  conditions: z.array(z.string().trim()).optional(),
  observations: z.string().max(1000, 'Observações devem ter no máximo 1000 caracteres').optional()
}).optional();

// Schema principal para criação de perfil
const CreateProfileSchema = z.object({
  fullName: z.string()
    .min(3, 'Nome completo deve ter pelo menos 3 caracteres')
    .max(100, 'Nome completo deve ter no máximo 100 caracteres')
    .regex(/^[A-Za-zÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços')
    .trim(),
    
  cpf: z.string()
    .regex(/^\d{11}$/, 'CPF deve conter exatamente 11 dígitos')
    .refine((cpf) => {
      // Validação básica de CPF
      if (/^(\d)\1{10}$/.test(cpf)) return false; // CPF com todos os dígitos iguais
      
      // Validação do primeiro dígito verificador
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
      }
      let remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (remainder !== parseInt(cpf.charAt(9))) return false;

      // Validação do segundo dígito verificador
      sum = 0;
      for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
      }
      remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (remainder !== parseInt(cpf.charAt(10))) return false;

      return true;
    }, 'CPF inválido'),
    
  phone: z.string()
    .regex(/^\d{11}$/, 'Telefone deve ter 11 dígitos')
    .refine((phone) => {
      const ddd = parseInt(phone.slice(0, 2));
      return ddd >= 11 && ddd <= 99;
    }, 'DDD inválido')
    .refine((phone) => {
      const firstDigit = parseInt(phone.charAt(2));
      return firstDigit === 9;
    }, 'Número de celular deve começar com 9'),
    
  email: z.string()
    .email('Email inválido')
    .max(254, 'Email deve ter no máximo 254 caracteres')
    .toLowerCase()
    .trim(),
    
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], {
    errorMap: () => ({ message: 'Tipo sanguíneo deve ser A+, A-, B+, B-, AB+, AB-, O+ ou O-' })
  }),
  
  emergencyContact: EmergencyContactSchema,
  
  medicalInfo: MedicalInfoSchema,
  
  subscriptionPlan: z.enum(['basic', 'premium'], {
    errorMap: () => ({ message: 'Plano deve ser "basic" ou "premium"' })
  }).optional().default('basic')
});

export type CreateProfileData = z.infer<typeof CreateProfileSchema>;

export class CreateProfileDTO {
  static validate(data: unknown): CreateProfileData {
    try {
      return CreateProfileSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new Error(`Dados inválidos: ${messages.join(', ')}`);
      }
      throw error;
    }
  }

  static validatePartial(data: unknown): Partial<CreateProfileData> {
    try {
      return CreateProfileSchema.partial().parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new Error(`Dados inválidos: ${messages.join(', ')}`);
      }
      throw error;
    }
  }

  static getSchema() {
    return CreateProfileSchema;
  }

  // Métodos utilitários para validações específicas
  static validateCPF(cpf: string): boolean {
    try {
      CreateProfileSchema.shape.cpf.parse(cpf);
      return true;
    } catch {
      return false;
    }
  }

  static validateEmail(email: string): boolean {
    try {
      CreateProfileSchema.shape.email.parse(email);
      return true;
    } catch {
      return false;
    }
  }

  static validatePhone(phone: string): boolean {
    try {
      CreateProfileSchema.shape.phone.parse(phone);
      return true;
    } catch {
      return false;
    }
  }

  static validateBloodType(bloodType: string): boolean {
    try {
      CreateProfileSchema.shape.bloodType.parse(bloodType);
      return true;
    } catch {
      return false;
    }
  }

  // Método para limpar/formatar dados antes da validação
  static clean(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const cleaned = { ...data };

    // Limpar CPF (remover caracteres especiais)
    if (cleaned.cpf) {
      cleaned.cpf = cleaned.cpf.replace(/\D/g, '');
    }

    // Limpar telefone
    if (cleaned.phone) {
      cleaned.phone = cleaned.phone.replace(/\D/g, '');
    }

    // Limpar telefone do contato de emergência
    if (cleaned.emergencyContact?.phone) {
      cleaned.emergencyContact.phone = cleaned.emergencyContact.phone.replace(/\D/g, '');
    }

    // Limpar email
    if (cleaned.email) {
      cleaned.email = cleaned.email.toLowerCase().trim();
    }

    // Limpar nome
    if (cleaned.fullName) {
      cleaned.fullName = cleaned.fullName.trim();
    }

    // Limpar nome do contato
    if (cleaned.emergencyContact?.name) {
      cleaned.emergencyContact.name = cleaned.emergencyContact.name.trim();
    }

    return cleaned;
  }

  // Método para validar e limpar em uma única operação
  static validateAndClean(data: unknown): CreateProfileData {
    const cleaned = this.clean(data);
    return this.validate(cleaned);
  }
}