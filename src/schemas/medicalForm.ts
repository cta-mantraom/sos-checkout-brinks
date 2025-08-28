import { z } from "zod";

export const bloodTypeSchema = z.enum([
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"
]);

export const medicalFormSchema = z.object({
  // Dados Pessoais
  name: z.string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  
  cpf: z.string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF deve ter formato válido (000.000.000-00)"),
  
  email: z.string()
    .email("Email deve ter formato válido")
    .max(100, "Email deve ter no máximo 100 caracteres"),
  
  phone: z.string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Telefone deve ter formato válido (00) 00000-0000"),
  
  birthDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve ter formato válido")
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 0 && age <= 120;
    }, "Data de nascimento deve ser válida"),

  // Informações Médicas Básicas
  bloodType: bloodTypeSchema,
  
  weight: z.number()
    .min(20, "Peso deve ser maior que 20kg")
    .max(300, "Peso deve ser menor que 300kg"),
  
  height: z.number()
    .min(100, "Altura deve ser maior que 100cm")
    .max(250, "Altura deve ser menor que 250cm"),

  // Alergias
  allergies: z.array(z.string().min(1, "Alergia não pode estar vazia"))
    .default([]),
  
  hasAllergies: z.boolean().default(false),

  // Medicações
  medications: z.array(z.object({
    name: z.string().min(1, "Nome do medicamento é obrigatório"),
    dosage: z.string().min(1, "Dosagem é obrigatória"),
    frequency: z.string().min(1, "Frequência é obrigatória"),
  })).default([]),
  
  hasMedications: z.boolean().default(false),

  // Condições Médicas
  medicalConditions: z.array(z.string().min(1, "Condição médica não pode estar vazia"))
    .default([]),
  
  hasMedicalConditions: z.boolean().default(false),

  // Contatos de Emergência
  emergencyContacts: z.array(z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    relationship: z.string().min(1, "Parentesco é obrigatório"),
    phone: z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Telefone deve ter formato válido"),
  }))
  .min(1, "Pelo menos um contato de emergência é obrigatório")
  .max(3, "Máximo de 3 contatos de emergência"),

  // Informações Médico/Convênio
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

  // Observações Adicionais
  observations: z.string().max(500, "Observações devem ter no máximo 500 caracteres").optional(),
});

export type MedicalFormData = z.infer<typeof medicalFormSchema>;
export type BloodType = z.infer<typeof bloodTypeSchema>;