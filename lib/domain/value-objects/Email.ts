import { ValidationError } from '../errors/ValidationError.js';

export class Email {
  private static readonly REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private constructor(private readonly value: string) {}

  static create(value: string): Email {
    const trimmed = value.trim().toLowerCase();
    
    if (!trimmed) {
      throw new ValidationError('Email é obrigatório');
    }

    if (!this.REGEX.test(trimmed)) {
      throw new ValidationError('Formato de email inválido');
    }

    if (trimmed.length > 254) {
      throw new ValidationError('Email muito longo');
    }

    return new Email(trimmed);
  }

  getValue(): string {
    return this.value;
  }

  getDomain(): string {
    return this.value.split('@')[1];
  }

  getLocalPart(): string {
    return this.value.split('@')[0];
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}