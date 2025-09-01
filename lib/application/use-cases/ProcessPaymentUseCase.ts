import { Payment } from '../../domain/entities/Payment.js';
import { MedicalProfile, CreateMedicalProfileProps } from '../../domain/entities/MedicalProfile.js';
import { PaymentStatus } from '../../domain/value-objects/PaymentStatus.js';
import { IPaymentService, PaymentResult } from '../../domain/services/PaymentService.js';
import { IProfileService } from '../../domain/services/ProfileService.js';
import { IQRCodeService } from '../../domain/services/QRCodeService.js';
import { PaymentDTO, CreatePaymentData } from '../dto/PaymentDTO.js';
import { PaymentWithProfileDTO, PaymentWithProfileData } from '../dto/PaymentWithProfileDTO.js';
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
      // 1. Tentar validar como PaymentWithProfile (novo fluxo)
      let validatedData: PaymentWithProfileData | CreatePaymentData;
      let isNewFlow = false;
      
      try {
        validatedData = PaymentWithProfileDTO.validateAndClean(data);
        isNewFlow = PaymentWithProfileDTO.hasProfileData(validatedData as PaymentWithProfileData);
      } catch {
        // Fallback para o fluxo antigo (com profileId)
        validatedData = PaymentDTO.validateAndClean(data);
        isNewFlow = false;
      }

      // 2. Obter ou criar perfil temporário
      let profile: MedicalProfile;
      let profileId: string;
      
      if (isNewFlow && PaymentWithProfileDTO.hasProfileData(validatedData as PaymentWithProfileData)) {
        // NOVO FLUXO: Criar perfil temporário (NÃO salvar no banco ainda!)
        const paymentData = validatedData as PaymentWithProfileData;
        const profileProps: CreateMedicalProfileProps = {
          fullName: paymentData.profileData.fullName,
          cpf: paymentData.profileData.cpf,
          phone: paymentData.profileData.phone,
          email: paymentData.profileData.email,
          bloodType: paymentData.profileData.bloodType || 'O+',
          emergencyContact: {
            name: paymentData.profileData.emergencyContact?.name || 'Não informado',
            phone: paymentData.profileData.emergencyContact?.phone || '00000000000',
            relationship: paymentData.profileData.emergencyContact?.relationship || 'Não informado'
          },
          medicalInfo: paymentData.profileData.medicalInfo ? {
            allergies: paymentData.profileData.medicalInfo.allergies,
            medications: paymentData.profileData.medicalInfo.medications?.map(med => 
              `${med.name} - ${med.dosage} - ${med.frequency}`
            ) || [],
            conditions: paymentData.profileData.medicalInfo.medicalConditions,
            observations: paymentData.profileData.medicalInfo.additionalNotes
          } : undefined,
          subscriptionPlan: paymentData.profileData.subscriptionPlan
        };
        
        // Criar perfil temporário (não salvo)
        profile = MedicalProfile.create(profileProps);
        profileId = profile.getId();
        
        // IMPORTANTE: NÃO salvar perfil no banco aqui!
        // Perfil só será salvo quando webhook confirmar pagamento
        
      } else {
        // FLUXO ANTIGO: Buscar perfil existente (para compatibilidade)
        const paymentData = validatedData as CreatePaymentData;
        profileId = paymentData.profileId;
        
        const existingProfile = await this.profileService.getProfileById(profileId);
        if (!existingProfile) {
          throw ProfileError.notFound(profileId);
        }
        profile = existingProfile;
        
        // Verificar se o perfil pode receber pagamentos
        if (profile.getPaymentStatus().isSuccessful()) {
          throw PaymentError.alreadyProcessed(profileId);
        }
      }

      // 3. Criar entidade de pagamento
      const paymentAmount = isNewFlow ? 
        (validatedData as PaymentWithProfileData).amount : 
        (validatedData as CreatePaymentData).amount;
      
      const paymentMethodId = isNewFlow ? 
        (validatedData as PaymentWithProfileData).paymentMethodId : 
        (validatedData as CreatePaymentData).paymentMethodId;
        
      const paymentMethod = isNewFlow ? 
        (validatedData as PaymentWithProfileData).paymentMethod : 
        (validatedData as CreatePaymentData).paymentMethod;
        
        
      const installments = isNewFlow ? 
        (validatedData as PaymentWithProfileData).installments : 
        (validatedData as CreatePaymentData).installments;
        
      const description = isNewFlow ? 
        (validatedData as PaymentWithProfileData).description : 
        (validatedData as CreatePaymentData).description;
      
      const payment = Payment.create({
        profileId: profileId,
        amount: paymentAmount,
        paymentMethodId: paymentMethodId,
        paymentMethod: paymentMethod,
        installments: installments || 1,
        description: description || `Assinatura ${profile.getSubscriptionPlan()}`
      });

      // 4. Processar pagamento com dados do perfil
      // Se é novo fluxo, incluir dados do perfil nos metadados do pagamento
      const metadata = isNewFlow && PaymentWithProfileDTO.hasProfileData(validatedData as PaymentWithProfileData) ? {
        profileData: JSON.stringify((validatedData as PaymentWithProfileData).profileData),
        temporaryProfileId: profileId,
        isNewFlow: 'true'
      } : undefined;
      
      const paymentResult = await this.paymentService.processPayment(payment, {
        email: profile.getEmail().getValue(),
        cpf: profile.getCPF().getValue()
      }, metadata);

      // 5. Processar resultado do pagamento
      let qrCodeGenerated = false;
      let qrCodeUrl: string | undefined;

      // Só atualizar perfil como APPROVED se o pagamento realmente foi aprovado
      // Para PIX pending, NÃO atualizar ainda (será atualizado via webhook)
      const isReallyApproved = paymentResult.status === 'approved';
      
      if (isReallyApproved) {
        if (isNewFlow) {
          // NOVO FLUXO: Salvar perfil agora que o pagamento foi aprovado
          await this.profileService.createProfile({
            fullName: profile.getFullName(),
            cpf: profile.getCPF().getValue(),
            phone: profile.getPhone().getValue(),
            email: profile.getEmail().getValue(),
            bloodType: profile.getBloodType().getValue(),
            emergencyContact: profile.getEmergencyContact(),
            medicalInfo: profile.getMedicalInfo(),
            subscriptionPlan: profile.getSubscriptionPlan()
          });
          
          // Atualizar status do perfil
          profile.updatePaymentStatus(PaymentStatus.APPROVED);
          
        } else {
          // FLUXO ANTIGO: Atualizar perfil existente
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
        
        // Gerar QR Code do perfil médico
        try {
          qrCodeUrl = await this.qrCodeService.generateQRCode(profile.getId());
          qrCodeGenerated = true;
        } catch (error) {
          console.error('Erro ao gerar QR Code médico:', error);
          // Não falhar o pagamento se QR Code falhar
          qrCodeGenerated = false;
        }
      }
      // IMPORTANTE: Se pagamento está pendente (PIX), NÃO salvar perfil!
      // Perfil será criado quando webhook confirmar pagamento

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
      allowsInstallments: boolean;
      maxInstallments: number;
      description: string;
    };
  }> {
    try {
      const validatedData = PaymentDTO.validateAndClean(data);
      
      const requirements = PaymentDTO.getPaymentMethodRequirements(validatedData.paymentMethod);
      
      return {
        valid: true,
        errors: [],
        requirements: {
          allowsInstallments: requirements.allowsInstallments,
          maxInstallments: requirements.maxInstallments,
          description: requirements.description
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