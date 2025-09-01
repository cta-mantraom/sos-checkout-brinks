import { ConfigSingleton, ConfigMask } from '../utils';
import { EnvValidator } from '../validators';
import {
  PaymentConfigSchema,
  PaymentEnvSchema,
  type PaymentConfig,
  type PaymentEnv,
} from '../schemas';

/**
 * Configuração de pagamento com singleton + lazy loading
 * ISOLADO - uma responsabilidade: configuração de pagamento
 */
export class PaymentConfigService extends ConfigSingleton<PaymentConfig> {
  private static readonly CONFIG_KEY = 'payment';

  private constructor() {
    super(PaymentConfigService.CONFIG_KEY);
  }

  /**
   * Obtém instância singleton
   */
  public static getInstance(): PaymentConfigService {
    return super.getInstance(PaymentConfigService, PaymentConfigService.CONFIG_KEY);
  }

  /**
   * Implementação do carregamento e validação
   */
  protected loadAndValidate(): PaymentConfig {
    try {
      // 1. Validar variáveis de ambiente primeiro
      const envData = this.loadEnvironmentData();
      
      // 2. Construir configuração completa
      const config: PaymentConfig = {
        mercadopago: {
          accessToken: envData.MERCADOPAGO_ACCESS_TOKEN,
          publicKey: envData.MERCADOPAGO_PUBLIC_KEY,
          webhookSecret: envData.MERCADOPAGO_WEBHOOK_SECRET,
          environment: envData.NODE_ENV === 'production' ? 'production' : 'sandbox',
        },
        timeout: 25000,
        retryAttempts: 3,
        prices: {
          basic: 5.00,
          premium: 10.00,
        },
        deviceIdScript: 'https://www.mercadopago.com/v2/security.js',
        paymentMethods: {
          creditCard: true,
          debitCard: true,
          pix: true,
          boleto: false,
          wallet: false,
        },
      };

      // 3. Validar configuração final
      const validatedConfig = EnvValidator.validate(
        PaymentConfigSchema,
        config,
        'PaymentConfig'
      );

      // 4. Log com mascaramento
      this.logConfigLoaded(validatedConfig);

      return validatedConfig;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      ConfigMask.logError(
        new Error(`Falha ao carregar configuração de pagamento: ${errorMessage}`),
        'PaymentConfig'
      );
      throw error;
    }
  }

  /**
   * Carrega e valida dados do ambiente
   */
  private loadEnvironmentData(): PaymentEnv {
    // Lista de variáveis obrigatórias
    const requiredVars = [
      'MERCADOPAGO_ACCESS_TOKEN',
      'MERCADOPAGO_PUBLIC_KEY',
      'MERCADOPAGO_WEBHOOK_SECRET',
    ];

    // Verificar se todas as variáveis existem
    const missingVars = EnvValidator.validateRequiredEnvVars(requiredVars);
    if (missingVars.length > 0) {
      throw new Error(`Variáveis de ambiente obrigatórias ausentes: ${missingVars.join(', ')}`);
    }

    // Criar objeto de environment data
    const envData = {
      MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN!,
      MERCADOPAGO_PUBLIC_KEY: process.env.MERCADOPAGO_PUBLIC_KEY!,
      MERCADOPAGO_WEBHOOK_SECRET: process.env.MERCADOPAGO_WEBHOOK_SECRET!,
      NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    };

    // Validar com schema
    return EnvValidator.validate(
      PaymentEnvSchema,
      envData,
      'PaymentEnv'
    );
  }

  /**
   * Log de configuração carregada com mascaramento
   */
  private logConfigLoaded(config: PaymentConfig): void {
    ConfigMask.logConfig(
      {
        mercadopago: {
          accessToken: config.mercadopago.accessToken,
          publicKey: config.mercadopago.publicKey,
          webhookSecret: config.mercadopago.webhookSecret,
          environment: config.mercadopago.environment,
        },
        timeout: config.timeout,
        retryAttempts: config.retryAttempts,
        prices: config.prices,
        paymentMethods: config.paymentMethods,
      },
      'PaymentConfig'
    );
  }

  /**
   * Obtém apenas credenciais do MercadoPago
   */
  public getMercadoPagoCredentials() {
    return this.getConfig().mercadopago;
  }

  /**
   * Obtém apenas configurações de preços
   */
  public getPrices() {
    return this.getConfig().prices;
  }

  /**
   * Obtém apenas métodos de pagamento habilitados
   */
  public getEnabledPaymentMethods() {
    const methods = this.getConfig().paymentMethods;
    return Object.entries(methods)
      .filter(([_, enabled]) => enabled)
      .map(([method, _]) => method);
  }

  /**
   * Verifica se está em ambiente de produção
   */
  public isProduction(): boolean {
    return this.getConfig().mercadopago.environment === 'production';
  }

  /**
   * Obtém configurações para o cliente MercadoPago
   */
  public getMercadoPagoClientConfig() {
    const { mercadopago, timeout, retryAttempts } = this.getConfig();
    return {
      accessToken: mercadopago.accessToken,
      webhookSecret: mercadopago.webhookSecret,
      environment: mercadopago.environment,
      timeout,
      retryAttempts,
    };
  }
}

/**
 * Função helper para uso simplificado
 * Padrão de função para manter compatibilidade
 */
export const getPaymentConfig = (): PaymentConfig => {
  return PaymentConfigService.getInstance().getConfig();
};

/**
 * Função helper para credenciais MercadoPago
 */
export const getMercadoPagoCredentials = () => {
  return PaymentConfigService.getInstance().getMercadoPagoCredentials();
};

/**
 * Função helper para configuração do cliente MercadoPago
 * Substitui acesso direto a process.env
 */
export const getMercadoPagoClientConfig = () => {
  return PaymentConfigService.getInstance().getMercadoPagoClientConfig();
};