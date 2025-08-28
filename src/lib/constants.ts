// Application constants for SOS Checkout

// App metadata
export const APP_NAME = 'SOS Checkout Brinks';
export const APP_DESCRIPTION = 'Suas informações médicas seguras e acessíveis em qualquer emergência';
export const APP_VERSION = '1.0.0';

// Contact information
export const CONTACT = {
  EMAIL: 'suporte@soscheckout.com',
  PHONE: '(11) 99999-9999',
  WHATSAPP: 'https://wa.me/5511999999999',
  ADDRESS: 'São Paulo, SP - Brasil',
} as const;

// Social links
export const SOCIAL_LINKS = {
  FACEBOOK: 'https://facebook.com/soscheckout',
  INSTAGRAM: 'https://instagram.com/soscheckout',
  TWITTER: 'https://twitter.com/soscheckout',
  LINKEDIN: 'https://linkedin.com/company/soscheckout',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  PROFILE: {
    CREATE: '/api/create-profile',
    GET: '/api/get-profile',
    UPDATE: '/api/update-profile',
    DELETE: '/api/delete-profile',
  },
  PAYMENT: {
    PROCESS: '/api/process-payment',
    STATUS: '/api/payment-status',
    WEBHOOK: '/api/mercadopago-webhook',
  },
  QR_CODE: {
    GENERATE: '/api/generate-qr',
    GET: '/api/get-qr',
    REGENERATE: '/api/regenerate-qr',
  },
  HEALTH: '/api/health',
  LOG_ERROR: '/api/log-error',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  CHECKOUT_DATA: 'sos_checkout_data',
  USER_PREFERENCES: 'sos_user_preferences',
  FORM_DRAFT: 'sos_form_draft',
  LAST_PROFILE_ID: 'sos_last_profile_id',
} as const;

// Form validation constants
export const VALIDATION = {
  CPF_REGEX: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  PHONE_REGEX: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  CEP_REGEX: /^\d{5}-\d{3}$/,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MAX_OBSERVATIONS_LENGTH: 500,
  MIN_WEIGHT: 20,
  MAX_WEIGHT: 300,
  MIN_HEIGHT: 100,
  MAX_HEIGHT: 250,
  MAX_ALLERGIES: 20,
  MAX_MEDICATIONS: 20,
  MAX_CONDITIONS: 20,
  MAX_EMERGENCY_CONTACTS: 3,
} as const;

// Blood types
export const BLOOD_TYPES = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
] as const;

// Brazilian states
export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
] as const;

// Medical specialties (common ones)
export const MEDICAL_SPECIALTIES = [
  'Cardiologia',
  'Dermatologia',
  'Endocrinologia',
  'Gastroenterologia',
  'Ginecologia',
  'Neurologia',
  'Oftalmologia',
  'Ortopedia',
  'Pediatria',
  'Pneumologia',
  'Psiquiatria',
  'Reumatologia',
  'Urologia',
  'Clínica Geral',
  'Medicina de Emergência',
  'Outro'
] as const;

// Relationship types for emergency contacts
export const RELATIONSHIP_TYPES = [
  'Cônjuge',
  'Pai',
  'Mãe',
  'Filho(a)',
  'Irmão(ã)',
  'Avô/Avó',
  'Tio(a)',
  'Primo(a)',
  'Amigo(a)',
  'Vizinho(a)',
  'Colega de Trabalho',
  'Outro'
] as const;

// Payment method types
export const PAYMENT_METHODS = {
  PIX: 'pix',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  BOLETO: 'boleto',
} as const;

// Payment status types
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

// Subscription types and durations
export const SUBSCRIPTION_TYPES = {
  BASIC: 'basic',
  PREMIUM: 'premium',
} as const;

// QR Code settings
export const QR_CODE = {
  SIZE: 256,
  ERROR_CORRECTION_LEVEL: 'M' as const,
  MARGIN: 4,
  FORMATS: ['PNG', 'SVG', 'PDF'] as const,
  MAX_URL_LENGTH: 2048,
  EXPIRY_DAYS: {
    BASIC: 30,
    PREMIUM: 365,
  },
} as const;

// File upload limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  MAX_FILES: 5,
} as const;

// Date/time formats
export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  API: 'yyyy-MM-dd',
  DATETIME: 'dd/MM/yyyy HH:mm:ss',
  TIME: 'HH:mm',
} as const;

// Error codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  QR_CODE_ERROR: 'QR_CODE_ERROR',
  PROFILE_ERROR: 'PROFILE_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  PROFILE_CREATED: 'Perfil médico criado com sucesso!',
  PROFILE_UPDATED: 'Perfil médico atualizado com sucesso!',
  PAYMENT_APPROVED: 'Pagamento aprovado! Sua assinatura está ativa.',
  QR_CODE_GENERATED: 'QR Code gerado com sucesso!',
  QR_CODE_REGENERATED: 'QR Code renovado com sucesso!',
  DATA_SAVED: 'Dados salvos com sucesso!',
  EMAIL_SENT: 'Email enviado com sucesso!',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  GENERIC: 'Ocorreu um erro inesperado. Tente novamente.',
  NETWORK: 'Erro de conexão. Verifique sua internet.',
  VALIDATION: 'Dados inválidos. Verifique os campos preenchidos.',
  PAYMENT_FAILED: 'Falha no pagamento. Tente novamente.',
  PAYMENT_REJECTED: 'Pagamento rejeitado. Verifique os dados do cartão.',
  PROFILE_NOT_FOUND: 'Perfil médico não encontrado.',
  QR_CODE_EXPIRED: 'QR Code expirado. Gere um novo.',
  QR_CODE_INVALID: 'QR Code inválido.',
  SERVER_ERROR: 'Erro no servidor. Tente novamente em alguns minutos.',
  PERMISSION_DENIED: 'Acesso negado.',
  RATE_LIMIT: 'Muitas tentativas. Aguarde um momento.',
} as const;

// Feature flags (for gradual rollouts)
export const FEATURE_FLAGS = {
  DARK_MODE: false,
  MULTI_LANGUAGE: false,
  ADVANCED_QR_OPTIONS: false,
  FAMILY_PROFILES: false,
  MEDICAL_ALERTS: true,
  EMERGENCY_CONTACTS_LIMIT: 3,
} as const;

// Analytics events
export const ANALYTICS_EVENTS = {
  PAGE_VIEW: 'page_view',
  PROFILE_CREATED: 'profile_created',
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_COMPLETED: 'payment_completed',
  QR_CODE_GENERATED: 'qr_code_generated',
  QR_CODE_SHARED: 'qr_code_shared',
  QR_CODE_DOWNLOADED: 'qr_code_downloaded',
  ERROR_OCCURRED: 'error_occurred',
} as const;