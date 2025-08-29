import { Subscription, SubscriptionDTO } from '../../domain/entities/Subscription.js';
import { ISubscriptionRepository } from './ISubscriptionRepository.js';
import { FirestoreClient } from '../firebase/FirestoreClient.js';
import { z } from 'zod';

// Schema Zod para validação de dados Firestore
const FirestoreSubscriptionSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  plan: z.enum(['basic', 'premium']),
  status: z.enum(['active', 'expired', 'cancelled', 'suspended']),
  paymentId: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  renewalDate: z.date().optional(),
  cancelledAt: z.date().optional(),
  suspendedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Type guard com Zod
function validateSubscriptionData(data: unknown): SubscriptionDTO {
  const validated = FirestoreSubscriptionSchema.parse(data);
  return validated as SubscriptionDTO;
}

export class FirebaseSubscriptionRepository implements ISubscriptionRepository {
  private readonly collection = 'subscriptions';

  constructor(private readonly firestoreClient: FirestoreClient) {}

  async save(subscription: Subscription): Promise<void> {
    const data = subscription.toDTO();
    await this.firestoreClient.create(this.collection, data, data.id);
  }

  async findById(id: string): Promise<Subscription | null> {
    const data = await this.firestoreClient.findById(this.collection, id);
    
    if (!data) {
      return null;
    }

    const validatedData = validateSubscriptionData(data);
    return Subscription.fromDTO(validatedData);
  }

  async findByProfileId(profileId: string): Promise<Subscription | null> {
    const data = await this.firestoreClient.findMany(this.collection, {
      where: [{ field: 'profileId', operator: '==', value: profileId }],
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 1
    });

    if (data.length === 0) {
      return null;
    }

    const validatedData = validateSubscriptionData(data[0]);
    return Subscription.fromDTO(validatedData);
  }

  async findByPaymentId(paymentId: string): Promise<Subscription[]> {
    const data = await this.firestoreClient.findMany(this.collection, {
      where: [{ field: 'paymentId', operator: '==', value: paymentId }],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });

    return data.map(item => {
      const validatedData = validateSubscriptionData(item);
      return Subscription.fromDTO(validatedData);
    });
  }

  async update(subscription: Subscription): Promise<void> {
    const data = subscription.toDTO();
    await this.firestoreClient.update(this.collection, data.id, data);
  }

  async delete(id: string): Promise<void> {
    await this.firestoreClient.delete(this.collection, id, true);
  }

  async findMany(options: {
    page?: number;
    limit?: number;
    status?: string;
    plan?: string;
  }): Promise<{
    subscriptions: Subscription[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const where = [];
    
    if (options.status) {
      where.push({ field: 'status', operator: '==' as const, value: options.status });
    }
    
    if (options.plan) {
      where.push({ field: 'plan', operator: '==' as const, value: options.plan });
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
      subscriptions: result.data.map(data => {
        const validatedData = validateSubscriptionData(data);
        return Subscription.fromDTO(validatedData);
      }),
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
    };
  }

  async findByStatus(status: string): Promise<Subscription[]> {
    const data = await this.firestoreClient.findMany(this.collection, {
      where: [{ field: 'status', operator: '==', value: status }],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });

    return data.map(item => {
      const validatedData = validateSubscriptionData(item);
      return Subscription.fromDTO(validatedData);
    });
  }

  async findExpired(): Promise<Subscription[]> {
    const now = new Date();
    const data = await this.firestoreClient.findMany(this.collection, {
      where: [
        { field: 'status', operator: '==', value: 'active' },
        { field: 'endDate', operator: '<', value: now }
      ]
    });

    return data.map(item => {
      const validatedData = validateSubscriptionData(item);
      return Subscription.fromDTO(validatedData);
    });
  }

  async findNearRenewal(days: number): Promise<Subscription[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    const data = await this.firestoreClient.findMany(this.collection, {
      where: [
        { field: 'status', operator: '==', value: 'active' },
        { field: 'endDate', operator: '<=', value: futureDate },
        { field: 'endDate', operator: '>', value: new Date() }
      ]
    });

    return data.map(item => {
      const validatedData = validateSubscriptionData(item);
      return Subscription.fromDTO(validatedData);
    });
  }

  async findActiveByPlan(plan: string): Promise<Subscription[]> {
    const data = await this.firestoreClient.findMany(this.collection, {
      where: [
        { field: 'status', operator: '==', value: 'active' },
        { field: 'plan', operator: '==', value: plan }
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });

    return data.map(item => {
      const validatedData = validateSubscriptionData(item);
      return Subscription.fromDTO(validatedData);
    });
  }

  async countByStatus(status: string): Promise<number> {
    return await this.firestoreClient.count(this.collection, [
      { field: 'status', operator: '==', value: status }
    ]);
  }

  async countByPlan(plan: string): Promise<number> {
    return await this.firestoreClient.count(this.collection, [
      { field: 'plan', operator: '==', value: plan }
    ]);
  }

  async getSubscriptionStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    cancelled: number;
    basic: number;
    premium: number;
  }> {
    const [
      total,
      active,
      expired,
      cancelled,
      basic,
      premium
    ] = await Promise.all([
      this.firestoreClient.count(this.collection),
      this.countByStatus('active'),
      this.countByStatus('expired'),
      this.countByStatus('cancelled'),
      this.countByPlan('basic'),
      this.countByPlan('premium')
    ]);

    return {
      total,
      active,
      expired,
      cancelled,
      basic,
      premium
    };
  }

  async calculateMRR(): Promise<number> {
    const activeSubscriptions = await this.findByStatus('active');
    
    return activeSubscriptions.reduce((total, subscription) => {
      const monthlyPrice = subscription.getPlan() === 'basic' 
        ? subscription.getPrice() // básico já é mensal
        : subscription.getPrice() / 12; // premium é anual, dividir por 12
      
      return total + monthlyPrice;
    }, 0);
  }

  async calculateARR(): Promise<number> {
    const activeSubscriptions = await this.findByStatus('active');
    
    return activeSubscriptions.reduce((total, subscription) => {
      const annualPrice = subscription.getPlan() === 'basic' 
        ? subscription.getPrice() * 12 // básico mensal * 12
        : subscription.getPrice(); // premium já é anual
      
      return total + annualPrice;
    }, 0);
  }
}