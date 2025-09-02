import { Payment } from '../../domain/entities/Payment.js';
import { MedicalProfile, CreateMedicalProfileProps } from '../../domain/entities/MedicalProfile.js';
import { PaymentStatus } from '../../domain/value-objects/PaymentStatus.js';
import { PaymentResult } from '../../domain/services/PaymentService.js';
import { IProfileService } from '../../domain/services/ProfileService.js';
import { IQRCodeService } from '../../domain/services/QRCodeService.js';
import { PaymentError } from '../../domain/errors/PaymentError.js';
import { ProfileError } from '../../domain/errors/ProfileError.js';
import { z } from 'zod';
import { MercadoPagoClient } from '../../infrastructure/mercadopago/MercadoPagoClient.js';
import { PaymentAmount } from '../../domain/value-objects/PaymentAmount.js';
import { PaymentMethod } from '../../domain/value-objects/PaymentMethod.js';
import { PaymentDescription } from '../../domain/value-objects/PaymentDescription.js';
import { IPaymentRepository } from '../../infrastructure/repositories/IPaymentRepository.js';

// Schema de validação para dados de entrada
const validatePaymentSchema = z.object({
  paymentId: z.string().min(1, 'ID do pagamento é obrigatório'),
  profileData: z.object({
    fullName: z.string(),
    cpf: z.string(),
    phone: z.string(),
    email: z.string().email(),
    bloodType: z.string(),
    emergencyContact: z.object({
      name: z.string(),
      phone: z.string(),
      relationship: z.string()
    }),
    medicalInfo: z.object({
      allergies: z.array(z.string()).optional(),
      medications: z.array(z.object({
        name: z.string(),
        dosage: z.string(),
        frequency: z.string()
      })).optional(),
      medicalConditions: z.array(z.string()).optional(),
      additionalNotes: z.string().optional()
    }).optional(),
    subscriptionPlan: z.enum(['basic', 'premium'])
  }).optional(),
  profileId: z.string().optional(),
  amount: z.number().positive(),
  subscriptionType: z.enum(['basic', 'premium']).optional()
});

type ValidatePaymentData = z.infer<typeof validatePaymentSchema>;

export interface ValidatePaymentUseCaseResult {
  payment: Payment;
  profile: MedicalProfile | null;
  paymentResult: PaymentResult;
  qrCodeGenerated: boolean;
  qrCodeUrl?: string;
}

export class ValidatePaymentUseCase {
  constructor(
    private readonly mercadoPagoClient: MercadoPagoClient,
    private readonly paymentRepository: IPaymentRepository,
    private readonly profileService: IProfileService,
    private readonly qrCodeService: IQRCodeService
  ) {}

