import { z } from 'zod';

/**
 * Classe para validação avançada de variáveis de ambiente
 * Reutilizável e extensível
 */
export class EnvValidator {
  /**
   * Valida dados com schema Zod e contexto para debugging
   */
  static validate<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    context: string
  ): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join(', ');
        
        throw new Error(
          `[${context}] Configuration validation failed: ${issues}`
        );
      }
      throw error;
    }
  }

  /**
   * Valida com fallback em caso de falha
   */
  static validateWithFallback<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    fallback: T,
    context: string
  ): T {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return result.data;
    }
    
    console.warn(`[${context}] Validation failed, using fallback configuration`);
    console.warn(`[${context}] Validation errors:`, result.error.issues);
    
    return fallback;
  }

  /**
   * Valida apenas campos obrigatórios, ignora opcionais
   */
  static validateRequired<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    context: string
  ): Partial<T> {
    try {
      // Primeiro tenta validação completa
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Se falha, tenta validar apenas campos que têm valor
        const filteredData = this.filterValidFields(data, error);
        
        try {
          // Type-safe check for partial method
          const schemaWithPartial = schema as unknown as { partial?: () => z.ZodSchema<Partial<T>> };
          
          if (schemaWithPartial.partial && typeof schemaWithPartial.partial === 'function') {
            const partialSchema = schemaWithPartial.partial();
            const partialResult = partialSchema.parse(filteredData);
            console.warn(`[${context}] Partial validation applied due to missing optional fields`);
            return partialResult;
          } else {
            // If no partial method, use the original schema with filtered data
            const result = schema.parse(filteredData);
            console.warn(`[${context}] Original schema validation applied with filtered data`);
            return result;
          }
        } catch (partialError) {
          console.error(`[${context}] Even partial validation failed`);
          throw partialError;
        }
      }
      throw error;
    }
  }

  /**
   * Filtra apenas campos que passaram na validação
   */
  private static filterValidFields(data: unknown, error: z.ZodError): Record<string, unknown> {
    if (typeof data !== 'object' || data === null) {
      return {};
    }

    const dataObj = data as Record<string, unknown>;
    const failedPaths = new Set(error.issues.map(issue => issue.path[0]));
    
    return Object.keys(dataObj).reduce((acc, key) => {
      if (!failedPaths.has(key) && dataObj[key] !== undefined) {
        acc[key] = dataObj[key];
      }
      return acc;
    }, {} as Record<string, unknown>);
  }

  /**
   * Valida lista de variáveis de ambiente obrigatórias
   */
  static validateRequiredEnvVars(requiredVars: string[]): string[] {
    const missing = requiredVars.filter(envVar => {
      const value = process.env[envVar];
      return !value || value.trim() === '';
    });

    return missing;
  }

  /**
   * Cria objeto de configuração a partir de process.env com validação
   */
  static createConfigFromEnv<T>(
    schema: z.ZodSchema<T>,
    envMapping: Record<keyof T, string>,
    context: string
  ): T {
    const config = {} as Record<string, unknown>;
    
    // Mapeia process.env para objeto de config
    Object.entries(envMapping).forEach(([configKey, envKey]) => {
      const envValue = process.env[envKey as string];
      if (envValue !== undefined) {
        config[configKey] = envValue;
      }
    });

    return this.validate(schema, config, context);
  }

  /**
   * Valida e transforma tipos de dados automaticamente
   */
  static validateAndTransform<T>(
    schema: z.ZodSchema<T>,
    data: Record<string, string | undefined>,
    context: string,
    transformers?: Record<string, (value: string) => unknown>
  ): T {
    const transformedData = { ...data };

    // Aplica transformações customizadas
    if (transformers) {
      Object.entries(transformers).forEach(([key, transformer]) => {
        const value = transformedData[key];
        if (value !== undefined) {
          transformedData[key] = transformer(value) as string;
        }
      });
    }

    return this.validate(schema, transformedData, context);
  }

  /**
   * Valida uma única variável de ambiente
   */
  static validateEnvVar(name: string, required: boolean = false): string | undefined {
    const value = process.env[name];
    
    if (required && (!value || value.trim() === '')) {
      throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
    }
    
    return value;
  }

  /**
   * Obtém uma variável de ambiente com fallback
   */
  static getEnvVar(name: string, defaultValue?: string): string | undefined {
    return process.env[name] || defaultValue;
  }

  /**
   * Obtém uma variável de ambiente obrigatória
   */
  static getRequiredEnvVar(name: string): string {
    const value = process.env[name];
    
    if (!value || value.trim() === '') {
      throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
    }
    
    return value;
  }
}

// Exportar também como funções standalone para compatibilidade
export const validateEnvVar = EnvValidator.validateEnvVar;
export const validateRequiredEnvVars = EnvValidator.validateRequiredEnvVars;
export const getEnvVar = EnvValidator.getEnvVar;
export const getRequiredEnvVar = EnvValidator.getRequiredEnvVar;