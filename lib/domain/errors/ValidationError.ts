import { DomainError } from './DomainError.js';

export class ValidationError extends DomainError {
  constructor(
    message: string,
    field?: string,
    value?: unknown,
    context?: Record<string, unknown>
  ) {
    const errorContext = {
      ...context,
      ...(field && { field }),
      ...(value !== undefined && { value })
    };

    super(message, 'VALIDATION_ERROR', errorContext);
  }

  static required(field: string): ValidationError {
    return new ValidationError(`Campo ${field} é obrigatório`, field);
  }

  static invalid(field: string, value: unknown, reason?: string): ValidationError {
    const message = reason 
      ? `Campo ${field} é inválido: ${reason}`
      : `Campo ${field} é inválido`;
    
    return new ValidationError(message, field, value);
  }

  static minLength(field: string, minLength: number, currentLength: number): ValidationError {
    return new ValidationError(
      `Campo ${field} deve ter pelo menos ${minLength} caracteres (atual: ${currentLength})`,
      field,
      currentLength,
      { minLength, currentLength }
    );
  }

  static maxLength(field: string, maxLength: number, currentLength: number): ValidationError {
    return new ValidationError(
      `Campo ${field} deve ter no máximo ${maxLength} caracteres (atual: ${currentLength})`,
      field,
      currentLength,
      { maxLength, currentLength }
    );
  }

  static outOfRange(field: string, min: number, max: number, value: number): ValidationError {
    return new ValidationError(
      `Campo ${field} deve estar entre ${min} e ${max} (valor: ${value})`,
      field,
      value,
      { min, max, value }
    );
  }
}