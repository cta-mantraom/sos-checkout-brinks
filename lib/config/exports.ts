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
} from './schemas/payment.schema';

export {
  FirebaseCredentialsSchema,
  FirebaseConfigSchema,
  FirebaseEnvSchema,
  type FirebaseCredentials,
  type FirebaseConfig,
  type FirebaseEnv,
} from './schemas/firebase.schema';

export {
  AppConfigSchema,
  AppEnvSchema,
  type AppConfig,
  type AppEnv,
} from './schemas/app.schema';

// ============================================================================
// CONTEXTS
// ============================================================================
export {
  PaymentConfigService,
  getPaymentConfig,
  getMercadoPagoCredentials,
  getMercadoPagoClientConfig,
} from './contexts/payment.config';

export {
  FirebaseConfigService,
  getFirebaseConfig,
  getFirebaseCredentials,
  getFirebaseInitConfig,
} from './contexts/firebase.config';

export {
  AppConfigService,
  getAppConfig,
  isProduction,
  isDevelopment,
  getAppUrls,
} from './contexts/app.config';

// ============================================================================
// VALIDATORS
// ============================================================================
export {
  validateEnvVar,
  validateRequiredEnvVars,
  getEnvVar,
  getRequiredEnvVar,
} from './validators/env.validator';

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
} from './types/config.types';

// ============================================================================
// UTILS
// ============================================================================
export {
  ConfigSingleton,
} from './utils/singleton';

export {
  maskSensitiveData,
  maskToken,
  maskEmail,
  maskUrl,
} from './utils/mask';

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================
export { getPaymentConfig as paymentConfig } from './contexts/payment.config';
export { getFirebaseConfig as firebaseConfig } from './contexts/firebase.config';
export { getAppConfig as appConfig } from './contexts/app.config';

// Função de conveniência para inicialização completa
export const initializeAllConfigs = () => {
  return {
    payment: () => getPaymentConfig(),
    firebase: () => getFirebaseConfig(),
    app: () => getAppConfig(),
  };
};

// Função para limpar todos os caches (útil para testes)
export const clearAllConfigCaches = () => {
  ConfigSingleton.clearAllCaches();
};