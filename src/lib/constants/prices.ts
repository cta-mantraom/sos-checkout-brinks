export const SUBSCRIPTION_PRICES = {
  basic: 5.0,
  premium: 10.0,
} as const;

export const PAYMENT_LIMITS = {
  MIN_AMOUNT: 5.0,
  MAX_AMOUNT: 10.0, // Valor máximo é R$ 10 (premium)
  MAX_INSTALLMENTS: 12,
} as const;

export const SUBSCRIPTION_DURATIONS = {
  basic: 30, // 30 dias
  premium: 365, // 365 dias (1 ano)
} as const;

export const PAYMENT_FEES = {
  PIX: 0.99, // Taxa fixa para PIX
  BOLETO: 3.49, // Taxa fixa para boleto
  CREDIT_CARD: 0.0399, // 3.99% + R$ 0,39
  DEBIT_CARD: 0.0299, // 2.99%
} as const;

export const TRIAL_PERIODS = {
  basic: 7, // 7 dias de trial
  premium: 14, // 14 dias de trial
} as const;
