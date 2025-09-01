/**
 * Arquivo de exports consolidado para evitar problemas de importação de diretórios
 * em ambientes ES modules (Vercel)
 */

// ============================================================================
// SCHEMAS
// ============================================================================
export {
  MercadoPagoCredentialsSchema,
  PaymentConfigSchema,
  PaymentEnvSchema,
  type MercadoPagoCredentials,
  type PaymentConfig,
  type PaymentEnv,
} from './schemas/payment.schema.js';

export {
  FirebaseCredentialsSchema,
  FirebaseConfigSchema,
  FirebaseEnvSchema,
  type FirebaseCredentials,
  type FirebaseConfig,
  type FirebaseEnv,
} from './schemas/firebase.schema.js';

export {
  AppConfigSchema,
  AppEnvSchema,
  type AppConfig,
  type AppEnv,
} from './schemas/app.schema.js';

// ============================================================================
// CONTEXTS
// ============================================================================
export {
  PaymentConfigService,
  getPaymentConfig,
  getMercadoPagoCredentials,
  getMercadoPagoClientConfig,
} from './contexts/payment.config.js';

export {
  FirebaseConfigService,
  getFirebaseConfig,
  getFirebaseCredentials,
  getFirebaseInitConfig,
} from './contexts/firebase.config.js';

export {
  AppConfigService,
  getAppConfig,
  isProduction,
  isDevelopment,
  getAppUrls,
} from './contexts/app.config.js';

// ============================================================================
// VALIDATORS
// ============================================================================
export {
  validateEnvVar,
  validateRequiredEnvVars,
  getEnvVar,
  getRequiredEnvVar,
} from './validators/env.validator.js';

// ============================================================================
// TYPES
// ============================================================================
export type {
  ConfigContext,
  ConfigValidator,
  ConfigCache,
  ConfigError,
  MaskedConfig,
  BaseConfig,
  EnvironmentConfig,
} from './types/config.types.js';

// ============================================================================
// UTILS
// ============================================================================
export {
  ConfigSingleton,
} from './utils/singleton.js';

export {
  maskSensitiveData,
  maskToken,
  maskEmail,
  maskUrl,
} from './utils/mask.js';

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================
export { getPaymentConfig as paymentConfig } from './contexts/payment.config.js';
export { getFirebaseConfig as firebaseConfig } from './contexts/firebase.config.js';
export { getAppConfig as appConfig } from './contexts/app.config.js';

// Função de conveniência para inicialização completa
export const initializeAllConfigs = async () => {
  const paymentModule = await import('./contexts/payment.config.js');
  const firebaseModule = await import('./contexts/firebase.config.js');
  const appModule = await import('./contexts/app.config.js');
  
  return {
    payment: () => paymentModule.getPaymentConfig(),
    firebase: () => firebaseModule.getFirebaseConfig(),
    app: () => appModule.getAppConfig(),
  };
};

// Função para limpar todos os caches (útil para testes)
export const clearAllConfigCaches = async () => {
  const singletonModule = await import('./utils/singleton.js');
  singletonModule.ConfigSingleton.clearAllCaches();
};