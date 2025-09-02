import { z } from "zod";

/**
 * Schema para credenciais do MercadoPago
 * ISOLADO - apenas definições Zod, sem lógica
 */
export const MercadoPagoCredentialsSchema = z.object({
  accessToken: z
    .string()
    .min(1, "Access token é obrigatório")
    .regex(
      /^(APP_USR-|TEST-)/i,
      "Access token deve começar com APP_USR- ou TEST-"
    ),

  publicKey: z
    .string()
    .min(1, "Public key é obrigatório")
    .regex(
      /^(APP_USR-|TEST-)/i,
      "Public key deve começar com APP_USR- ou TEST-"
    ),

  webhookSecret: z
    .string()
    .min(32, "Webhook secret deve ter no mínimo 32 caracteres"),

  environment: z.enum(["production", "sandbox"]).default("sandbox"),
});

/**
 * Schema para configuração de pagamento completa
 */
export const PaymentConfigSchema = z.object({
  mercadopago: MercadoPagoCredentialsSchema,

  timeout: z
    .number()
    .min(1000, "Timeout deve ser no mínimo 1000ms")
    .max(30000, "Timeout não deve exceder 30000ms")
    .default(25000),

  retryAttempts: z
    .number()
    .min(0, "Retry attempts deve ser no mínimo 0")
    .max(5, "Retry attempts não deve exceder 5")
    .default(3),

  prices: z.object({
    basic: z.literal(5.0),
    premium: z.literal(10.0),
  }),

  deviceIdScript: z
    .string()
    .url("Device ID script deve ser uma URL válida")
    .default("https://www.mercadopago.com/v2/security.js"),

  paymentMethods: z.object({
    creditCard: z.boolean().default(true),
    debitCard: z.boolean().default(true),
    pix: z.boolean().default(true),
    boleto: z.boolean().default(false),
    wallet: z.boolean().default(false),
  }),
});

/**
 * Schema para dados do ambiente relacionados a pagamento
 */
export const PaymentEnvSchema = z.object({
  MERCADOPAGO_ACCESS_TOKEN: z.string().min(1),
  MERCADOPAGO_PUBLIC_KEY: z.string().min(1),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().min(1),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

// Types exportados derivados dos schemas
// Usando z.output para garantir que defaults sejam aplicados corretamente
export type MercadoPagoCredentials = z.output<
  typeof MercadoPagoCredentialsSchema
>;
export type PaymentConfig = z.output<typeof PaymentConfigSchema>;
export type PaymentEnv = z.output<typeof PaymentEnvSchema>;
