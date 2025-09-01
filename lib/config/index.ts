/**
 * Barrel export central para toda a arquitetura de configuração desacoplada
 * 
 * Esta é a interface principal para consumir configurações no sistema.
 * Todos os imports de configuração devem vir deste arquivo.
 * 
 * Exemplo de uso:
 * import { getPaymentConfig, getFirebaseConfig } from '@/lib/config';
 */

// Schemas - para validação manual se necessário
export * from './schemas';

// Contexts - configurações por domínio
export * from './contexts';

// Validators - para validação customizada
export * from './validators';

// Types - para tipagem
export * from './types';

// Utils - para implementação de configs customizadas
export * from './utils';

// ============================================================================
// BACKWARD COMPATIBILITY - Para facilitar migração gradual
// ============================================================================

// Aliases para manter compatibilidade com código existente
export { getPaymentConfig as paymentConfig } from './contexts';
export { getFirebaseConfig as firebaseConfig } from './contexts';
export { getAppConfig as appConfig } from './contexts';

// Função de conveniência para inicialização completa
export const initializeAllConfigs = () => {
  const { getPaymentConfig } = require('./contexts/payment.config');
  const { getFirebaseConfig } = require('./contexts/firebase.config');
  const { getAppConfig } = require('./contexts/app.config');

  // Lazy loading - só carrega quando chamado
  return {
    payment: () => getPaymentConfig(),
    firebase: () => getFirebaseConfig(),
    app: () => getAppConfig(),
  };
};

// Função para limpar todos os caches (útil para testes)
export const clearAllConfigCaches = () => {
  const { ConfigSingleton } = require('./utils');
  ConfigSingleton.clearAllCaches();
};