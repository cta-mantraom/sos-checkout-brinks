import { BloodType, PhoneNumber, Email, CPF, PaymentStatus } from '../value-objects.js';
import { ValidationError, ProfileError } from '../errors.js';

export type SubscriptionPlan = 'basic' | 'premium';

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface MedicalInfo {
  allergies?: string[];
  medications?: string[];
  conditions?: string[];
  observations?: string;
}

export interface CreateMedicalProfileProps {
  fullName: string;
  cpf: string;
  phone: string;
  email: string;
  bloodType: string;
  emergencyContact: EmergencyContact;
  medicalInfo?: MedicalInfo;
  subscriptionPlan?: SubscriptionPlan;
}

export interface MedicalProfileDTO {
  id: string;
  fullName: string;
  cpf: string;
  phone: string;
  email: string;
  bloodType: string;
  emergencyContact: EmergencyContact;
  medicalInfo?: MedicalInfo;
  qrCodeUrl?: string;
  subscriptionPlan: SubscriptionPlan;
  paymentStatus: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export class MedicalProfile {
  private constructor(
    private readonly id: string,
    private readonly fullName: string,
    private readonly cpf: CPF,
    private readonly phone: PhoneNumber,
    private readonly email: Email,
    private readonly bloodType: BloodType,
    private readonly emergencyContact: EmergencyContact,
    private medicalInfo: MedicalInfo,
    private qrCodeUrl?: string,
    private subscriptionPlan: SubscriptionPlan = 'basic',
    private paymentStatus: PaymentStatus = PaymentStatus.PENDING,
    private isActive: boolean = false,
    private readonly createdAt: Date = new Date(),
    private updatedAt: Date = new Date(),
    private expiresAt?: Date
  ) {}

  static create(props: CreateMedicalProfileProps): MedicalProfile {
    // Validações de domínio
    if (!props.fullName || props.fullName.trim().length < 3) {
      throw ValidationError.minLength('fullName', 3, props.fullName?.length || 0);
    }

    if (props.fullName.trim().length > 100) {
      throw ValidationError.maxLength('fullName', 100, props.fullName.length);
    }

    if (!props.emergencyContact?.name || props.emergencyContact.name.trim().length < 3) {
      throw ValidationError.required('emergencyContact.name');
    }

    if (!props.emergencyContact?.phone) {
      throw ValidationError.required('emergencyContact.phone');
    }

    const id = this.generateId();
    const expirationDate = this.calculateExpirationDate(props.subscriptionPlan || 'basic');

    return new MedicalProfile(
      id,
      props.fullName.trim(),
      CPF.create(props.cpf),
      PhoneNumber.create(props.phone),
      Email.create(props.email),
      BloodType.create(props.bloodType),
      {
        ...props.emergencyContact,
        name: props.emergencyContact.name.trim(),
        phone: PhoneNumber.create(props.emergencyContact.phone).getValue()
      },
      props.medicalInfo || {},
      undefined,
      props.subscriptionPlan || 'basic',
      PaymentStatus.PENDING,
      false,
      new Date(),
      new Date(),
      expirationDate
    );
  }

  static fromDTO(dto: MedicalProfileDTO): MedicalProfile {
    return new MedicalProfile(
      dto.id,
      dto.fullName,
      CPF.create(dto.cpf),
      PhoneNumber.create(dto.phone),
      Email.create(dto.email),
      BloodType.create(dto.bloodType),
      dto.emergencyContact,
      dto.medicalInfo || {},
      dto.qrCodeUrl,
      dto.subscriptionPlan,
      PaymentStatus.create(dto.paymentStatus),
      dto.isActive,
      dto.createdAt,
      dto.updatedAt,
      dto.expiresAt
    );
  }

  private static generateId(): string {
    return `profile_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private static calculateExpirationDate(plan: SubscriptionPlan): Date {
    const now = new Date();
    const duration = plan === 'premium' ? 365 : 30; // Premium: 1 ano, Basic: 30 dias
    return new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
  }

  // Getters
  getId(): string {
    return this.id;
  }

  getFullName(): string {
    return this.fullName;
  }

  getCPF(): CPF {
    return this.cpf;
  }

  getPhone(): PhoneNumber {
    return this.phone;
  }

  getEmail(): Email {
    return this.email;
  }

  getBloodType(): BloodType {
    return this.bloodType;
  }

  getEmergencyContact(): EmergencyContact {
    return { ...this.emergencyContact };
  }

  getMedicalInfo(): MedicalInfo {
    return { ...this.medicalInfo };
  }

  getQRCodeUrl(): string | undefined {
    return this.qrCodeUrl;
  }

  getSubscriptionPlan(): SubscriptionPlan {
    return this.subscriptionPlan;
  }

  getPaymentStatus(): PaymentStatus {
    return this.paymentStatus;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getExpiresAt(): Date | undefined {
    return this.expiresAt;
  }

  // Business Logic Methods
  updatePaymentStatus(status: PaymentStatus): void {
    if (!this.paymentStatus.canTransitionTo(status)) {
      throw new ProfileError(
        `Transição de status inválida: ${this.paymentStatus.getValue()} -> ${status.getValue()}`,
        this.id,
        'INVALID_STATUS_TRANSITION'
      );
    }

    this.paymentStatus = status;
    this.updatedAt = new Date();

    // Ativar perfil quando pagamento aprovado
    if (status.isSuccessful()) {
      this.isActive = true;
    }
  }

  setQRCodeUrl(url: string): void {
    if (!this.canGenerateQRCode()) {
      throw new ProfileError(
        'Não é possível definir QR Code. Pagamento deve estar aprovado.',
        this.id,
        'PAYMENT_NOT_APPROVED'
      );
    }

    this.qrCodeUrl = url;
    this.updatedAt = new Date();
  }

  updateMedicalInfo(medicalInfo: Partial<MedicalInfo>): void {
    this.medicalInfo = {
      ...this.medicalInfo,
      ...medicalInfo
    };
    this.updatedAt = new Date();
  }

  upgradePlan(newPlan: SubscriptionPlan): void {
    if (this.subscriptionPlan === 'premium' && newPlan === 'basic') {
      throw new ProfileError(
        'Não é possível fazer downgrade do plano Premium para Basic',
        this.id,
        'INVALID_PLAN_CHANGE'
      );
    }

    if (this.subscriptionPlan === newPlan) {
      return; // Nada a fazer
    }

    this.subscriptionPlan = newPlan;
    this.expiresAt = MedicalProfile.calculateExpirationDate(newPlan);
    this.updatedAt = new Date();
  }

  renewSubscription(): void {
    this.expiresAt = MedicalProfile.calculateExpirationDate(this.subscriptionPlan);
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  // Validation Methods
  canGenerateQRCode(): boolean {
    return this.paymentStatus.isSuccessful() && this.isActive;
  }

  isSubscriptionExpired(): boolean {
    if (!this.expiresAt) return false;
    return this.expiresAt < new Date();
  }

  hasValidSubscription(): boolean {
    return this.isActive && !this.isSubscriptionExpired();
  }

  canAccessPremiumFeatures(): boolean {
    return this.subscriptionPlan === 'premium' && this.hasValidSubscription();
  }

  getDaysUntilExpiration(): number {
    if (!this.expiresAt) return -1;
    
    const now = new Date();
    const timeDiff = this.expiresAt.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  // Serialization
  toDTO(): MedicalProfileDTO {
    return {
      id: this.id,
      fullName: this.fullName,
      cpf: this.cpf.getValue(),
      phone: this.phone.getValue(),
      email: this.email.getValue(),
      bloodType: this.bloodType.getValue(),
      emergencyContact: this.emergencyContact,
      medicalInfo: this.medicalInfo,
      qrCodeUrl: this.qrCodeUrl,
      subscriptionPlan: this.subscriptionPlan,
      paymentStatus: this.paymentStatus.getValue(),
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      expiresAt: this.expiresAt
    };
  }
}