import { MedicalProfile } from '../../domain/entities/MedicalProfile.js';
import { IProfileRepository } from './IProfileRepository.js';
import { FirestoreClient } from '../firebase/FirestoreClient.js';

export class FirebaseProfileRepository implements IProfileRepository {
  private readonly collection = 'medical_profiles';

  constructor(private readonly firestoreClient: FirestoreClient) {}

  async save(profile: MedicalProfile): Promise<void> {
    const data = profile.toDTO();
    await this.firestoreClient.create(this.collection, data, data.id);
  }

  async findById(id: string): Promise<MedicalProfile | null> {
    const data = await this.firestoreClient.findById(this.collection, id);
    
    if (!data) {
      return null;
    }

    return MedicalProfile.fromDTO(data);
  }

  async findByEmail(email: string): Promise<MedicalProfile | null> {
    const data = await this.firestoreClient.findOne(this.collection, 'email', email);
    
    if (!data) {
      return null;
    }

    return MedicalProfile.fromDTO(data);
  }

  async findByCPF(cpf: string): Promise<MedicalProfile | null> {
    const data = await this.firestoreClient.findOne(this.collection, 'cpf', cpf);
    
    if (!data) {
      return null;
    }

    return MedicalProfile.fromDTO(data);
  }

  async update(profile: MedicalProfile): Promise<void> {
    const data = profile.toDTO();
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
    profiles: MedicalProfile[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const where = [];
    
    if (options.status) {
      where.push({ field: 'paymentStatus', operator: '==' as const, value: options.status });
    }
    
    if (options.plan) {
      where.push({ field: 'subscriptionPlan', operator: '==' as const, value: options.plan });
    }

    const result = await this.firestoreClient.findManyPaginated(
      this.collection,
      options.page || 1,
      options.limit || 10,
      { where }
    );

    return {
      profiles: result.data.map(data => MedicalProfile.fromDTO(data)),
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
    };
  }

  async findByPaymentStatus(status: string): Promise<MedicalProfile[]> {
    const data = await this.firestoreClient.findMany(this.collection, {
      where: [{ field: 'paymentStatus', operator: '==', value: status }]
    });

    return data.map(item => MedicalProfile.fromDTO(item));
  }

  async findExpired(): Promise<MedicalProfile[]> {
    const now = new Date();
    const data = await this.firestoreClient.findMany(this.collection, {
      where: [
        { field: 'expiresAt', operator: '<', value: now },
        { field: 'isActive', operator: '==', value: true }
      ]
    });

    return data.map(item => MedicalProfile.fromDTO(item));
  }

  async countByStatus(status: string): Promise<number> {
    return await this.firestoreClient.count(this.collection, [
      { field: 'paymentStatus', operator: '==', value: status }
    ]);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const data = await this.firestoreClient.findOne(this.collection, 'email', email);
    return data !== null;
  }

  async existsByCPF(cpf: string): Promise<boolean> {
    const data = await this.firestoreClient.findOne(this.collection, 'cpf', cpf);
    return data !== null;
  }
}