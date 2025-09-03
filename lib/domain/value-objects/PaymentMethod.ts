import { ValidationError } from '../errors/ValidationError.js';

export type PaymentMethodValue = 'credit_card' | 'debit_card' | 'pix' | 'boleto';

export class PaymentMethod {
  private static readonly VALID_METHODS: PaymentMethodValue[] = [
    'credit_card', 'debit_card', 'pix', 'boleto'
  ];

  public static readonly CREDIT_CARD = new PaymentMethod('credit_card');
  public static readonly DEBIT_CARD = new PaymentMethod('debit_card');
  public static readonly PIX = new PaymentMethod('pix');
  public static readonly BOLETO = new PaymentMethod('boleto');

  private constructor(private readonly value: PaymentMethodValue) {}

  static create(value: string): PaymentMethod {
    if (!this.VALID_METHODS.includes(value as PaymentMethodValue)) {
      throw new ValidationError(`Método de pagamento inválido: ${value}`);
    }
    
    return new PaymentMethod(value as PaymentMethodValue);
  }

  static fromString(value: string): PaymentMethod {
    return this.create(value);
  }

  getValue(): PaymentMethodValue {
    return this.value;
  }

  isCardPayment(): boolean {
    return this.value === 'credit_card' || this.value === 'debit_card';
  }

  isInstantPayment(): boolean {
    return this.value === 'pix';
  }

  allowsInstallments(): boolean {
    return this.value === 'credit_card';
  }

  requiresManualConfirmation(): boolean {
    return this.value === 'pix' || this.value === 'boleto';
  }

  getDisplayName(): string {
    const names: Record<PaymentMethodValue, string> = {
      'credit_card': 'Cartão de Crédito',
      'debit_card': 'Cartão de Débito',
      'pix': 'PIX',
      'boleto': 'Boleto Bancário'
    };

    return names[this.value];
  }

  getExpirationTimeMinutes(): number {
    const expirations: Record<PaymentMethodValue, number> = {
      'pix': 30,           // 30 minutos
      'boleto': 4320,      // 3 dias (72 horas)
      'credit_card': 1440, // 24 horas
      'debit_card': 1440   // 24 horas
    };

    return expirations[this.value];
  }

  equals(other: PaymentMethod): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.getDisplayName();
  }
}