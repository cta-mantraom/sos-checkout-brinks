import { ConfigSingleton, ConfigMask } from "../utils/index.js";
import {
  PaymentConfigSchema,
  PaymentEnvSchema,
  type PaymentConfig,
  type PaymentEnv,
} from "../schemas/index.js";

/**
 * Configuração de pagamento com singleton + lazy loading
 * ISOLADO - uma responsabilidade: configuração de pagamento
 */
export class PaymentConfigService extends ConfigSingleton<PaymentConfig> {
  private static readonly CONFIG_KEY = "payment";

  public constructor() {
    super(PaymentConfigService.CONFIG_KEY);
  }

  /**
   * Obtém instância singleton
   */
  public static getInstance(): PaymentConfigService {
    return ConfigSingleton.getOrCreateInstance(
      PaymentConfigService.CONFIG_KEY,
      () => new PaymentConfigService()
    );
  }

  /**
   * Implementação do carregamento e validação
   */
  protected loadAndValidate(): PaymentConfig {
    try {
      // 1. Validar variáveis de ambiente primeiro
      const envData = this.loadEnvironmentData();

      // 2. Construir configuração usando dados parciais (defaults do schema serão aplicados)
      const config = {
        mercadopago: {
          accessToken: envData.MERCADOPAGO_ACCESS_TOKEN,
          publicKey: envData.MERCADOPAGO_PUBLIC_KEY,
          webhookSecret: envData.MERCADOPAGO_WEBHOOK_SECRET,
          environment:
            envData.NODE_ENV === "production"
              ? ("production" as const)
              : ("sandbox" as const),
        },
        prices: {
          basic: 5.0 as const,
          premium: 10.0 as const,
        },
        paymentMethods: {
          creditCard: true,
          debitCard: true,
          pix: true,
          boleto: false,
          wallet: false,
        },
      };

      // 3. Validar configuração final (defaults serão aplicados pelo schema)
      const validatedConfig = PaymentConfigSchema.parse(config);

      // 4. Log com mascaramento
      this.logConfigLoaded(validatedConfig);

      return validatedConfig;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      ConfigMask.logError(
        new Error(
          `Falha ao carregar configuração de pagamento: ${errorMessage}`
        ),
        "PaymentConfig"
      );
      throw error;
    }
  }

  /**
   * Carrega e valida dados do ambiente
   */
  private loadEnvironmentData(): PaymentEnv {
    // Verificar se todas as variáveis obrigatórias existem
    const missingVars: string[] = [];
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN)
      missingVars.push("MERCADOPAGO_ACCESS_TOKEN");
    if (!process.env.MERCADOPAGO_PUBLIC_KEY)
      missingVars.push("MERCADOPAGO_PUBLIC_KEY");
    if (!process.env.MERCADOPAGO_WEBHOOK_SECRET)
      missingVars.push("MERCADOPAGO_WEBHOOK_SECRET");

    if (missingVars.length > 0) {
      throw new Error(
        `Variáveis de ambiente obrigatórias ausentes: ${missingVars.join(", ")}`
      );
    }

    // Criar objeto de environment data (schema aplicará defaults)
    const envData = {
      MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN!,
      MERCADOPAGO_PUBLIC_KEY: process.env.MERCADOPAGO_PUBLIC_KEY!,
      MERCADOPAGO_WEBHOOK_SECRET: process.env.MERCADOPAGO_WEBHOOK_SECRET!,
      NODE_ENV: process.env.NODE_ENV as
        | "development"
        | "production"
        | "test"
        | undefined,
    };

    // Validar com schema (defaults serão aplicados automaticamente)
    return PaymentEnvSchema.parse(envData);
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
      "PaymentConfig"
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
    return this.getConfig().mercadopago.environment === "production";
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
