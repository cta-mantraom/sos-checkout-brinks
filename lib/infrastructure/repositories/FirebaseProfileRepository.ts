import { MedicalProfile, MedicalProfileDTO, EmergencyContact, MedicalInfo } from '../../domain/entities/MedicalProfile.js';
import { IProfileRepository } from './IProfileRepository.js';
import { FirestoreClient } from '../firebase/FirestoreClient.js';
import { ValidationError } from '../../domain/errors.js';

// Tipo para operadores Where do Firestore
type WhereFilterOp = '<' | '<=' | '==' | '!=' | '>=' | '>' | 'array-contains' | 'in' | 'array-contains-any' | 'not-in';

export class FirebaseProfileRepository implements IProfileRepository {
  private readonly collection = 'medical_profiles';

  constructor(private readonly firestoreClient: FirestoreClient) {}

  private validateAndCastToDTO(data: unknown): MedicalProfileDTO {
    if (!data || typeof data !== 'object') {
      throw new ValidationError('Invalid profile data: not an object');
    }

    const profile = data as Record<string, unknown>;
    
    // Validações básicas dos campos obrigatórios
    if (!profile.id || typeof profile.id !== 'string') {
      throw new ValidationError('Invalid profile data: missing or invalid id');
    }
    
    if (!profile.fullName || typeof profile.fullName !== 'string') {
      throw new ValidationError('Invalid profile data: missing or invalid fullName');
    }
    
    if (!profile.email || typeof profile.email !== 'string') {
      throw new ValidationError('Invalid profile data: missing or invalid email');
    }

    if (!profile.cpf || typeof profile.cpf !== 'string') {
      throw new ValidationError('Invalid profile data: missing or invalid cpf');
    }

    // Cast para o tipo correto com valores padrão para campos opcionais
    const emergencyContact = this.validateEmergencyContact(profile.emergencyContact);
    const medicalInfo = this.validateMedicalInfo(profile.medicalInfo);

    return {
      id: profile.id,
      fullName: profile.fullName,
      cpf: profile.cpf,
      phone: typeof profile.phone === 'string' ? profile.phone : '',
      email: profile.email,
      bloodType: typeof profile.bloodType === 'string' ? profile.bloodType : 'O+',
      emergencyContact,
      medicalInfo,
      qrCodeUrl: typeof profile.qrCodeUrl === 'string' ? profile.qrCodeUrl : undefined,
      subscriptionPlan: (profile.subscriptionPlan === 'premium' ? 'premium' : 'basic') as 'basic' | 'premium',
      paymentStatus: typeof profile.paymentStatus === 'string' ? profile.paymentStatus : 'pending',
      isActive: typeof profile.isActive === 'boolean' ? profile.isActive : true,
      createdAt: profile.createdAt instanceof Date ? profile.createdAt : new Date(),
      updatedAt: profile.updatedAt instanceof Date ? profile.updatedAt : new Date(),
      expiresAt: profile.expiresAt instanceof Date ? profile.expiresAt : undefined
    };
  }

  private validateEmergencyContact(contact: unknown): EmergencyContact {
    if (!contact || typeof contact !== 'object') {
      return { name: '', phone: '', relationship: '' };
    }

    const contactObj = contact as Record<string, unknown>;
    return {
      name: typeof contactObj.name === 'string' ? contactObj.name : '',
      phone: typeof contactObj.phone === 'string' ? contactObj.phone : '',
      relationship: typeof contactObj.relationship === 'string' ? contactObj.relationship : ''
    };
  }

  private validateMedicalInfo(info: unknown): MedicalInfo | undefined {
    if (!info || typeof info !== 'object') {
      return undefined;
    }

    const infoObj = info as Record<string, unknown>;
    return {
      allergies: Array.isArray(infoObj.allergies) ? infoObj.allergies.filter((item): item is string => typeof item === 'string') : undefined,
      medications: Array.isArray(infoObj.medications) ? infoObj.medications.filter((item): item is string => typeof item === 'string') : undefined,
      conditions: Array.isArray(infoObj.conditions) ? infoObj.conditions.filter((item): item is string => typeof item === 'string') : undefined,
      observations: typeof infoObj.observations === 'string' ? infoObj.observations : undefined
    };
  }

  async save(profile: MedicalProfile): Promise<void> {
    const data = profile.toDTO();
    await this.firestoreClient.create(this.collection, data, data.id);
  }

  async findById(id: string): Promise<MedicalProfile | null> {
    const data = await this.firestoreClient.findById(this.collection, id);
    
    if (!data) {
      return null;
    }

    const validatedData = this.validateAndCastToDTO(data);
    return MedicalProfile.fromDTO(validatedData);
  }

  async findByEmail(email: string): Promise<MedicalProfile | null> {
    const data = await this.firestoreClient.findOne(this.collection, 'email', email);
    
    if (!data) {
      return null;
    }

    const validatedData = this.validateAndCastToDTO(data);
    return MedicalProfile.fromDTO(validatedData);
  }

  async findByCPF(cpf: string): Promise<MedicalProfile | null> {
    const data = await this.firestoreClient.findOne(this.collection, 'cpf', cpf);
    
    if (!data) {
      return null;
    }

    const validatedData = this.validateAndCastToDTO(data);
    return MedicalProfile.fromDTO(validatedData);
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
    const where: { field: string; operator: WhereFilterOp; value: unknown }[] = [];
    
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
      profiles: result.data.map(data => {
        const validatedData = this.validateAndCastToDTO(data);
        return MedicalProfile.fromDTO(validatedData);
      }),
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
    };
  }

  async findByPaymentStatus(status: string): Promise<MedicalProfile[]> {
    const data = await this.firestoreClient.findMany(this.collection, {
      where: [{ field: 'paymentStatus', operator: '==', value: status }]
    });

    return data.map(item => {
      const validatedData = this.validateAndCastToDTO(item);
      return MedicalProfile.fromDTO(validatedData);
    });
  }

  async findExpired(): Promise<MedicalProfile[]> {
    const now = new Date();
    const data = await this.firestoreClient.findMany(this.collection, {
      where: [
        { field: 'expiresAt', operator: '<', value: now },
        { field: 'isActive', operator: '==', value: true }
      ]
    });

    return data.map(item => {
      const validatedData = this.validateAndCastToDTO(item);
      return MedicalProfile.fromDTO(validatedData);
    });
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