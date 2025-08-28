import { ValidationError } from '../errors/ValidationError.js';

export class PhoneNumber {
  private static readonly REGEX = /^\(\d{2}\) \d{5}-\d{4}$/;

  private constructor(private readonly value: string) {}

  static create(value: string): PhoneNumber {
    const cleaned = value.replace(/\D/g, '');
    
    if (cleaned.length !== 11) {
      throw new ValidationError('Telefone deve ter 11 dígitos');
    }

    // Validação do DDD (11-99)
    const ddd = parseInt(cleaned.slice(0, 2));
    if (ddd < 11 || ddd > 99) {
      throw new ValidationError('DDD inválido');
    }

    // Validação do primeiro dígito do número (deve ser 9 para celular)
    const firstDigit = parseInt(cleaned.charAt(2));
    if (firstDigit !== 9) {
      throw new ValidationError('Número de celular deve começar com 9');
    }

    const formatted = this.format(cleaned);
    
    if (!this.REGEX.test(formatted)) {
      throw new ValidationError('Formato de telefone inválido');
    }

    return new PhoneNumber(formatted);
  }

  private static format(phone: string): string {
    return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
  }

  getValue(): string {
    return this.value;
  }

  getCleanValue(): string {
    return this.value.replace(/\D/g, '');
  }

  getDDD(): string {
    return this.value.slice(1, 3);
  }

  equals(other: PhoneNumber): boolean {
    return this.value === other.value;
  }
}