import { ValidationError } from '../errors/ValidationError.js';

export class PaymentAmount {
  private static readonly MIN_AMOUNT = 5.00; // R$ 5,00
  private static readonly MAX_AMOUNT = 10000.00; // R$ 10.000,00
  
  private constructor(private readonly value: number) {}

  static create(amount: number): PaymentAmount {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new ValidationError('Valor deve ser um número válido');
    }

    if (amount < this.MIN_AMOUNT) {
      throw new ValidationError(`Valor mínimo é R$ ${this.MIN_AMOUNT.toFixed(2)}`);
    }

    if (amount > this.MAX_AMOUNT) {
      throw new ValidationError(`Valor máximo é R$ ${this.MAX_AMOUNT.toFixed(2)}`);
    }

    // Arredonda para 2 casas decimais
    const roundedAmount = Math.round(amount * 100) / 100;
    
    return new PaymentAmount(roundedAmount);
  }

  getValue(): number {
    return this.value;
  }

  getFormattedValue(): string {
    return `R$ ${this.value.toFixed(2).replace('.', ',')}`;
  }

  isBasicPlanAmount(): boolean {
    return this.value === 5.00;
  }

  isPremiumPlanAmount(): boolean {
    return this.value === 10.00;
  }

  equals(other: PaymentAmount): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.getFormattedValue();
  }
}