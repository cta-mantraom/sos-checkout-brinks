import { Payment, PaymentDTO } from '../../domain/entities/Payment.js';
import { IPaymentRepository } from './IPaymentRepository.js';
import { FirestoreClient } from '../firebase/FirestoreClient.js';
import { z } from 'zod';

// Schema Zod para validação de dados Firestore
const FirestorePaymentSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  amount: z.number(),
  paymentMethodId: z.string(),
  paymentMethod: z.enum(['credit_card', 'debit_card', 'pix', 'boleto']),
  status: z.string(),
  mercadoPagoId: z.string().optional(),
  token: z.string().optional(),
  installments: z.number(),
  description: z.string().optional(),
  pixQrCode: z.string().optional(),
  pixQrCodeBase64: z.string().optional(),
  boletoUrl: z.string().optional(),
  failureReason: z.string().optional(),
  processedAt: z.date().optional(),
  expiresAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Type guard com Zod
function validatePaymentData(data: unknown): PaymentDTO {
  const validated = FirestorePaymentSchema.parse(data);
  return validated as PaymentDTO;
}

export class FirebasePaymentRepository implements IPaymentRepository {
  private readonly collection = 'payments';

  constructor(private readonly firestoreClient: FirestoreClient) {}

  async save(payment: Payment): Promise<void> {
    const data = payment.toDTO();
    await this.firestoreClient.create(this.collection, data, data.id);
  }

  async findById(id: string): Promise<Payment | null> {
    const data = await this.firestoreClient.findById(this.collection, id);
    
    if (!data) {
      return null;
    }

    const validatedData = validatePaymentData(data);
    return Payment.fromDTO(validatedData);
  }

  async findByMercadoPagoId(mercadoPagoId: string): Promise<Payment | null> {
    const data = await this.firestoreClient.findOne(this.collection, 'mercadoPagoId', mercadoPagoId);
    
    if (!data) {
      return null;
    }

    const validatedData = validatePaymentData(data);
    return Payment.fromDTO(validatedData);
  }

  async findByExternalId(externalId: string): Promise<Payment | null> {
    // Alias para findByMercadoPagoId
    return this.findByMercadoPagoId(externalId);
  }

  async findByProfileId(profileId: string): Promise<Payment[]> {
    const data = await this.firestoreClient.findMany(this.collection, {
      where: [{ field: 'profileId', operator: '==', value: profileId }],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });

    return data.map(item => {
      const validatedData = validatePaymentData(item);
      return Payment.fromDTO(validatedData);
    });
  }

  async update(payment: Payment): Promise<void> {
    const data = payment.toDTO();
    await this.firestoreClient.update(this.collection, data.id, data);
  }

  async delete(id: string): Promise<void> {
    await this.firestoreClient.delete(this.collection, id, true);
  }

  async findMany(options: {
    page?: number;
    limit?: number;
    status?: string;
    paymentMethod?: string;
    profileId?: string;
  }): Promise<{
    payments: Payment[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const where = [];
    
    if (options.status) {
      where.push({ field: 'status', operator: '==' as const, value: options.status });
    }
    
    if (options.paymentMethod) {
      where.push({ field: 'paymentMethod', operator: '==' as const, value: options.paymentMethod });
    }

    if (options.profileId) {
      where.push({ field: 'profileId', operator: '==' as const, value: options.profileId });
    }

    const result = await this.firestoreClient.findManyPaginated(
      this.collection,
      options.page || 1,
      options.limit || 10,
      { 
        where,
        orderBy: [{ field: 'createdAt', direction: 'desc' }]
      }
    );

    return {
      payments: result.data.map(data => {
        const validatedData = validatePaymentData(data);
        return Payment.fromDTO(validatedData);
      }),
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
    };
  }

  async findByStatus(status: string): Promise<Payment[]> {
    const data = await this.firestoreClient.findMany(this.collection, {
      where: [{ field: 'status', operator: '==', value: status }],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });

    return data.map(item => {
      const validatedData = validatePaymentData(item);
      return Payment.fromDTO(validatedData);
    });
  }

  async findExpired(): Promise<Payment[]> {
    const now = new Date();
    const data = await this.firestoreClient.findMany(this.collection, {
      where: [
        { field: 'expiresAt', operator: '<', value: now },
        { field: 'status', operator: '==', value: 'pending' }
      ]
    });

    return data.map(item => {
      const validatedData = validatePaymentData(item);
      return Payment.fromDTO(validatedData);
    });
  }

  async findPendingByMethod(paymentMethod: string): Promise<Payment[]> {
    const data = await this.firestoreClient.findMany(this.collection, {
      where: [
        { field: 'paymentMethod', operator: '==', value: paymentMethod },
        { field: 'status', operator: '==', value: 'pending' }
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });

    return data.map(item => {
      const validatedData = validatePaymentData(item);
      return Payment.fromDTO(validatedData);
    });
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Payment[]> {
    const data = await this.firestoreClient.findMany(this.collection, {
      where: [
        { field: 'createdAt', operator: '>=', value: startDate },
        { field: 'createdAt', operator: '<=', value: endDate }
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });

    return data.map(item => {
      const validatedData = validatePaymentData(item);
      return Payment.fromDTO(validatedData);
    });
  }

  async countByStatus(status: string): Promise<number> {
    return await this.firestoreClient.count(this.collection, [
      { field: 'status', operator: '==', value: status }
    ]);
  }

  async calculateRevenueByPeriod(startDate: Date, endDate: Date): Promise<number> {
    // No Firestore, precisamos buscar os dados e calcular no cliente
    const payments = await this.findByDateRange(startDate, endDate);
    
    return payments
      .filter(payment => payment.isSuccessful())
      .reduce((total, payment) => total + payment.getAmount(), 0);
  }

  async getPaymentStats(): Promise<{
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    totalRevenue: number;
  }> {
    // Para um cenário real, seria melhor usar Cloud Functions para calcular essas estatísticas
    const [
      totalCount,
      approvedCount,
      pendingCount,
      rejectedCount
    ] = await Promise.all([
      this.firestoreClient.count(this.collection),
      this.countByStatus('approved'),
      this.countByStatus('pending'),
      this.countByStatus('rejected')
    ]);

    // Buscar pagamentos aprovados para calcular receita
    const approvedPayments = await this.findByStatus('approved');
    const totalRevenue = approvedPayments.reduce((total, payment) => total + payment.getAmount(), 0);

    return {
      total: totalCount,
      approved: approvedCount,
      pending: pendingCount,
      rejected: rejectedCount,
      totalRevenue
    };
  }
}