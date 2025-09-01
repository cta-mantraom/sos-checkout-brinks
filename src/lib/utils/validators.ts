// Validation utility functions for the SOS Checkout application

import { VALIDATION } from '@/lib/constants';

/**
 * Validate CPF format and check digit
 */
export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Check basic format
  if (cleanCPF.length !== 11) return false;
  
  // Check if all digits are the same
  if (/^(\d)\1+$/.test(cleanCPF)) return false;
  
  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i);
  }
  
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  
  if (digit !== parseInt(cleanCPF[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i);
  }
  
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  
  return digit === parseInt(cleanCPF[10]);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  return VALIDATION.EMAIL_REGEX.test(email);
}

/**
 * Validate phone format
 */
export function validatePhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length === 10 || cleanPhone.length === 11;
}

/**
 * Validate CEP format
 */
export function validateCEP(cep: string): boolean {
  return VALIDATION.CEP_REGEX.test(cep);
}

/**
 * Validate credit card number using Luhn algorithm
 */
export function validateCreditCard(cardNumber: string): boolean {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  
  if (cleanNumber.length < 13 || cleanNumber.length > 19) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit = digit % 10 + 1;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Validate CVV format
 */
export function validateCVV(cvv: string, cardType?: string): boolean {
  const cleanCVV = cvv.replace(/\D/g, '');
  
  if (cardType === 'amex') {
    return cleanCVV.length === 4;
  }
  
  return cleanCVV.length === 3;
}

/**
 * Validate expiration date (MM/YY format)
 */
export function validateExpirationDate(expiration: string): boolean {
  if (!/^\d{2}\/\d{2}$/.test(expiration)) return false;
  
  const [month, year] = expiration.split('/').map(Number);
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  
  if (month < 1 || month > 12) return false;
  if (year < currentYear || (year === currentYear && month < currentMonth)) return false;
  
  return true;
}

/**
 * Validate birth date (not in future, reasonable age range)
 */
export function validateBirthDate(birthDate: string): boolean {
  const date = new Date(birthDate);
  const now = new Date();
  
  // Check if date is valid
  if (isNaN(date.getTime())) return false;
  
  // Check if date is not in the future
  if (date > now) return false;
  
  // Check reasonable age range (0-120 years)
  const age = now.getFullYear() - date.getFullYear();
  return age >= 0 && age <= 120;
}

/**
 * Validate weight (in kg)
 */
export function validateWeight(weight: number): boolean {
  return weight >= VALIDATION.MIN_WEIGHT && weight <= VALIDATION.MAX_WEIGHT;
}

/**
 * Validate height (in cm)
 */
export function validateHeight(height: number): boolean {
  return height >= VALIDATION.MIN_HEIGHT && height <= VALIDATION.MAX_HEIGHT;
}

/**
 * Validate name (length and characters)
 */
export function validateName(name: string): boolean {
  if (name.length < VALIDATION.MIN_NAME_LENGTH || name.length > VALIDATION.MAX_NAME_LENGTH) {
    return false;
  }
  
  // Allow letters, spaces, accents, hyphens, and apostrophes
  const nameRegex = /^[a-zA-ZÀ-ÿ\s\-']+$/;
  return nameRegex.test(name);
}

/**
 * Validate blood type
 */
export function validateBloodType(bloodType: string): boolean {
  const validTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  return validTypes.includes(bloodType);
}

/**
 * Validate URL format
 */
export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate strong password
 */
export function validatePassword(password: string): {
  isValid: boolean;
  requirements: {
    minLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
} {
  const requirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  
  const isValid = Object.values(requirements).every(req => req);
  
  return { isValid, requirements };
}

/**
 * Validate file type and size
 */
export function validateFile(file: File, allowedTypes: string[], maxSize: number): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('Tipo de arquivo não permitido');
  }
  
  if (file.size > maxSize) {
    errors.push(`Arquivo muito grande. Máximo: ${maxSize / 1024 / 1024}MB`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate medication dosage format
 */
export function validateDosage(dosage: string): boolean {
  // Allow formats like: "5mg", "2.5ml", "1 comprimido", "1/2 comprimido"
  const dosageRegex = /^[\d/.]+\s*[a-zA-Z]*\s*[a-zA-Z\s]*$/;
  return dosageRegex.test(dosage.trim());
}

/**
 * Validate medication frequency
 */
export function validateFrequency(frequency: string): boolean {
  // Allow common frequency patterns
  const commonFrequencies = [
    '1x ao dia',
    '2x ao dia',
    '3x ao dia',
    'de 8 em 8 horas',
    'de 12 em 12 horas',
    'quando necessário',
    'antes das refeições',
    'após as refeições',
  ];
  
  const normalizedFreq = frequency.toLowerCase().trim();
  
  // Check if it matches common patterns or contains expected keywords
  return commonFrequencies.some(freq => 
    normalizedFreq.includes(freq.toLowerCase())
  ) || /\d+x|hora|dia|manhã|tarde|noite|refeição/i.test(frequency);
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate Brazilian postal code and return formatted version
 */
export function validateAndFormatCEP(cep: string): { isValid: boolean; formatted: string } {
  const cleanCEP = cep.replace(/\D/g, '');
  const isValid = cleanCEP.length === 8;
  const formatted = isValid ? cleanCEP.replace(/(\d{5})(\d{3})/, '$1-$2') : cep;
  
  return { isValid, formatted };
}

/**
 * Validate emergency contact relationship
 */
export function validateRelationship(relationship: string): boolean {
  const validRelationships = [
    'cônjuge', 'pai', 'mãe', 'filho', 'filha', 'irmão', 'irmã',
    'avô', 'avó', 'tio', 'tia', 'primo', 'prima', 'amigo', 'amiga',
    'vizinho', 'vizinha', 'colega', 'outro'
  ];
  
  return validRelationships.some(rel => 
    relationship.toLowerCase().includes(rel)
  ) || relationship.toLowerCase() === 'outro';
}

/**
 * Validate form completeness
 */
export function validateFormCompleteness<T extends Record<string, unknown>>(
  data: T,
  requiredFields: (keyof T)[]
): { isComplete: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '' || 
           (Array.isArray(value) && value.length === 0);
  }).map(String);
  
  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}