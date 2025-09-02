import { z } from "zod";

export const subscriptionTypeSchema = z.enum(["basic", "premium"]);

export const paymentMethodSchema = z.enum([
  "pix",
  "credit_card", 
  "debit_card"
  // Removido "boleto" - não suportado mais
]);

export const paymentFormSchema = z.object({
  subscriptionType: subscriptionTypeSchema,
  paymentMethod: paymentMethodSchema,
  installments: z.number()
    .min(1, "Mínimo 1 parcela")
    .max(12, "Máximo 12 parcelas")
    .default(1),
  deviceId: z.string().optional(), // ✅ Device ID para evitar diff_param_bins
});

export const creditCardSchema = z.object({
  cardNumber: z.string()
    .regex(/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/, "Número do cartão deve ter formato válido"),
  
  expirationDate: z.string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Data deve ter formato MM/YY"),
  
  cvv: z.string()
    .regex(/^\d{3,4}$/, "CVV deve ter 3 ou 4 dígitos"),
  
  holderName: z.string()
    .min(2, "Nome do portador deve ter pelo menos 2 caracteres")
    .max(100, "Nome do portador deve ter no máximo 100 caracteres"),
  
  holderCpf: z.string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF deve ter formato válido"),
  
  deviceId: z.string().optional(), // ✅ Device ID para evitar diff_param_bins
});

export const pixFormSchema = z.object({
  payerName: z.string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  
  payerCpf: z.string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF deve ter formato válido"),
  
  payerEmail: z.string()
    .email("Email deve ter formato válido"),
  
  deviceId: z.string().optional(), // ✅ Device ID para evitar diff_param_bins
});

export const boletoFormSchema = z.object({
  payerName: z.string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  
  payerCpf: z.string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF deve ter formato válido"),
  
  payerEmail: z.string()
    .email("Email deve ter formato válido"),

  address: z.object({
    street: z.string().min(1, "Endereço é obrigatório"),
    number: z.string().min(1, "Número é obrigatório"),
    complement: z.string().optional(),
    neighborhood: z.string().min(1, "Bairro é obrigatório"),
    city: z.string().min(1, "Cidade é obrigatória"),
    state: z.string().min(2, "Estado é obrigatório").max(2, "Estado deve ter 2 caracteres"),
    zipCode: z.string().regex(/^\d{5}-\d{3}$/, "CEP deve ter formato válido (00000-000)"),
  }),
});

export type SubscriptionType = z.infer<typeof subscriptionTypeSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type PaymentFormData = z.infer<typeof paymentFormSchema>;
export type CreditCardData = z.infer<typeof creditCardSchema>;
export type PixFormData = z.infer<typeof pixFormSchema>;
export type BoletoFormData = z.infer<typeof boletoFormSchema>;