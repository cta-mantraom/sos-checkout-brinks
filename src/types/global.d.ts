// Global type declarations for the SOS Checkout application

// MercadoPago SDK interfaces
interface MercadoPagoCardFormOptions {
  amount: number;
  autoMount?: boolean;
  processingMode?: 'aggregator' | 'gateway';
}

interface MercadoPagoBrick {
  mount: (containerId: string) => void;
  unmount: () => void;
  update: (data: Record<string, unknown>) => void;
}

interface MercadoPagoBricksBuilder {
  create: (type: 'payment' | 'statusScreen' | 'wallet' | 'cardForm', containerId: string, options: Record<string, unknown>) => Promise<MercadoPagoBrick>;
}

interface MercadoPagoInstance {
  bricks: () => MercadoPagoBricksBuilder;
  checkout: (options: Record<string, unknown>) => void;
}

interface MercadoPagoConstructor {
  new (publicKey: string, options?: { locale?: string }): MercadoPagoInstance;
}

declare global {
  interface Window {
    MercadoPago: MercadoPagoConstructor;
    MP_DEVICE_SESSION_ID?: string;  // Device ID gerado pelo MercadoPago para segurança
  }
}

// Environment variables type safety
interface ImportMetaEnv {
  readonly VITE_MERCADOPAGO_PUBLIC_KEY: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// React Hook Form custom error types
declare module 'react-hook-form' {
  interface FieldError {
    message?: string;
    type?: string;
  }
}

// Extend the Navigator interface for better Web Share API support
declare global {
  interface Navigator {
    share?: (data: ShareData) => Promise<void>;
  }

  interface ShareData {
    title?: string;
    text?: string;
    url?: string;
    files?: File[];
  }
}

// Custom error types for the application
export interface ApiError extends Error {
  status?: number;
  statusText?: string;
  data?: unknown;
}

export interface ValidationError extends Error {
  field?: string;
  value?: unknown;
}

// Payment related types
export interface PaymentError extends Error {
  code?: string;
  status?: 'rejected' | 'cancelled' | 'error';
  details?: unknown;
}

// QR Code related types  
export interface QRCodeError extends Error {
  type?: 'generation' | 'expired' | 'invalid';
}

// Medical form field types
export type MedicalFieldType = 
  | 'text'
  | 'email' 
  | 'phone'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'textarea'
  | 'checkbox'
  | 'number';

// Component prop helpers
export type PropsWithClassName<P = Record<string, unknown>> = P & {
  className?: string;
};

export type PropsWithChildren<P = Record<string, unknown>> = P & {
  children?: React.ReactNode;
};

// Utility types
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Query keys for React Query
export const QUERY_KEYS = {
  PROFILE: 'profile',
  PAYMENT: 'payment', 
  QR_CODE: 'qrcode',
  CHECKOUT: 'checkout',
} as const;

export type QueryKey = typeof QUERY_KEYS[keyof typeof QUERY_KEYS];

// API Response wrapper
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
  timestamp: string;
}

// Paginated response
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export {};