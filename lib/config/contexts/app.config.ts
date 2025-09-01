import { ConfigSingleton, ConfigMask } from '../utils';
import { EnvValidator } from '../validators';
import {
  AppConfigSchema,
  AppEnvSchema,
  type AppConfig,
  type AppEnv,
} from '../schemas';

/**
 * Configuração da aplicação com singleton + lazy loading
 * ISOLADO - uma responsabilidade: configuração da aplicação
 */
export class AppConfigService extends ConfigSingleton<AppConfig> {
  private static readonly CONFIG_KEY = 'app';

  private constructor() {
    super(AppConfigService.CONFIG_KEY);
  }

  /**
   * Obtém instância singleton
   */
  public static getInstance(): AppConfigService {
    return super.getInstance(AppConfigService, AppConfigService.CONFIG_KEY);
  }

  /**
   * Implementação do carregamento e validação
   */
  protected loadAndValidate(): AppConfig {
    try {
      // 1. Validar variáveis de ambiente primeiro
      const envData = this.loadEnvironmentData();
      
      // 2. Construir configuração completa
      const config: AppConfig = {
        environment: envData.NODE_ENV,
        version: envData.npm_package_version || '1.0.0',
        urls: {
          frontend: envData.FRONTEND_URL || 'http://localhost:5173',
          api: envData.API_URL || 'http://localhost:3000',
          webhook: envData.WEBHOOK_URL,
        },
        features: {
          enableAnalytics: envData.NODE_ENV === 'production',
          enableDebugMode: envData.NODE_ENV === 'development',
          enableRateLimit: envData.NODE_ENV !== 'development',
          enableCors: true,
        },
        logging: {
          level: this.getLogLevel(envData.NODE_ENV),
          enableConsole: true,
          enableFile: envData.NODE_ENV === 'production',
          maxFileSize: 10485760, // 10MB
        },
        security: {
          rateLimitWindow: 900000, // 15 minutos
          rateLimitMax: envData.NODE_ENV === 'development' ? 1000 : 100,
          corsOrigins: this.getCorsOrigins(envData),
          trustedProxies: [],
        },
      };

      // 3. Validar configuração final
      const validatedConfig = EnvValidator.validate(
        AppConfigSchema,
        config,
        'AppConfig'
      );

      // 4. Log com mascaramento
      this.logConfigLoaded(validatedConfig);

      return validatedConfig;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      ConfigMask.logError(
        new Error(`Falha ao carregar configuração da aplicação: ${errorMessage}`),
        'AppConfig'
      );
      throw error;
    }
  }

  /**
   * Carrega e valida dados do ambiente
   */
  private loadEnvironmentData(): AppEnv {
    // Criar objeto de environment data com defaults
    const envData = {
      NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test' | 'staging') || 'development',
      npm_package_version: process.env.npm_package_version || '1.0.0',
      PORT: process.env.PORT || '3000',
      FRONTEND_URL: process.env.FRONTEND_URL,
      API_URL: process.env.API_URL,
      WEBHOOK_URL: process.env.WEBHOOK_URL,
    };

    // Validar com schema (permitindo campos opcionais)
    return EnvValidator.validate(
      AppEnvSchema,
      envData,
      'AppEnv'
    );
  }

  /**
   * Determina nível de log baseado no ambiente
   */
  private getLogLevel(environment: string): 'debug' | 'info' | 'warn' | 'error' {
    switch (environment) {
      case 'development':
        return 'debug';
      case 'test':
        return 'warn';
      case 'production':
        return 'info';
      default:
        return 'info';
    }
  }

  /**
   * Determina origens CORS baseado no ambiente
   */
  private getCorsOrigins(envData: AppEnv): string[] {
    const origins: string[] = [];
    
    // Adiciona frontend URL se definida
    if (envData.FRONTEND_URL) {
      origins.push(envData.FRONTEND_URL);
    }
    
    // URLs padrão por ambiente
    if (envData.NODE_ENV === 'development') {
      origins.push(
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:4173'
      );
    } else if (envData.NODE_ENV === 'production') {
      origins.push('https://sos-checkout-brinks.vercel.app');
    }

    return origins;
  }

  /**
   * Log de configuração carregada com mascaramento
   */
  private logConfigLoaded(config: AppConfig): void {
    ConfigMask.logConfig(
      {
        environment: config.environment,
        version: config.version,
        urls: config.urls,
        features: config.features,
        logging: config.logging,
        security: {
          ...config.security,
          corsOrigins: config.security.corsOrigins.length + ' origins configured',
        },
      },
      'AppConfig'
    );
  }

  /**
   * Verifica se está em desenvolvimento
   */
  public isDevelopment(): boolean {
    return this.getConfig().environment === 'development';
  }

  /**
   * Verifica se está em produção
   */
  public isProduction(): boolean {
    return this.getConfig().environment === 'production';
  }

  /**
   * Verifica se está em teste
   */
  public isTest(): boolean {
    return this.getConfig().environment === 'test';
  }

  /**
   * Obtém URLs da aplicação
   */
  public getUrls() {
    return this.getConfig().urls;
  }

  /**
   * Obtém configurações de segurança
   */
  public getSecurityConfig() {
    return this.getConfig().security;
  }

  /**
   * Obtém configurações de logging
   */
  public getLoggingConfig() {
    return this.getConfig().logging;
  }

  /**
   * Verifica se uma feature está habilitada
   */
  public isFeatureEnabled(featureName: keyof AppConfig['features']): boolean {
    return this.getConfig().features[featureName];
  }
}

/**
 * Função helper para uso simplificado
 */
export const getAppConfig = (): AppConfig => {
  return AppConfigService.getInstance().getConfig();
};

/**
 * Função helper para verificar ambiente
 */
export const isProduction = (): boolean => {
  return AppConfigService.getInstance().isProduction();
};

/**
 * Função helper para verificar desenvolvimento
 */
export const isDevelopment = (): boolean => {
  return AppConfigService.getInstance().isDevelopment();
};

/**
 * Função helper para URLs
 */
export const getAppUrls = () => {
  return AppConfigService.getInstance().getUrls();
};