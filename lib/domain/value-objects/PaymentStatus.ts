import { ValidationError } from '../errors/ValidationError.js';

export type PaymentStatusValue = 
  | 'pending'      // Aguardando pagamento
  | 'approved'     // Pagamento aprovado
  | 'authorized'   // Pagamento autorizado (cartão)
  | 'in_process'   // Em processamento
  | 'in_mediation' // Em mediação
  | 'rejected'     // Rejeitado
  | 'cancelled'    // Cancelado
  | 'refunded'     // Estornado
  | 'charged_back'; // Chargeback

export class PaymentStatus {
  private static readonly VALID_STATUSES: PaymentStatusValue[] = [
    'pending', 'approved', 'authorized', 'in_process', 
    'in_mediation', 'rejected', 'cancelled', 'refunded', 'charged_back'
  ];

  public static readonly PENDING = new PaymentStatus('pending');
  public static readonly APPROVED = new PaymentStatus('approved');
  public static readonly AUTHORIZED = new PaymentStatus('authorized');
  public static readonly IN_PROCESS = new PaymentStatus('in_process');
  public static readonly IN_MEDIATION = new PaymentStatus('in_mediation');
  public static readonly REJECTED = new PaymentStatus('rejected');
  public static readonly CANCELLED = new PaymentStatus('cancelled');
  public static readonly REFUNDED = new PaymentStatus('refunded');
  public static readonly CHARGED_BACK = new PaymentStatus('charged_back');

  private constructor(private readonly value: PaymentStatusValue) {}

  static create(value: string): PaymentStatus {
    if (!this.VALID_STATUSES.includes(value as PaymentStatusValue)) {
      throw new ValidationError(`Status de pagamento inválido: ${value}`);
    }
    
    return new PaymentStatus(value as PaymentStatusValue);
  }

  getValue(): PaymentStatusValue {
    return this.value;
  }

  isSuccessful(): boolean {
    return this.value === 'approved' || this.value === 'authorized';
  }

  isPending(): boolean {
    return this.value === 'pending' || this.value === 'in_process';
  }

  isFailed(): boolean {
    return this.value === 'rejected' || this.value === 'cancelled';
  }

  isRefunded(): boolean {
    return this.value === 'refunded' || this.value === 'charged_back';
  }

  canTransitionTo(newStatus: PaymentStatus): boolean {
    const transitions: Record<PaymentStatusValue, PaymentStatusValue[]> = {
      'pending': ['approved', 'authorized', 'in_process', 'rejected', 'cancelled'],
      'approved': ['refunded', 'charged_back'],
      'authorized': ['approved', 'rejected', 'cancelled'],
      'in_process': ['approved', 'authorized', 'rejected', 'in_mediation'],
      'in_mediation': ['approved', 'rejected'],
      'rejected': [],
      'cancelled': [],
      'refunded': [],
      'charged_back': []
    };

    return transitions[this.value].includes(newStatus.getValue());
  }

  getDisplayName(): string {
    const names: Record<PaymentStatusValue, string> = {
      'pending': 'Aguardando Pagamento',
      'approved': 'Aprovado',
      'authorized': 'Autorizado',
      'in_process': 'Em Processamento',
      'in_mediation': 'Em Mediação',
      'rejected': 'Rejeitado',
      'cancelled': 'Cancelado',
      'refunded': 'Estornado',
      'charged_back': 'Chargeback'
    };

    return names[this.value];
  }

  equals(other: PaymentStatus): boolean {
    return this.value === other.value;
  }
}