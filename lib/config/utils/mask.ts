/**
 * Utility para mascaramento de dados sensíveis em logs e debugging
 * LGPD e PCI-DSS compliant
 */

export class ConfigMask {
  private static readonly SENSITIVE_PATTERNS = [
    /token/i,
    /secret/i,
    /key/i,
    /password/i,
    /credential/i,
    /private/i,
    /auth/i,
    /api_key/i,
    /access/i,
  ];

  private static readonly CARD_PATTERNS = [
    /card.*number/i,
    /card.*token/i,
    /cvv/i,
    /security.*code/i,
  ];

  private static readonly PII_PATTERNS = [
    /cpf/i,
    /cnpj/i,
    /email/i,
    /phone/i,
    /address/i,
    /birth/i,
    /name/i,
  ];

  /**
   * Mascara um valor baseado na chave/nome do campo
   */
  static mask(key: string, value: unknown): unknown {
    if (typeof value !== 'string') {
      return value;
    }

    // Identifica o tipo de dado sensível
    const isSensitive = this.SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
    const isCard = this.CARD_PATTERNS.some(pattern => pattern.test(key));
    const isPII = this.PII_PATTERNS.some(pattern => pattern.test(key));

    if (isCard) {
      return this.maskCardData(value);
    }

    if (isSensitive) {
      return this.maskSensitiveData(value);
    }

    if (isPII) {
      return this.maskPIIData(key, value);
    }

    return value;
  }

  /**
   * Mascara dados de cartão (PCI-DSS compliance)
   */
  private static maskCardData(value: string): string {
    if (value.length <= 4) {
      return '***';
    }

    // Para números de cartão, mostra apenas últimos 4 dígitos
    if (/^\d{13,19}$/.test(value)) {
      return `****-****-****-${value.slice(-4)}`;
    }

    // Para outros dados de cartão
    return '***';
  }

  /**
   * Mascara dados sensíveis (tokens, secrets, etc.)
   */
  private static maskSensitiveData(value: string): string {
    if (value.length <= 8) {
      return '***';
    }

    // Para tokens longos, mostra início e fim
    if (value.length > 20) {
      return `${value.slice(0, 6)}...${value.slice(-6)}`;
    }

    // Para secrets menores, mostra apenas início
    return `${value.slice(0, 4)}***`;
  }

  /**
   * Mascara dados pessoais (PII - LGPD compliance)
   */
  private static maskPIIData(key: string, value: string): string {
    // CPF/CNPJ
    if (/cpf|cnpj/i.test(key)) {
      return value.replace(/\d(?=\d{3})/g, '*');
    }

    // Email
    if (/email/i.test(key) && value.includes('@')) {
      const [local, domain] = value.split('@');
      const maskedLocal = local.length > 2 
        ? `${local[0]}***${local.slice(-1)}`
        : '***';
      return `${maskedLocal}@${domain}`;
    }

    // Phone
    if (/phone/i.test(key)) {
      return value.replace(/\d(?=\d{2})/g, '*');
    }

    // Names
    if (/name/i.test(key)) {
      const words = value.split(' ');
      return words.map((word, index) => {
        if (index === 0 || index === words.length - 1) {
          // Mostra primeira e última palavra parcialmente
          return word.length > 1 ? `${word[0]}***` : word;
        }
        return '***';
      }).join(' ');
    }

    // Default PII masking
    return value.length > 3 
      ? `${value.slice(0, 2)}***`
      : '***';
  }

  /**
   * Mascara um objeto completo recursivamente
   */
  static maskObject(obj: Record<string, unknown>): Record<string, unknown> {
    const masked: Record<string, unknown> = {};

    Object.entries(obj).forEach(([key, value]) => {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // Recursão para objetos aninhados
        masked[key] = this.maskObject(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        // Para arrays, mascara cada item
        masked[key] = value.map(item => 
          typeof item === 'object' ? this.maskObject(item as Record<string, unknown>) : item
        );
      } else {
        // Mascara o valor
        masked[key] = this.mask(key, value);
      }
    });

    return masked;
  }

  /**
   * Log de configuração com mascaramento automático
   */
  static logConfig(config: Record<string, unknown>, context: string): void {
    const masked = this.maskObject(config);
    console.log(`[${context}] Configuration loaded:`, JSON.stringify(masked, null, 2));
  }

  /**
   * Log de erro com mascaramento de dados sensíveis
   */
  static logError(error: Error, context: string, additionalData?: Record<string, unknown>): void {
    const errorLog: Record<string, unknown> = {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };

    if (additionalData) {
      errorLog.data = this.maskObject(additionalData);
    }

    console.error(`[${context}] Error occurred:`, JSON.stringify(errorLog, null, 2));
  }

  /**
   * Verifica se um campo é considerado sensível
   */
  static isSensitive(key: string): boolean {
    return this.SENSITIVE_PATTERNS.some(pattern => pattern.test(key)) ||
           this.CARD_PATTERNS.some(pattern => pattern.test(key)) ||
           this.PII_PATTERNS.some(pattern => pattern.test(key));
  }

  /**
   * Cria uma versão mascarada de uma string para debugging
   */
  static createDebugString(value: string, maxLength: number = 50): string {
    if (value.length <= maxLength) {
      return value;
    }

    const half = Math.floor(maxLength / 2);
    return `${value.slice(0, half)}...${value.slice(-half)} (${value.length} chars total)`;
  }
}

// Exportar funções standalone para compatibilidade
export const maskSensitiveData = ConfigMask.mask;
export const maskToken = (value: string) => ConfigMask.mask("token", value);
export const maskEmail = (value: string) => {
  const [localPart, domain] = value.split('@');
  if (!domain) return '***';
  const maskedLocal = localPart.length > 2 
    ? `${localPart.slice(0, 2)}***`
    : '***';
  return `${maskedLocal}@${domain}`;
};
export const maskUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}***`;
  } catch {
    return '***';
  }
};