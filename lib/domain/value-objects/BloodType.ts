import { ValidationError } from '../errors/ValidationError.js';

export type BloodTypeValue = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export class BloodType {
  private static readonly VALID_TYPES: BloodTypeValue[] = [
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
  ];

  private constructor(private readonly value: BloodTypeValue) {}

  static create(value: string): BloodType {
    const upperValue = value.toUpperCase();
    
    if (!this.VALID_TYPES.includes(upperValue as BloodTypeValue)) {
      throw new ValidationError(`Tipo sanguíneo inválido: ${value}. Tipos válidos: ${this.VALID_TYPES.join(', ')}`);
    }
    
    return new BloodType(upperValue as BloodTypeValue);
  }

  static getAllTypes(): BloodTypeValue[] {
    return [...this.VALID_TYPES];
  }

  getValue(): BloodTypeValue {
    return this.value;
  }

  isRareType(): boolean {
    return this.value.startsWith('AB');
  }

  isUniversalDonor(): boolean {
    return this.value === 'O-';
  }

  isUniversalRecipient(): boolean {
    return this.value === 'AB+';
  }

  canDonateTo(recipient: BloodType): boolean {
    const compatibility: Record<BloodTypeValue, BloodTypeValue[]> = {
      'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
      'O+': ['O+', 'A+', 'B+', 'AB+'],
      'A-': ['A-', 'A+', 'AB-', 'AB+'],
      'A+': ['A+', 'AB+'],
      'B-': ['B-', 'B+', 'AB-', 'AB+'],
      'B+': ['B+', 'AB+'],
      'AB-': ['AB-', 'AB+'],
      'AB+': ['AB+']
    };

    return compatibility[this.value].includes(recipient.getValue());
  }

  equals(other: BloodType): boolean {
    return this.value === other.value;
  }
}