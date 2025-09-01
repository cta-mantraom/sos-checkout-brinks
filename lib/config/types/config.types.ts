/**
 * Types centralizados para configurações
 * ISOLADO - apenas definições TypeScript, sem lógica
 */

/**
 * Interface base para erros de configuração
 */
export interface ConfigError extends Error {
  readonly context: string;
  readonly configKey?: string;
  readonly validationErrors?: ReadonlyArray<{
    readonly path: string;
    readonly message: string;
  }>;
}

/**
 * Opções para validação de configuração
 */
export interface ConfigValidationOptions {
  readonly required: boolean;
  readonly fallback?: unknown;
  readonly transform?: (value: unknown) => unknown;
  readonly validate?: (value: unknown) => boolean;
}

/**
 * Resultado de validação de configuração
 */
export interface ConfigValidationResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly errors?: ReadonlyArray<{
    readonly field: string;
    readonly message: string;
  }>;
}

/**
 * Interface para configurações estritamente tipadas
 * Garante que todos os campos sejam required (não-opcionais)
 */
export type StrictConfig<T> = {
  readonly [K in keyof T]-?: T[K];
};

/**
 * Interface para configurações com lazy loading
 */
export interface LazyConfig<T> {
  readonly isLoaded: boolean;
  readonly lastLoaded?: Date;
  getConfig(): T;
  reloadConfig(): T;
}

/**
 * Interface para configurações com cache
 */
export interface CacheableConfig<T> extends LazyConfig<T> {
  readonly cacheKey: string;
  readonly cacheTTL?: number;
  clearCache(): void;
}

/**
 * Interface para configurações com validação
 */
export interface ValidatableConfig<T> {
  readonly schema: unknown; // Zod schema
  validate(data: unknown): ConfigValidationResult<T>;
  validatePartial(data: unknown): ConfigValidationResult<Partial<T>>;
}

/**
 * Configuração completa com todos os recursos
 */
export interface FullConfig<T> extends 
  LazyConfig<T>, 
  CacheableConfig<T>, 
  ValidatableConfig<T> {
  readonly configName: string;
  readonly version: string;
}

/**
 * Enum para níveis de log de configuração
 */
export enum ConfigLogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  NONE = 'none',
}

/**
 * Interface para logging de configuração
 */
export interface ConfigLogger {
  readonly level: ConfigLogLevel;
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

/**
 * Enum para environments suportados
 */
export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
  STAGING = 'staging',
}

/**
 * Interface para configuração de environment
 */
export interface EnvironmentConfig {
  readonly current: Environment;
  readonly isDevelopment: boolean;
  readonly isProduction: boolean;
  readonly isTest: boolean;
  readonly isStaging: boolean;
}

/**
 * Union types para configurações específicas
 */
export type PaymentEnvironment = 'production' | 'sandbox';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type PaymentMethod = 'creditCard' | 'debitCard' | 'pix' | 'boleto' | 'wallet';

/**
 * Interface para configurações de feature flags
 */
export interface FeatureFlags {
  readonly [featureName: string]: boolean;
}

/**
 * Interface para configurações de rate limiting
 */
export interface RateLimitConfig {
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly skipSuccessfulRequests?: boolean;
  readonly skipFailedRequests?: boolean;
}

/**
 * Interface para configurações de CORS
 */
export interface CorsConfig {
  readonly origins: ReadonlyArray<string>;
  readonly methods: ReadonlyArray<string>;
  readonly allowedHeaders: ReadonlyArray<string>;
  readonly credentials: boolean;
}

/**
 * Type helper para extrair tipo de configuração de um schema Zod
 */
export type ConfigFromSchema<T> = T extends { parse: (input: unknown) => infer R } ? R : never;