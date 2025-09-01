// Utility functions for formatting data in the SOS Checkout application

/**
 * Format CPF with dots and dash
 */
export function formatCPF(cpf: string): string {
  const numbers = cpf.replace(/\D/g, '');
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Format phone number with parentheses and dash
 */
export function formatPhone(phone: string): string {
  const numbers = phone.replace(/\D/g, '');
  if (numbers.length === 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}

/**
 * Format CEP with dash
 */
export function formatCEP(cep: string): string {
  const numbers = cep.replace(/\D/g, '');
  return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
}

/**
 * Format currency to Brazilian Real
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Format date to Brazilian format
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR').format(dateObj);
}

/**
 * Format datetime to Brazilian format
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(dateObj);
}

/**
 * Format time to Brazilian format
 */
export function formatTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: string | Date): number {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration in human readable format
 */
export function formatDuration(days: number): string {
  if (days < 30) {
    return `${days} dia${days !== 1 ? 's' : ''}`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} mês${months !== 1 ? 'es' : ''}`;
  } else {
    const years = Math.floor(days / 365);
    return `${years} ano${years !== 1 ? 's' : ''}`;
  }
}

/**
 * Format time until expiration
 */
export function formatTimeUntilExpiration(expiresAt: string): string {
  const expirationDate = new Date(expiresAt);
  const now = new Date();
  const diffMs = expirationDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Expirado';
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffDays > 0) {
    return `${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  } else {
    return `${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
  }
}

/**
 * Format payment status for display
 */
export function formatPaymentStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado',
  };
  
  return statusMap[status] || status;
}

/**
 * Format payment method for display
 */
export function formatPaymentMethod(method: string): string {
  const methodMap: Record<string, string> = {
    pix: 'PIX',
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
    boleto: 'Boleto Bancário',
  };
  
  return methodMap[method] || method;
}

/**
 * Format subscription type for display
 */
export function formatSubscriptionType(type: string): string {
  const typeMap: Record<string, string> = {
    basic: 'Básico',
    premium: 'Premium',
  };
  
  return typeMap[type] || type;
}

/**
 * Format medical condition or allergy for display
 */
export function formatMedicalCondition(condition: string): string {
  return condition.charAt(0).toUpperCase() + condition.slice(1).toLowerCase();
}

/**
 * Format emergency contact relationship
 */
export function formatRelationship(relationship: string): string {
  const relationshipMap: Record<string, string> = {
    spouse: 'Cônjuge',
    father: 'Pai',
    mother: 'Mãe',
    son: 'Filho',
    daughter: 'Filha',
    brother: 'Irmão',
    sister: 'Irmã',
    grandfather: 'Avô',
    grandmother: 'Avó',
    uncle: 'Tio',
    aunt: 'Tia',
    cousin: 'Primo(a)',
    friend: 'Amigo(a)',
    neighbor: 'Vizinho(a)',
    coworker: 'Colega de Trabalho',
    other: 'Outro',
  };
  
  return relationshipMap[relationship.toLowerCase()] || relationship;
}

/**
 * Mask sensitive data (CPF, phone, etc.)
 */
export function maskSensitiveData(data: string, type: 'cpf' | 'phone' | 'email' | 'card'): string {
  switch (type) {
    case 'cpf':
      return data.replace(/(\d{3})\.\d{3}\.(\d{3})-\d{2}/, '$1.***.***-**');
    case 'phone':
      return data.replace(/\((\d{2})\)\s\d{4,5}-(\d{4})/, '($1) *****-$2');
    case 'email': {
      const [username, domain] = data.split('@');
      const maskedUsername = username.length > 2 
        ? username.substring(0, 2) + '*'.repeat(username.length - 2)
        : username;
      return `${maskedUsername}@${domain}`;
    }
    case 'card':
      return data.replace(/(\d{4})\s\d{4}\s\d{4}\s(\d{4})/, '$1 **** **** $2');
    default:
      return data;
  }
}

/**
 * Generate initials from name
 */
export function generateInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format blood type with proper styling
 */
export function formatBloodType(bloodType: string): string {
  return bloodType.replace(/([ABO])([+-])/, '$1$2');
}