/**
 * Barrel export para todas as configurações de contexto
 * Isolamento total - apenas exports, sem lógica
 */

// Payment config
export {
  PaymentConfigService,
  getPaymentConfig,
  getMercadoPagoCredentials,
  getMercadoPagoClientConfig,
} from './payment.config';

// Firebase config
export {
  FirebaseConfigService,
  getFirebaseConfig,
  getFirebaseCredentials,
  getFirebaseInitConfig,
} from './firebase.config';

// App config
export {
  AppConfigService,
  getAppConfig,
  isProduction,
  isDevelopment,
  getAppUrls,
} from './app.config';