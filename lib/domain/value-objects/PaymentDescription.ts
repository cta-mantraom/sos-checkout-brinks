import { ValidationError } from '../errors/ValidationError.js';

export type SubscriptionPlanType = 'basic' | 'premium';

export class PaymentDescription {
  private static readonly MAX_LENGTH = 255;
  private static readonly MIN_LENGTH = 3;

  private constructor(
    private readonly value: string,
    private readonly planType: SubscriptionPlanType
  ) {}

  static create(planType: string, customDescription?: string): PaymentDescription {
    // Validar plano
    if (!['basic', 'premium'].includes(planType)) {
      throw new ValidationError(`Tipo de plano inválido: ${planType}`);
    }

    const plan = planType as SubscriptionPlanType;
    let description: string;

    if (customDescription) {
      description = customDescription.trim();
      
      if (description.length < this.MIN_LENGTH) {
        throw new ValidationError(`Descrição deve ter pelo menos ${this.MIN_LENGTH} caracteres`);
      }
      
      if (description.length > this.MAX_LENGTH) {
        throw new ValidationError(`Descrição deve ter no máximo ${this.MAX_LENGTH} caracteres`);
      }
    } else {
      // Descrição padrão baseada no plano
      description = this.getDefaultDescription(plan);
    }

    return new PaymentDescription(description, plan);
  }

  static fromPlanType(planType: SubscriptionPlanType): PaymentDescription {
    return this.create(planType);
  }

  private static getDefaultDescription(planType: SubscriptionPlanType): string {
    const descriptions: Record<SubscriptionPlanType, string> = {
      'basic': 'QR Code Médico Básico - Dados essenciais para emergência',
      'premium': 'QR Code Médico Premium - Dados completos + funcionalidades avançadas'
    };

    return descriptions[planType];
  }

  getValue(): string {
    return this.value;
  }

  getPlanType(): SubscriptionPlanType {
    return this.planType;
  }

  isBasicPlan(): boolean {
    return this.planType === 'basic';
  }

  isPremiumPlan(): boolean {
    return this.planType === 'premium';
  }

  getExpectedAmount(): number {
    return this.planType === 'basic' ? 5.00 : 10.00;
  }

  getPlanDisplayName(): string {
    return this.planType === 'basic' ? 'Plano Básico' : 'Plano Premium';
  }

  getFullDescription(): string {
    const planName = this.getPlanDisplayName();
    const amount = `R$ ${this.getExpectedAmount().toFixed(2)}`;
    return `${planName} (${amount}) - ${this.value}`;
  }

  equals(other: PaymentDescription): boolean {
    return this.value === other.value && this.planType === other.planType;
  }

  toString(): string {
    return this.value;
  }
}