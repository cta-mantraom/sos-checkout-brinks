import { User, UserDTO } from '../../domain/entities/User.js';
import { IUserRepository } from './IUserRepository.js';
import { FirestoreClient } from '../firebase/FirestoreClient.js';
import { z } from 'zod';

// Tipo para operadores Where do Firestore
type WhereFilterOp = '<' | '<=' | '==' | '!=' | '>=' | '>' | 'array-contains' | 'in' | 'array-contains-any' | 'not-in';

// Schema Zod para validação de dados Firestore
const FirestoreUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  passwordHash: z.string(),
  role: z.enum(['user', 'admin', 'support']),
  status: z.enum(['active', 'inactive', 'pending_verification', 'blocked']),
  profileId: z.string().optional(),
  lastLoginAt: z.date().optional(),
  emailVerifiedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Type guard com Zod
function validateUserData(data: unknown): UserDTO {
  const validated = FirestoreUserSchema.parse(data);
  return validated as UserDTO;
}

export class FirebaseUserRepository implements IUserRepository {
  private readonly collection = 'users';

  constructor(private readonly firestoreClient: FirestoreClient) {}

  async save(user: User): Promise<void> {
    const data = user.toDTO();
    await this.firestoreClient.create(this.collection, data, data.id);
  }

  async findById(id: string): Promise<User | null> {
    const data = await this.firestoreClient.findById(this.collection, id);
    
    if (!data) {
      return null;
    }

    const validatedData = validateUserData(data);
    return User.fromDTO(validatedData);
  }

  async findByEmail(email: string): Promise<User | null> {
    const data = await this.firestoreClient.findOne(this.collection, 'email', email);
    
    if (!data) {
      return null;
    }

    const validatedData = validateUserData(data);
    return User.fromDTO(validatedData);
  }

  async findByProfileId(profileId: string): Promise<User | null> {
    const data = await this.firestoreClient.findOne(this.collection, 'profileId', profileId);
    
    if (!data) {
      return null;
    }

    const validatedData = validateUserData(data);
    return User.fromDTO(validatedData);
  }

  async update(user: User): Promise<void> {
    const data = user.toDTO();
    await this.firestoreClient.update(this.collection, data.id, data);
  }

  async delete(id: string): Promise<void> {
    await this.firestoreClient.delete(this.collection, id, true);
  }

  async findMany(options: {
    page?: number;
    limit?: number;
    status?: string;
    role?: string;
  }): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const where: { field: string; operator: WhereFilterOp; value: unknown }[] = [];
    
    if (options.status) {
      where.push({ field: 'status', operator: '==' as const, value: options.status });
    }
    
    if (options.role) {
      where.push({ field: 'role', operator: '==' as const, value: options.role });
    }

    const result = await this.firestoreClient.findManyPaginated(
      this.collection,
      options.page || 1,
      options.limit || 20,
      { 
        where,
        orderBy: [{ field: 'createdAt', direction: 'desc' }]
      }
    );

    return {
      users: result.data.map(data => {
        const validatedData = validateUserData(data);
        return User.fromDTO(validatedData);
      }),
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
    };
  }

  async findByStatus(status: string): Promise<User[]> {
    const data = await this.firestoreClient.findMany(this.collection, {
      where: [{ field: 'status', operator: '==', value: status }],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
    
    return data.map(item => {
      const validatedData = validateUserData(item);
      return User.fromDTO(validatedData);
    });
  }

  async findByRole(role: string): Promise<User[]> {
    const data = await this.firestoreClient.findMany(this.collection, {
      where: [{ field: 'role', operator: '==', value: role }],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
    
    return data.map(item => {
      const validatedData = validateUserData(item);
      return User.fromDTO(validatedData);
    });
  }

  async findActive(): Promise<User[]> {
    return this.findByStatus('active');
  }

  async findBlocked(): Promise<User[]> {
    return this.findByStatus('blocked');
  }

  async findPendingVerification(): Promise<User[]> {
    return this.findByStatus('pending_verification');
  }

  async countByStatus(status: string): Promise<number> {
    return await this.firestoreClient.count(this.collection, [
      { field: 'status', operator: '==', value: status }
    ]);
  }

  async countByRole(role: string): Promise<number> {
    return await this.firestoreClient.count(this.collection, [
      { field: 'role', operator: '==', value: role }
    ]);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const data = await this.firestoreClient.findOne(this.collection, 'email', email);
    return data !== null;
  }

  async findInactiveUsers(days: number): Promise<User[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const data = await this.firestoreClient.findMany(this.collection, {
      where: [
        { field: 'lastLoginAt', operator: '<', value: cutoffDate },
        { field: 'status', operator: '==', value: 'active' }
      ],
      orderBy: [{ field: 'lastLoginAt', direction: 'desc' }]
    });
    
    return data.map(item => {
      const validatedData = validateUserData(item);
      return User.fromDTO(validatedData);
    });
  }

  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    blocked: number;
    pendingVerification: number;
    admins: number;
    support: number;
    users: number;
  }> {
    const [
      total,
      active,
      inactive,
      blocked,
      pendingVerification,
      admins,
      support,
      users
    ] = await Promise.all([
      this.firestoreClient.count(this.collection),
      this.countByStatus('active'),
      this.countByStatus('inactive'),
      this.countByStatus('blocked'),
      this.countByStatus('pending_verification'),
      this.countByRole('admin'),
      this.countByRole('support'),
      this.countByRole('user')
    ]);
    
    return {
      total,
      active,
      inactive,
      blocked,
      pendingVerification,
      admins,
      support,
      users
    };
  }
}