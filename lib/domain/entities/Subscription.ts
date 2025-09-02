import { ValidationError } from "../errors.js";

export type SubscriptionStatus =
  | "active"
  | "expired"
  | "cancelled"
  | "suspended";
export type SubscriptionPlan = "basic" | "premium";

export interface CreateSubscriptionProps {
  profileId: string;
  plan: SubscriptionPlan;
  paymentId?: string;
}

export interface SubscriptionDTO {
  id: string;
  profileId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  paymentId?: string;
  startDate: Date;
  endDate: Date;
  renewalDate?: Date;
  cancelledAt?: Date;
  suspendedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Subscription {
  private static readonly PLAN_DURATIONS: Record<SubscriptionPlan, number> = {
    basic: 30, // 30 dias
    premium: 365, // 365 dias (1 ano)
  };

  private static readonly PLAN_PRICES: Record<SubscriptionPlan, number> = {
    basic: 5.0, // R$ 5,00
    premium: 5.0, // R$ 5,00
  };

  private constructor(
    private readonly id: string,
    private readonly profileId: string,
    private readonly plan: SubscriptionPlan,
    private status: SubscriptionStatus,
    private readonly paymentId: string | undefined,
    private readonly startDate: Date,
    private endDate: Date,
    private renewalDate: Date | undefined,
    private cancelledAt: Date | undefined,
    private suspendedAt: Date | undefined,
    private readonly createdAt: Date,
    private updatedAt: Date
  ) {}

  static create(props: CreateSubscriptionProps): Subscription {
    if (!props.profileId || props.profileId.trim() === "") {
      throw ValidationError.required("profileId");
    }

    const id = this.generateId();
    const now = new Date();
    const duration = this.PLAN_DURATIONS[props.plan];
    const endDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
    const renewalDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 dias antes

    return new Subscription(
      id,
      props.profileId.trim(),
      props.plan,
      "active",
      props.paymentId,
      now,
      endDate,
      renewalDate,
      undefined,
      undefined,
      now,
      now
    );
  }

  static fromDTO(dto: SubscriptionDTO): Subscription {
    return new Subscription(
      dto.id,
      dto.profileId,
      dto.plan,
      dto.status,
      dto.paymentId,
      dto.startDate,
      dto.endDate,
      dto.renewalDate,
      dto.cancelledAt,
      dto.suspendedAt,
      dto.createdAt,
      dto.updatedAt
    );
  }

  private static generateId(): string {
    return `subscription_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;
  }

  // Getters
  getId(): string {
    return this.id;
  }

  getProfileId(): string {
    return this.profileId;
  }

  getPlan(): SubscriptionPlan {
    return this.plan;
  }

  getStatus(): SubscriptionStatus {
    return this.status;
  }

  getPaymentId(): string | undefined {
    return this.paymentId;
  }

  getStartDate(): Date {
    return this.startDate;
  }

  getEndDate(): Date {
    return this.endDate;
  }

  getRenewalDate(): Date | undefined {
    return this.renewalDate;
  }

  getCancelledAt(): Date | undefined {
    return this.cancelledAt;
  }

  getSuspendedAt(): Date | undefined {
    return this.suspendedAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // Business Logic Methods
  renew(newPaymentId?: string): void {
    if (this.status === "cancelled") {
      throw new ValidationError(
        "Não é possível renovar uma assinatura cancelada"
      );
    }

    const duration = Subscription.PLAN_DURATIONS[this.plan];
    const now = new Date();

    this.endDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
    this.renewalDate = new Date(
      this.endDate.getTime() - 7 * 24 * 60 * 60 * 1000
    );
    this.status = "active";
    this.suspendedAt = undefined;
    this.updatedAt = now;

    if (newPaymentId) {
      // Note: paymentId é readonly, mas para renovação poderíamos considerar
      // criar uma nova subscription ou adicionar um array de paymentIds
    }
  }

  cancel(): void {
    if (this.status === "cancelled") {
      return; // Já está cancelada
    }

    this.status = "cancelled";
    this.cancelledAt = new Date();
    this.updatedAt = new Date();
  }

  suspend(): void {
    if (this.status !== "active") {
      throw new ValidationError(
        "Apenas assinaturas ativas podem ser suspensas"
      );
    }

    this.status = "suspended";
    this.suspendedAt = new Date();
    this.updatedAt = new Date();
  }

  reactivate(): void {
    if (this.status !== "suspended") {
      throw new ValidationError(
        "Apenas assinaturas suspensas podem ser reativadas"
      );
    }

    if (this.isExpired()) {
      throw new ValidationError(
        "Não é possível reativar uma assinatura expirada"
      );
    }

    this.status = "active";
    this.suspendedAt = undefined;
    this.updatedAt = new Date();
  }

  checkAndUpdateExpiration(): boolean {
    if (this.status === "active" && this.isExpired()) {
      this.status = "expired";
      this.updatedAt = new Date();
      return true;
    }
    return false;
  }

  // Validation Methods
  isActive(): boolean {
    return this.status === "active" && !this.isExpired();
  }

  isExpired(): boolean {
    return this.endDate < new Date();
  }

  isCancelled(): boolean {
    return this.status === "cancelled";
  }

  isSuspended(): boolean {
    return this.status === "suspended";
  }

  isNearRenewal(): boolean {
    if (!this.renewalDate) return false;
    return this.renewalDate <= new Date();
  }

  getDaysRemaining(): number {
    const now = new Date();
    const timeDiff = this.endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
  }

  getDaysUntilRenewal(): number {
    if (!this.renewalDate) return -1;

    const now = new Date();
    const timeDiff = this.renewalDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
  }

  getPrice(): number {
    return Subscription.PLAN_PRICES[this.plan];
  }

  canUpgrade(): boolean {
    return this.plan === "basic" && this.isActive();
  }

  canDowngrade(): boolean {
    return this.plan === "premium" && this.isActive();
  }

  getPlanFeatures(): string[] {
    const features = {
      basic: [
        "QR Code médico básico",
        "Informações de emergência",
        "Suporte por email",
        "Validade de 30 dias",
      ],
      premium: [
        "QR Code médico completo",
        "Informações médicas detalhadas",
        "Histórico de medicamentos",
        "Contatos de emergência múltiplos",
        "Suporte prioritário 24/7",
        "Backup automático",
        "Validade de 1 ano",
      ],
    };

    return features[this.plan];
  }

  // Static Methods
  static getPlanPrice(plan: SubscriptionPlan): number {
    return this.PLAN_PRICES[plan];
  }

  static getPlanDuration(plan: SubscriptionPlan): number {
    return this.PLAN_DURATIONS[plan];
  }

  static getAllPlans(): SubscriptionPlan[] {
    return Object.keys(this.PLAN_PRICES) as SubscriptionPlan[];
  }

  // Serialization
  toDTO(): SubscriptionDTO {
    return {
      id: this.id,
      profileId: this.profileId,
      plan: this.plan,
      status: this.status,
      paymentId: this.paymentId,
      startDate: this.startDate,
      endDate: this.endDate,
      renewalDate: this.renewalDate,
      cancelledAt: this.cancelledAt,
      suspendedAt: this.suspendedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
