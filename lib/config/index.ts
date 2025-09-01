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
export * from './schemas/index.js';

// Contexts - configurações por domínio
export * from './contexts/index.js';

// Validators - para validação customizada
export * from './validators/index.js';

// Types - para tipagem
export * from './types/index.js';

// Utils - para implementação de configs customizadas
export * from './utils/index.js';

// ============================================================================
// BACKWARD COMPATIBILITY - Para facilitar migração gradual
// ============================================================================

// Aliases para manter compatibilidade com código existente
export { getPaymentConfig as paymentConfig } from './contexts/index.js';
export { getFirebaseConfig as firebaseConfig } from './contexts/index.js';
export { getAppConfig as appConfig } from './contexts/index.js';

// Função de conveniência para inicialização completa
export const initializeAllConfigs = async () => {
  const paymentModule = await import('./contexts/payment.config.js');
  const firebaseModule = await import('./contexts/firebase.config.js');
  const appModule = await import('./contexts/app.config.js');

  // Lazy loading - só carrega quando chamado
  return {
    payment: () => paymentModule.getPaymentConfig(),
    firebase: () => firebaseModule.getFirebaseConfig(),
    app: () => appModule.getAppConfig(),
  };
};

// Função para limpar todos os caches (útil para testes)
export const clearAllConfigCaches = async () => {
  const utilsModule = await import('./utils/index.js');
  utilsModule.ConfigSingleton.clearAllCaches();
};