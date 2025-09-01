import { z } from 'zod';

/**
 * Schema para configuração da aplicação
 * ISOLADO - apenas definições Zod, sem lógica
 */
export const AppConfigSchema = z.object({
  environment: z
    .enum(['development', 'production', 'test', 'staging'])
    .default('development'),
  
  version: z
    .string()
    .min(1, 'Versão é obrigatória')
    .default('1.0.0'),
  
  urls: z.object({
    frontend: z
      .string()
      .url('Frontend URL deve ser uma URL válida')
      .default('http://localhost:5173'),
      
    api: z
      .string()
      .url('API URL deve ser uma URL válida')
      .default('http://localhost:3000'),
      
    webhook: z
      .string()
      .url('Webhook URL deve ser uma URL válida')
      .optional(),
  }),
  
  features: z.object({
    enableAnalytics: z.boolean().default(false),
    enableDebugMode: z.boolean().default(false),
    enableRateLimit: z.boolean().default(true),
    enableCors: z.boolean().default(true),
  }),
  
  logging: z.object({
    level: z
      .enum(['debug', 'info', 'warn', 'error'])
      .default('info'),
      
    enableConsole: z.boolean().default(true),
    enableFile: z.boolean().default(false),
    maxFileSize: z.number().default(10485760), // 10MB
  }),
  
  security: z.object({
    rateLimitWindow: z.number().default(900000), // 15 minutos
    rateLimitMax: z.number().default(100),
    corsOrigins: z.array(z.string().url()).default([]),
    trustedProxies: z.array(z.string()).default([]),
  }),
});

/**
 * Schema para dados do ambiente relacionados à aplicação
 */
export const AppEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test', 'staging'])
    .default('development'),
    
  npm_package_version: z
    .string()
    .optional()
    .default('1.0.0'),
    
  PORT: z
    .union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseInt(val, 10) : val)
    .default(3000),
    
  FRONTEND_URL: z
    .string()
    .url('Frontend URL deve ser uma URL válida')
    .optional(),
    
  API_URL: z
    .string()
    .url('API URL deve ser uma URL válida')
    .optional(),
    
  WEBHOOK_URL: z
    .string()
    .url('Webhook URL deve ser uma URL válida')
    .optional(),
});

// Types exportados derivados dos schemas
// Usando z.output para garantir que defaults sejam aplicados corretamente
export type AppConfig = z.output<typeof AppConfigSchema>;
export type AppEnv = z.output<typeof AppEnvSchema>;