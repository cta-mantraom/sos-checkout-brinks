import { ValidationError } from '../errors/ValidationError.js';

export class CPF {
  private constructor(private readonly value: string) {}

  static create(value: string): CPF {
    const cleaned = value.replace(/\D/g, '');
    
    if (cleaned.length !== 11) {
      throw new ValidationError('CPF deve ter 11 dígitos');
    }

    if (!this.isValid(cleaned)) {
      throw new ValidationError('CPF inválido');
    }

    const formatted = this.format(cleaned);
    return new CPF(formatted);
  }

  private static isValid(cpf: string): boolean {
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) {
      return false;
    }

    // Validação do primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;

    // Validação do segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;

    return true;
  }

  private static format(cpf: string): string {
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
  }

  getValue(): string {
    return this.value;
  }

  getCleanValue(): string {
    return this.value.replace(/\D/g, '');
  }

  equals(other: CPF): boolean {
    return this.value === other.value;
  }
}