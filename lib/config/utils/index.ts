/**
 * Barrel export para todos os utilities de configuração
 * Isolamento total - apenas exports, sem lógica
 */

export {
  ConfigSingleton,
  RequireConfig,
  type SingletonConfig,
} from './singleton.js';

export {
  ConfigMask,
} from './mask.js';