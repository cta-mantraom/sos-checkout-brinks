import { Payment } from '../entities/Payment.js';
import { PaymentStatus } from '../value-objects/PaymentStatus.js';
import { PaymentError } from '../errors/PaymentError.js';
import { IPaymentRepository } from '../../infrastructure/repositories/IPaymentRepository.js';

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  status: string;
  message?: string;
  detail?: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  boletoUrl?: string;
}

export interface MercadoPagoPaymentDetails {
  id: string;
  status: string;
  status_detail: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
}

export interface IMercadoPagoClient {
  createPayment(payment: Payment, payerEmail?: string): Promise<{
    id: string;
    status: string;
    status_detail: string;
    pixQrCode?: string;
    pixQrCodeBase64?: string;
    boletoUrl?: string;
  }>;
  
  validateWebhook(payload: unknown, headers: Record<string, string>): Promise<boolean>;
  getPaymentById(id: string): Promise<MercadoPagoPaymentDetails>;
}

export interface IPaymentService {
  processPayment(payment: Payment): Promise<PaymentResult>;
  validateWebhook(payload: unknown, headers: Record<string, string>): Promise<boolean>;
  updatePaymentStatus(id: string, status: PaymentStatus): Promise<void>;
  getPaymentById(id: string): Promise<Payment | null>;
  cancelPayment(id: string, reason?: string): Promise<void>;
  refundPayment(id: string): Promise<void>;
}

export class PaymentService implements IPaymentService {
  constructor(
    private readonly paymentRepository: IPaymentRepository,
    private readonly mercadoPagoClient: IMercadoPagoClient
  ) {}

  async processPayment(payment: Payment): Promise<PaymentResult> {
    try {
      // Validações de domínio
      if (!payment.canBeProcessed()) {
        throw PaymentError.processingFailed(
          payment.getId(), 
          'Pagamento não pode ser processado'
        );
      }

      // Verificar se pagamento já foi processado
      const existingPayment = await this.paymentRepository.findById(payment.getId());
      if (existingPayment && !existingPayment.isPending()) {
        throw PaymentError.alreadyProcessed(payment.getId());
      }

      // Salvar pagamento inicial no repositório (status PENDING)
      if (!existingPayment) {
        await this.paymentRepository.save(payment);
      }

      // Processar com MercadoPago
      const mpResult = await this.mercadoPagoClient.createPayment(payment);

      // Atualizar dados do pagamento
      payment.setMercadoPagoData(mpResult.id, {
        qrCode: mpResult.pixQrCode || '',
        qrCodeBase64: mpResult.pixQrCodeBase64 || ''
      });

      if (mpResult.boletoUrl) {
        payment.setBoletoUrl(mpResult.boletoUrl);
      }

      // Atualizar status baseado na resposta do MP
      const newStatus = this.mapMercadoPagoStatus(mpResult.status);
      
      // Só atualizar se o status for diferente do atual
      if (payment.getStatus().getValue() !== newStatus.getValue()) {
        payment.updateStatus(newStatus, mpResult.status_detail);
      }

      // Salvar no repositório
      await this.paymentRepository.update(payment);

      return {
        success: newStatus.isSuccessful(),
        paymentId: payment.getId(),
        status: mpResult.status,
        detail: mpResult.status_detail,
        pixQrCode: mpResult.pixQrCode,
        pixQrCodeBase64: mpResult.pixQrCodeBase64,
        boletoUrl: mpResult.boletoUrl
      };

    } catch (error) {
      if (error instanceof PaymentError) {
        throw error;
      }
      
      throw PaymentError.processingFailed(
        payment.getId(),
        error instanceof Error ? error.message : 'Erro desconhecido'
      );
    }
  }

  async validateWebhook(
    payload: unknown, 
    headers: Record<string, string>
  ): Promise<boolean> {
    try {
      return await this.mercadoPagoClient.validateWebhook(payload, headers);
    } catch (error) {
      console.error('Erro ao validar webhook:', error);
      return false;
    }
  }

  async updatePaymentStatus(
    id: string, 
    status: PaymentStatus
  ): Promise<void> {
    const payment = await this.paymentRepository.findById(id);
    
    if (!payment) {
      throw PaymentError.notFound(id);
    }

    payment.updateStatus(status);
    await this.paymentRepository.update(payment);
  }

  async getPaymentById(id: string): Promise<Payment | null> {
    return await this.paymentRepository.findById(id);
  }

  async getPaymentByExternalId(externalId: string): Promise<Payment | null> {
    return await this.paymentRepository.findByExternalId(externalId);
  }

  async cancelPayment(id: string, reason?: string): Promise<void> {
    const payment = await this.paymentRepository.findById(id);
    
    if (!payment) {
      throw PaymentError.notFound(id);
    }

    if (!payment.isPending()) {
      throw PaymentError.invalidTransition(
        payment.getStatus().getValue(),
        'cancelled'
      );
    }

    payment.updateStatus(PaymentStatus.CANCELLED, reason);
    await this.paymentRepository.update(payment);
  }

  async refundPayment(id: string): Promise<void> {
    const payment = await this.paymentRepository.findById(id);
    
    if (!payment) {
      throw PaymentError.notFound(id);
    }

    if (!payment.isSuccessful()) {
      throw PaymentError.invalidTransition(
        payment.getStatus().getValue(),
        'refunded'
      );
    }

    // Aqui você implementaria a lógica de estorno no MercadoPago
    // const refundResult = await this.mercadoPagoClient.refundPayment(payment.getMercadoPagoId(), amount);

    payment.updateStatus(PaymentStatus.REFUNDED, 'Estorno solicitado');
    await this.paymentRepository.update(payment);
  }

  // Métodos utilitários
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

  async getPaymentStats(profileId?: string): Promise<{
    total: number;
    successful: number;
    pending: number;
    failed: number;
    totalAmount: number;
  }> {
    let payments: Payment[];

    if (profileId) {
      payments = await this.paymentRepository.findByProfileId(profileId);
    } else {
      const result = await this.paymentRepository.findMany({ limit: 1000 }); // Limitar para evitar sobrecarga
      payments = result.payments;
    }

    const stats = {
      total: payments.length,
      successful: 0,
      pending: 0,
      failed: 0,
      totalAmount: 0
    };

    for (const payment of payments) {
      if (payment.isSuccessful()) {
        stats.successful++;
        stats.totalAmount += payment.getAmount();
      } else if (payment.isPending()) {
        stats.pending++;
      } else if (payment.isFailed()) {
        stats.failed++;
      }
    }

    return stats;
  }

  async getExpiredPayments(): Promise<Payment[]> {
    return await this.paymentRepository.findExpired();
  }

  async cleanupExpiredPayments(): Promise<number> {
    const expiredPayments = await this.getExpiredPayments();
    let cleanedCount = 0;

    for (const payment of expiredPayments) {
      if (payment.isPending()) {
        payment.updateStatus(PaymentStatus.CANCELLED, 'Pagamento expirado');
        await this.paymentRepository.update(payment);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}