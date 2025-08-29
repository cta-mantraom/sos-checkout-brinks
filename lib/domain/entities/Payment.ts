import { PaymentStatus } from '../value-objects.js';
import { ValidationError, PaymentError } from '../errors.js';

export type PaymentMethod = 'credit_card' | 'debit_card' | 'pix' | 'boleto';

export interface CreatePaymentProps {
  profileId: string;
  amount: number;
  paymentMethodId: string;
  paymentMethod: PaymentMethod;
  token?: string;
  installments?: number;
  description?: string;
}

export interface PaymentDTO {
  id: string;
  profileId: string;
  amount: number;
  paymentMethodId: string;
  paymentMethod: PaymentMethod;
  status: string;
  mercadoPagoId?: string;
  token?: string;
  installments: number;
  description?: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  boletoUrl?: string;
  failureReason?: string;
  processedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Payment {
  private static readonly MIN_AMOUNT = 5.00; // R$ 5,00
  private static readonly MAX_AMOUNT = 10000.00; // R$ 10.000,00
  private static readonly MAX_INSTALLMENTS = 12;

  private constructor(
    private readonly id: string,
    private readonly profileId: string,
    private readonly amount: number,
    private readonly paymentMethodId: string,
    private readonly paymentMethod: PaymentMethod,
    private status: PaymentStatus,
    private mercadoPagoId?: string,
    private readonly token?: string,
    private readonly installments: number = 1,
    private readonly description?: string,
    private pixQrCode?: string,
    private pixQrCodeBase64?: string,
    private boletoUrl?: string,
    private failureReason?: string,
    private processedAt?: Date,
    private expiresAt?: Date,
    private readonly createdAt: Date = new Date(),
    private updatedAt: Date = new Date()
  ) {}

  static create(props: CreatePaymentProps): Payment {
    // Validações de domínio
    if (props.amount < this.MIN_AMOUNT) {
      throw PaymentError.insufficientAmount(props.amount, this.MIN_AMOUNT);
    }

    if (props.amount > this.MAX_AMOUNT) {
      throw ValidationError.outOfRange('amount', this.MIN_AMOUNT, this.MAX_AMOUNT, props.amount);
    }

    if (!props.profileId || props.profileId.trim() === '') {
      throw ValidationError.required('profileId');
    }

    if (!props.paymentMethodId || props.paymentMethodId.trim() === '') {
      throw ValidationError.required('paymentMethodId');
    }

    if (props.installments && (props.installments < 1 || props.installments > this.MAX_INSTALLMENTS)) {
      throw ValidationError.outOfRange('installments', 1, this.MAX_INSTALLMENTS, props.installments);
    }

    // Validação específica por método de pagamento
    this.validatePaymentMethod(props.paymentMethod, props);

    const id = this.generateId();
    const expirationDate = this.calculateExpirationDate(props.paymentMethod);

    return new Payment(
      id,
      props.profileId.trim(),
      Math.round(props.amount * 100) / 100, // Arredonda para 2 casas decimais
      props.paymentMethodId.trim(),
      props.paymentMethod,
      PaymentStatus.PENDING,
      undefined,
      props.token,
      props.installments || 1,
      props.description?.trim(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      expirationDate,
      new Date(),
      new Date()
    );
  }

  static fromDTO(dto: PaymentDTO): Payment {
    return new Payment(
      dto.id,
      dto.profileId,
      dto.amount,
      dto.paymentMethodId,
      dto.paymentMethod,
      PaymentStatus.create(dto.status),
      dto.mercadoPagoId,
      dto.token,
      dto.installments,
      dto.description,
      dto.pixQrCode,
      dto.pixQrCodeBase64,
      dto.boletoUrl,
      dto.failureReason,
      dto.processedAt,
      dto.expiresAt,
      dto.createdAt,
      dto.updatedAt
    );
  }

  private static generateId(): string {
    return `payment_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private static calculateExpirationDate(paymentMethod: PaymentMethod): Date {
    const now = new Date();
    
    switch (paymentMethod) {
      case 'pix':
        return new Date(now.getTime() + 30 * 60 * 1000); // 30 minutos
      case 'boleto':
        return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 dias
      case 'credit_card':
      case 'debit_card':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 horas
      default:
        return new Date(now.getTime() + 60 * 60 * 1000); // 1 hora
    }
  }

  private static validatePaymentMethod(method: PaymentMethod, props: CreatePaymentProps): void {
    switch (method) {
      case 'credit_card':
      case 'debit_card':
        if (!props.token) {
          throw ValidationError.required('token para pagamento com cartão');
        }
        break;
      case 'pix':
        // PIX não precisa de token nem parcelas
        if (props.installments && props.installments > 1) {
          throw ValidationError.invalid('installments', props.installments, 'PIX não aceita parcelamento');
        }
        break;
      case 'boleto':
        // Boleto não aceita parcelamento
        if (props.installments && props.installments > 1) {
          throw ValidationError.invalid('installments', props.installments, 'Boleto não aceita parcelamento');
        }
        break;
      default:
        throw PaymentError.invalidPaymentMethod(method);
    }
  }

  // Getters
  getId(): string {
    return this.id;
  }

  getProfileId(): string {
    return this.profileId;
  }

  getExternalId(): string | undefined {
    return this.mercadoPagoId;
  }

  getAmount(): number {
    return this.amount;
  }

  getPaymentMethodId(): string {
    return this.paymentMethodId;
  }

  getPaymentMethod(): PaymentMethod {
    return this.paymentMethod;
  }

  getStatus(): PaymentStatus {
    return this.status;
  }

  getMercadoPagoId(): string | undefined {
    return this.mercadoPagoId;
  }

  getToken(): string | undefined {
    return this.token;
  }

  getInstallments(): number {
    return this.installments;
  }

  getDescription(): string | undefined {
    return this.description;
  }

  getPixQrCode(): string | undefined {
    return this.pixQrCode;
  }

  getPixQrCodeBase64(): string | undefined {
    return this.pixQrCodeBase64;
  }

  getBoletoUrl(): string | undefined {
    return this.boletoUrl;
  }

  getFailureReason(): string | undefined {
    return this.failureReason;
  }

  getProcessedAt(): Date | undefined {
    return this.processedAt;
  }

  getExpiresAt(): Date | undefined {
    return this.expiresAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // Business Logic Methods
  updateStatus(newStatus: PaymentStatus, reason?: string): void {
    if (!this.status.canTransitionTo(newStatus)) {
      throw PaymentError.invalidTransition(this.status.getValue(), newStatus.getValue());
    }

    this.status = newStatus;
    this.updatedAt = new Date();

    if (newStatus.isSuccessful()) {
      this.processedAt = new Date();
    }

    if (newStatus.isFailed() && reason) {
      this.failureReason = reason;
    }
  }

  setMercadoPagoData(mercadoPagoId: string, pixData?: { qrCode: string; qrCodeBase64: string }): void {
    this.mercadoPagoId = mercadoPagoId;
    
    if (this.paymentMethod === 'pix' && pixData) {
      this.pixQrCode = pixData.qrCode;
      this.pixQrCodeBase64 = pixData.qrCodeBase64;
    }
    
    this.updatedAt = new Date();
  }

  setBoletoUrl(url: string): void {
    if (this.paymentMethod !== 'boleto') {
      throw ValidationError.invalid('boletoUrl', url, 'Apenas pagamentos por boleto podem ter URL de boleto');
    }
    
    this.boletoUrl = url;
    this.updatedAt = new Date();
  }

  // Validation Methods
  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return this.expiresAt < new Date();
  }

  isPending(): boolean {
    return this.status.isPending();
  }

  isSuccessful(): boolean {
    return this.status.isSuccessful();
  }

  isFailed(): boolean {
    return this.status.isFailed();
  }

  canBeProcessed(): boolean {
    return this.status.isPending() && !this.isExpired();
  }

  requiresManualConfirmation(): boolean {
    return ['pix', 'boleto'].includes(this.paymentMethod);
  }

  getInstallmentAmount(): number {
    return Math.round((this.amount / this.installments) * 100) / 100;
  }

  getTotalAmountWithInterest(): number {
    // Juros simples para parcelamento no cartão
    if (this.paymentMethod === 'credit_card' && this.installments > 1) {
      const interestRate = 0.02; // 2% ao mês
      const interest = this.amount * interestRate * (this.installments - 1);
      return Math.round((this.amount + interest) * 100) / 100;
    }
    return this.amount;
  }

  getTimeUntilExpiration(): number {
    if (!this.expiresAt) return -1;
    
    const now = new Date();
    const timeDiff = this.expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(timeDiff / (1000 * 60))); // Minutos até expirar
  }

  // Serialization
  toDTO(): PaymentDTO {
    return {
      id: this.id,
      profileId: this.profileId,
      amount: this.amount,
      paymentMethodId: this.paymentMethodId,
      paymentMethod: this.paymentMethod,
      status: this.status.getValue(),
      mercadoPagoId: this.mercadoPagoId,
      token: this.token,
      installments: this.installments,
      description: this.description,
      pixQrCode: this.pixQrCode,
      pixQrCodeBase64: this.pixQrCodeBase64,
      boletoUrl: this.boletoUrl,
      failureReason: this.failureReason,
      processedAt: this.processedAt,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

}