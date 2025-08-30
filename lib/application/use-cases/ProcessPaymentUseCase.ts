import { Payment } from '../../domain/entities/Payment.js';
import { MedicalProfile } from '../../domain/entities/MedicalProfile.js';
import { PaymentStatus } from '../../domain/value-objects/PaymentStatus.js';
import { IPaymentService, PaymentResult } from '../../domain/services/PaymentService.js';
import { IProfileService } from '../../domain/services/ProfileService.js';
import { IQRCodeService } from '../../domain/services/QRCodeService.js';
import { PaymentDTO, CreatePaymentData } from '../dto/PaymentDTO.js';
import { PaymentError } from '../../domain/errors/PaymentError.js';
import { ProfileError } from '../../domain/errors/ProfileError.js';

export interface ProcessPaymentUseCaseResult {
  payment: Payment;
  profile: MedicalProfile;
  paymentResult: PaymentResult;
  qrCodeGenerated: boolean;
  qrCodeUrl?: string;
}

export class ProcessPaymentUseCase {
  constructor(
    private readonly paymentService: IPaymentService,
    private readonly profileService: IProfileService,
    private readonly qrCodeService: IQRCodeService
  ) {}

  async execute(data: unknown): Promise<ProcessPaymentUseCaseResult> {
    try {
      // 1. Validar dados do pagamento
      const validatedData: CreatePaymentData = PaymentDTO.validateAndClean(data);

      // 2. Buscar perfil
      const profile = await this.profileService.getProfileById(validatedData.profileId);
      if (!profile) {
        throw ProfileError.notFound(validatedData.profileId);
      }

      // 3. Verificar se o perfil pode receber pagamentos
      if (profile.getPaymentStatus().isSuccessful()) {
        throw PaymentError.alreadyProcessed(validatedData.profileId);
      }

      // 4. Criar entidade de pagamento
      const payment = Payment.create({
        profileId: validatedData.profileId,
        amount: validatedData.amount,
        paymentMethodId: validatedData.paymentMethodId,
        paymentMethod: validatedData.paymentMethod,
        token: validatedData.token,
        installments: validatedData.installments,
        description: validatedData.description || `Assinatura ${profile.getSubscriptionPlan()}`
      });

      // 5. Processar pagamento com dados do perfil
      const paymentResult = await this.paymentService.processPayment(payment, {
        email: profile.getEmail().getValue(),
        cpf: profile.getCPF().getValue()
      });

      // 6. Atualizar status do perfil se pagamento aprovado
      let qrCodeGenerated = false;
      let qrCodeUrl: string | undefined;

      // Só atualizar perfil como APPROVED se o pagamento realmente foi aprovado
      // Para PIX pending, NÃO atualizar ainda (será atualizado via webhook)
      const isReallyApproved = paymentResult.status === 'approved';
      
      if (isReallyApproved) {
        // Atualizar status do perfil
        const newStatus = PaymentStatus.APPROVED;
        profile.updatePaymentStatus(newStatus);
        
        // Atualizar o perfil no repositório através do serviço
        await this.profileService.updateProfile(profile.getId(), {
          fullName: profile.getFullName(),
          cpf: profile.getCPF().getValue(),
          phone: profile.getPhone().getValue(),
          email: profile.getEmail().getValue(),
          bloodType: profile.getBloodType().getValue(),
          emergencyContact: profile.getEmergencyContact(),
          medicalInfo: profile.getMedicalInfo(),
          subscriptionPlan: profile.getSubscriptionPlan()
        });
      }
      
      // 7. Gerar QR Code do perfil médico se pagamento aprovado OU PIX com sucesso
      if (isReallyApproved || paymentResult.success) {
        try {
          qrCodeUrl = await this.qrCodeService.generateQRCode(profile.getId());
          qrCodeGenerated = true;
        } catch (error) {
          console.error('Erro ao gerar QR Code:', error);
          // Não falhar o pagamento se QR Code falhar
          qrCodeGenerated = false;
        }
      }

      return {
        payment,
        profile,
        paymentResult,
        qrCodeGenerated,
        qrCodeUrl
      };

    } catch (error) {
      if (error instanceof PaymentError || error instanceof ProfileError) {
        throw error;
      }
      
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new PaymentError(`Falha ao processar pagamento: ${message}`);
    }
  }

  async validatePaymentData(data: unknown): Promise<{
    valid: boolean;
    errors: string[];
    requirements?: {
      requiresToken: boolean;
      allowsInstallments: boolean;
      maxInstallments: number;
    };
  }> {
    try {
      const validatedData = PaymentDTO.validateAndClean(data);
      
      const requirements = PaymentDTO.getPaymentMethodRequirements(validatedData.paymentMethod);
      
      return {
        valid: true,
        errors: [],
        requirements: {
          requiresToken: requirements.requiresToken,
          allowsInstallments: requirements.allowsInstallments,
          maxInstallments: requirements.maxInstallments
        }
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Erro de validação']
      };
    }
  }

  async calculatePaymentDetails(amount: number, installments: number, method: string): Promise<{
    installmentAmount: number;
    totalAmount: number;
    interestAmount: number;
    hasInterest: boolean;
  }> {
    const installmentAmount = PaymentDTO.calculateInstallmentAmount(amount, installments);
    const totalAmount = PaymentDTO.calculateTotalWithInterest(amount, installments, method);
    const interestAmount = totalAmount - amount;
    const hasInterest = interestAmount > 0;

    return {
      installmentAmount,
      totalAmount,
      interestAmount,
      hasInterest
    };
  }

  async getPaymentStatus(paymentId: string): Promise<{
    payment: Payment | null;
    status: string;
    canRetry: boolean;
    expiresIn?: number; // minutos
  }> {
    const payment = await this.paymentService.getPaymentById(paymentId);
    
    if (!payment) {
      return {
        payment: null,
        status: 'not_found',
        canRetry: false
      };
    }

    const status = payment.getStatus().getValue();
    const canRetry = payment.isFailed() || (payment.isPending() && payment.isExpired());
    const expiresIn = payment.getTimeUntilExpiration();

    return {
      payment,
      status,
      canRetry,
      expiresIn: expiresIn > 0 ? expiresIn : undefined
    };
  }

  async retryPayment(originalPaymentId: string, newPaymentData: unknown): Promise<ProcessPaymentUseCaseResult> {
    // Buscar pagamento original
    const originalPayment = await this.paymentService.getPaymentById(originalPaymentId);
    
    if (!originalPayment) {
      throw PaymentError.notFound(originalPaymentId);
    }

    // Verificar se pode tentar novamente
    if (!originalPayment.isFailed() && !originalPayment.isExpired()) {
      throw PaymentError.invalidTransition(
        originalPayment.getStatus().getValue(),
        'retry'
      );
    }

    // Cancelar pagamento original se ainda estiver pendente
    if (originalPayment.isPending()) {
      await this.paymentService.cancelPayment(originalPaymentId, 'Tentativa de retry');
    }

    // Processar novo pagamento
    return await this.execute(newPaymentData);
  }
}