  async execute(data: unknown): Promise<ValidatePaymentUseCaseResult> {
    try {
      // 1. Validar dados de entrada com Zod
      const validatedData = validatePaymentSchema.parse(data);
      const { paymentId, profileData, profileId, amount, subscriptionType } = validatedData;
      
      console.log('[ValidatePaymentUseCase] Iniciando validação:', {
        paymentId,
        hasProfileData: !!profileData,
        hasProfileId: !!profileId,
        amount
      });

      // 2. Buscar pagamento no MercadoPago (apenas consulta)
      console.log('[ValidatePaymentUseCase] Consultando pagamento no MercadoPago:', paymentId);
      const mpPayment = await this.mercadoPagoClient.getPaymentById(paymentId);
      
      if (!mpPayment) {
        throw new PaymentError(`Pagamento não encontrado no MercadoPago: ${paymentId}`);
      }

      console.log('[ValidatePaymentUseCase] Pagamento encontrado:', {
        id: mpPayment.id,
        status: mpPayment.status,
        status_detail: mpPayment.status_detail,
        amount: mpPayment.transaction_amount,
        payment_method_id: mpPayment.payment_method_id
      });

      // 3. Mapear status do pagamento
      const paymentStatus = this.mapMercadoPagoStatus(mpPayment.status);
      const isApproved = mpPayment.status === 'approved';
      const isPending = mpPayment.status === 'pending';
      
      // Para PIX, pending com QR Code é considerado sucesso parcial
      const isPixPendingWithQrCode = isPending && 
        !!mpPayment.point_of_interaction?.transaction_data?.qr_code;
      
      // Criar resultado do pagamento
      const paymentResult: PaymentResult = {
        success: isApproved || isPixPendingWithQrCode,
        paymentId: mpPayment.id,
        status: mpPayment.status,
        detail: mpPayment.status_detail,
        pixQrCode: mpPayment.point_of_interaction?.transaction_data?.qr_code,
        pixQrCodeBase64: mpPayment.point_of_interaction?.transaction_data?.qr_code_base64
      };

      // 4. Processar perfil e pagamento se aprovado
      let profile: MedicalProfile | null = null;
      let qrCodeGenerated = false;
      let qrCodeUrl: string | undefined;
      let savedPayment: Payment | null = null;
      
      if (isApproved) {
        console.log('[ValidatePaymentUseCase] Pagamento aprovado, processando dados...');
        
        // Se tem profileData (novo perfil), criar
        if (profileData && !profileId) {
          const profileProps: CreateMedicalProfileProps = {
            fullName: profileData.fullName,
            cpf: profileData.cpf,
            phone: profileData.phone,
            email: profileData.email,
            bloodType: profileData.bloodType || 'O+',
            emergencyContact: {
              name: profileData.emergencyContact.name,
              phone: profileData.emergencyContact.phone,
              relationship: profileData.emergencyContact.relationship
            },
            medicalInfo: profileData.medicalInfo ? {
              allergies: profileData.medicalInfo.allergies || [],
              medications: profileData.medicalInfo.medications?.map(med => 
                `${med.name} - ${med.dosage} - ${med.frequency}`
              ) || [],
              conditions: profileData.medicalInfo.medicalConditions || [],
              observations: profileData.medicalInfo.additionalNotes
            } : undefined,
            subscriptionPlan: profileData.subscriptionPlan
          };
          
          // Criar e salvar perfil
          profile = await this.profileService.createProfile(profileProps);
          console.log('[ValidatePaymentUseCase] Perfil criado:', profile.getId());
          
          // Gerar QR Code
          try {
            qrCodeUrl = await this.qrCodeService.generateQRCode(profile.getId());
            qrCodeGenerated = true;
            console.log('[ValidatePaymentUseCase] QR Code gerado com sucesso');
          } catch (error) {
            console.error('[ValidatePaymentUseCase] Erro ao gerar QR Code:', error);
          }
        } else if (profileId) {
          // Buscar perfil existente
          profile = await this.profileService.getProfileById(profileId);
          if (profile) {
            // Atualizar status do perfil
            profile.updatePaymentStatus(PaymentStatus.APPROVED);
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
        }
        
        // Salvar pagamento no banco usando o factory method
        const payment = Payment.create({
          profileId: profileId || profile?.getId() || 'unknown',
          amount: mpPayment.transaction_amount,
          paymentMethodId: mpPayment.payment_method_id,
          paymentMethod: mpPayment.payment_method_id,
          installments: 1,
          description: subscriptionType || 'basic'
        });
        
        payment.setMercadoPagoData(mpPayment.id, {
          qrCode: mpPayment.point_of_interaction?.transaction_data?.qr_code || '',
          qrCodeBase64: mpPayment.point_of_interaction?.transaction_data?.qr_code_base64 || ''
        });
        
        savedPayment = await this.paymentRepository.save(payment);
        console.log('[ValidatePaymentUseCase] Pagamento salvo no banco');
      }
      
      // IMPORTANTE: Se pagamento está pendente (PIX), NÃO salvar perfil!
      // Perfil será criado quando webhook confirmar pagamento

      return {
        payment: savedPayment || Payment.create({
          profileId: profileId || 'pending',
          amount: mpPayment.transaction_amount,
          paymentMethodId: mpPayment.payment_method_id,
          paymentMethod: mpPayment.payment_method_id,
          installments: 1,
          description: subscriptionType || 'basic'
        }),
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
      throw new PaymentError(`Falha ao validar pagamento: ${message}`);
    }
  }
  
  // Método auxiliar para mapear status do MercadoPago
  private mapMercadoPagoStatus(mpStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'pending': PaymentStatus.PENDING,
      'approved': PaymentStatus.APPROVED,
      'authorized': PaymentStatus.AUTHORIZED,
      'in_process': PaymentStatus.IN_PROCESS,
      'in_mediation': PaymentStatus.IN_MEDIATION,
      'rejected': PaymentStatus.REJECTED,
      'cancelled': PaymentStatus.CANCELLED,
      'refunded': PaymentStatus.REFUNDED,
      'charged_back': PaymentStatus.CHARGED_BACK
    };

    return statusMap[mpStatus] || PaymentStatus.PENDING;
  }

  // Método simplificado para obter status
  async getPaymentStatus(paymentId: string): Promise<{
    status: string;
    success: boolean;
  }> {
    try {
      const mpPayment = await this.mercadoPagoClient.getPaymentById(paymentId);
      return {
        status: mpPayment.status,
        success: mpPayment.status === 'approved'
      };
    } catch (error) {
      console.error('[ValidatePaymentUseCase] Erro ao obter status:', error);
      return {
        status: 'error',
        success: false
      };
    }
  }
}