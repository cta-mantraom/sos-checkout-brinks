/**
 * Utility para implementação de Singleton pattern em configurações
 * Garante lazy loading e evita múltiplas inicializações
 */

export abstract class ConfigSingleton<T> {
  private static instances: Map<string, ConfigSingleton<unknown>> = new Map();
  protected config: T | null = null;
  protected readonly configKey: string;

  protected constructor(configKey: string) {
    this.configKey = configKey;
  }

  /**
   * Método genérico para obter instância singleton
   */
  protected static getInstance<K extends ConfigSingleton<unknown>>(
    this: new (configKey: string) => K,
    configKey: string
  ): K {
    if (!ConfigSingleton.instances.has(configKey)) {
      const instance = new this(configKey);
      ConfigSingleton.instances.set(configKey, instance);
    }
    
    return ConfigSingleton.instances.get(configKey) as K;
  }

  /**
   * Método abstrato que cada config deve implementar
   * para carregar e validar suas configurações
   */
  protected abstract loadAndValidate(): T;

  /**
   * Obtém a configuração com lazy loading
   */
  public getConfig(): T {
    if (!this.config) {
      this.config = this.loadAndValidate();
      this.onConfigLoaded(this.config);
    }
    return this.config;
  }

  /**
   * Hook executado após carregamento da configuração
   * Útil para logging, cache, etc.
   */
  protected onConfigLoaded(config: T): void {
    console.debug(`[${this.configKey}] Configuration loaded successfully`);
  }

  /**
   * Força recarregamento da configuração
   * Útil para testes ou atualizações em runtime
   */
  public reloadConfig(): T {
    this.config = null;
    return this.getConfig();
  }

  /**
   * Verifica se a configuração já foi carregada
   */
  public isLoaded(): boolean {
    return this.config !== null;
  }

  /**
   * Limpa cache de todas as instâncias
   * Útil para testes
   */
  public static clearAllCaches(): void {
    ConfigSingleton.instances.forEach((instance) => {
      if ('config' in instance) {
        (instance as ConfigSingleton<unknown>).config = null;
      }
    });
  }

  /**
   * Remove uma instância específica do cache
   */
  public static clearCache(configKey: string): void {
    const instance = ConfigSingleton.instances.get(configKey);
    if (instance) {
      (instance as ConfigSingleton<unknown>).config = null;
    }
  }

  /**
   * Lista todas as configurações carregadas
   * Útil para debugging
   */
  public static getLoadedConfigs(): string[] {
    const loaded: string[] = [];
    
    ConfigSingleton.instances.forEach((instance, key) => {
      if ((instance as ConfigSingleton<unknown>).isLoaded()) {
        loaded.push(key);
      }
    });
    
    return loaded;
  }
}

/**
 * Decorator para métodos que requerem configuração carregada
 */
export function RequireConfig<T>(
  target: ConfigSingleton<T>,
  propertyName: string,
  descriptor: PropertyDescriptor
): void {
  const method = descriptor.value;

  descriptor.value = function (this: ConfigSingleton<T>, ...args: unknown[]) {
    // Garante que config esteja carregada antes de executar o método
    this.getConfig();
    return method.apply(this, args);
  };
}

/**
 * Type helper para configurações singleton
 */
export interface SingletonConfig<T> {
  getInstance(): ConfigSingleton<T>;
  getConfig(): T;
  isLoaded(): boolean;
  reloadConfig(): T;
}