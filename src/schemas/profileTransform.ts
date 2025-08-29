import { z } from 'zod';
import { MedicalFormData } from './medicalForm';

// Schema para dados que o backend espera
const BackendProfileSchema = z.object({
  fullName: z.string().min(3).max(100),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos'),
  phone: z.string().regex(/^\d{11}$/, 'Telefone deve ter 11 dígitos'),
  email: z.string().email().toLowerCase(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  emergencyContact: z.object({
    name: z.string().min(3).max(100),
    phone: z.string().regex(/^\d{11}$/, 'Telefone deve ter 11 dígitos'),
    relationship: z.string().min(2).max(50)
  }),
  medicalInfo: z.object({
    allergies: z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(),
    conditions: z.array(z.string()).optional(),
    observations: z.string().max(1000).optional()
  }).optional(),
  subscriptionPlan: z.enum(['basic', 'premium']).default('basic')
});

export type BackendProfileData = z.infer<typeof BackendProfileSchema>;

// Função para limpar formatação de strings
function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

// Função para transformar dados do frontend para o backend
export function transformToBackendFormat(
  frontendData: MedicalFormData,
  subscriptionPlan: 'basic' | 'premium' = 'basic'
): BackendProfileData {
  // Preparar dados para transformação
  const transformedData = {
    fullName: frontendData.name,
    cpf: cleanCPF(frontendData.cpf),
    phone: cleanPhoneNumber(frontendData.phone),
    email: frontendData.email.toLowerCase().trim(),
    bloodType: frontendData.bloodType,
    emergencyContact: frontendData.emergencyContacts[0] ? {
      name: frontendData.emergencyContacts[0].name,
      phone: cleanPhoneNumber(frontendData.emergencyContacts[0].phone),
      relationship: frontendData.emergencyContacts[0].relationship
    } : {
      name: '',
      phone: '',
      relationship: ''
    },
    medicalInfo: {
      allergies: frontendData.hasAllergies ? frontendData.allergies : [],
      medications: frontendData.hasMedications 
        ? frontendData.medications.map(med => `${med.name} - ${med.dosage} - ${med.frequency}`)
        : [],
      conditions: frontendData.hasMedicalConditions ? frontendData.medicalConditions : [],
      observations: frontendData.observations || ''
    },
    subscriptionPlan
  };

  // Validar com Zod antes de retornar
  return BackendProfileSchema.parse(transformedData);
}

// Função para validar se os dados do frontend podem ser transformados
export function validateFrontendData(data: unknown): MedicalFormData | null {
  try {
    // Importamos o schema do arquivo medicalForm
    const medicalFormSchema = z.object({
      name: z.string().min(2).max(100),
      cpf: z.string(),
      email: z.string().email(),
      phone: z.string(),
      birthDate: z.string(),
      bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
      weight: z.number().min(20).max(300),
      height: z.number().min(100).max(250),
      allergies: z.array(z.string()).default([]),
      hasAllergies: z.boolean().default(false),
      medications: z.array(z.object({
        name: z.string(),
        dosage: z.string(),
        frequency: z.string(),
      })).default([]),
      hasMedications: z.boolean().default(false),
      medicalConditions: z.array(z.string()).default([]),
      hasMedicalConditions: z.boolean().default(false),
      emergencyContacts: z.array(z.object({
        name: z.string(),
        relationship: z.string(),
        phone: z.string(),
      })).min(1),
      doctor: z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        specialty: z.string().optional(),
      }).optional(),
      healthInsurance: z.object({
        company: z.string().optional(),
        plan: z.string().optional(),
        cardNumber: z.string().optional(),
      }).optional(),
      observations: z.string().optional(),
    });

    return medicalFormSchema.parse(data);
  } catch (error) {
    console.error('Erro na validação dos dados do frontend:', error);
    return null;
  }
}