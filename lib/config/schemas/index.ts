/**
 * Barrel export para todos os schemas de configuração
 * Isolamento total - apenas exports, sem lógica
 */

// Payment schemas
export {
  MercadoPagoCredentialsSchema,
  PaymentConfigSchema,
  PaymentEnvSchema,
  type MercadoPagoCredentials,
  type PaymentConfig,
  type PaymentEnv,
} from './payment.schema';

// Firebase schemas
export {
  FirebaseCredentialsSchema,
  FirebaseConfigSchema,
  FirebaseEnvSchema,
  type FirebaseCredentials,
  type FirebaseConfig,
  type FirebaseEnv,
} from './firebase.schema';

// App schemas
export {
  AppConfigSchema,
  AppEnvSchema,
  type AppConfig,
  type AppEnv,
} from './app.schema';