import { DomainError } from './DomainError.js';

export class PaymentError extends DomainError {
  constructor(
    message: string,
    paymentId?: string,
    reason?: string,
    context?: Record<string, unknown>
  ) {
    const errorContext = {
      ...context,
      ...(paymentId && { paymentId }),
      ...(reason && { reason })
    };

    super(message, 'PAYMENT_ERROR', errorContext);
  }

  static notFound(paymentId: string): PaymentError {
    return new PaymentError(
      `Pagamento ${paymentId} não encontrado`,
      paymentId,
      'NOT_FOUND'
    );
  }

  static insufficientAmount(amount: number, minimumAmount: number): PaymentError {
    return new PaymentError(
      `Valor insuficiente. Mínimo: R$ ${minimumAmount.toFixed(2)}, fornecido: R$ ${amount.toFixed(2)}`,
      undefined,
      'INSUFFICIENT_AMOUNT',
      { amount, minimumAmount }
    );
  }

  static invalidPaymentMethod(method: string): PaymentError {
    return new PaymentError(
      `Método de pagamento inválido: ${method}`,
      undefined,
      'INVALID_PAYMENT_METHOD',
      { method }
    );
  }

  static processingFailed(paymentId: string, reason: string): PaymentError {
    return new PaymentError(
      `Falha ao processar pagamento: ${reason}`,
      paymentId,
      'PROCESSING_FAILED',
      { reason }
    );
  }

  static invalidTransition(from: string, to: string): PaymentError {
    return new PaymentError(
      `Transição de status inválida: ${from} -> ${to}`,
      undefined,
      'INVALID_STATUS_TRANSITION',
      { from, to }
    );
  }

  static expired(paymentId: string): PaymentError {
    return new PaymentError(
      'Pagamento expirado',
      paymentId,
      'EXPIRED'
    );
  }

  static alreadyProcessed(paymentId: string): PaymentError {
    return new PaymentError(
      'Pagamento já foi processado',
      paymentId,
      'ALREADY_PROCESSED'
    );
  }
}