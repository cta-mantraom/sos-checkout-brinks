import { z } from 'zod';

/**
 * Schema para credenciais do Firebase
 * ISOLADO - apenas definições Zod, sem lógica
 */
export const FirebaseCredentialsSchema = z.object({
  projectId: z
    .string()
    .min(1, 'Project ID é obrigatório'),
  
  clientEmail: z
    .string()
    .email('Client email deve ser um email válido')
    .optional(),
  
  privateKey: z
    .string()
    .min(1, 'Private key é obrigatório')
    .optional(),
  
  storageBucket: z
    .string()
    .min(1, 'Storage bucket é obrigatório')
    .optional(),
});

/**
 * Schema para configuração do Firebase completa
 */
export const FirebaseConfigSchema = z.object({
  credentials: FirebaseCredentialsSchema,
  
  settings: z.object({
    ignoreUndefinedProperties: z.boolean().default(true),
    timestampsInSnapshots: z.boolean().default(true),
  }),
  
  collections: z.object({
    users: z.string().default('users'),
    profiles: z.string().default('medical_profiles'), 
    payments: z.string().default('payments'),
    subscriptions: z.string().default('subscriptions'),
    qr_codes: z.string().default('qr_codes'),
  }),
  
  limits: z.object({
    maxDocuments: z.number().default(1000),
    maxBatchSize: z.number().default(500),
    queryTimeout: z.number().default(10000),
  }),
});

/**
 * Schema para dados do ambiente relacionados ao Firebase
 */
export const FirebaseEnvSchema = z.object({
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
  FIREBASE_STORAGE_BUCKET: z.string().min(1).optional(),
});

// Types exportados derivados dos schemas
export type FirebaseCredentials = z.infer<typeof FirebaseCredentialsSchema>;
export type FirebaseConfig = z.infer<typeof FirebaseConfigSchema>;
export type FirebaseEnv = z.infer<typeof FirebaseEnvSchema>;