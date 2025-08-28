import { User } from '../../domain/entities/User.js';
import { IUserRepository } from './IUserRepository.js';
import { FirestoreClient } from '../firebase/FirestoreClient.js';

export class FirebaseUserRepository implements IUserRepository {
  private readonly collection = 'users';

  constructor(private readonly firestoreClient: FirestoreClient) {}

  async save(user: User): Promise<void> {
    const userData = {
      ...user.toDTO(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await this.firestoreClient.create(
      this.collection,
      user.getId(),
      userData
    );
  }

  async findById(id: string): Promise<User | null> {
    const doc = await this.firestoreClient.get(this.collection, id);
    if (!doc) return null;
    
    return User.fromDTO({
      id,
      ...doc
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const results = await this.firestoreClient.query(this.collection, {
      where: [{ field: 'email', operator: '==', value: email }],
      limit: 1
    });
    
    if (results.length === 0) return null;
    
    const [doc] = results;
    return User.fromDTO(doc);
  }

  async findByProfileId(profileId: string): Promise<User | null> {
    const results = await this.firestoreClient.query(this.collection, {
      where: [{ field: 'profileId', operator: '==', value: profileId }],
      limit: 1
    });
    
    if (results.length === 0) return null;
    
    const [doc] = results;
    return User.fromDTO(doc);
  }

  async update(user: User): Promise<void> {
    const userData = {
      ...user.toDTO(),
      updatedAt: new Date().toISOString()
    };
    
    await this.firestoreClient.update(
      this.collection,
      user.getId(),
      userData
    );
  }

  async delete(id: string): Promise<void> {
    await this.firestoreClient.update(
      this.collection,
      id,
      {
        status: 'inactive',
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
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
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    
    const where: any[] = [];
    if (options.status) {
      where.push({ field: 'status', operator: '==', value: options.status });
    }
    if (options.role) {
      where.push({ field: 'role', operator: '==', value: options.role });
    }
    
    const results = await this.firestoreClient.query(this.collection, {
      where,
      limit,
      offset,
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
    
    const users = results.map(doc => User.fromDTO(doc));
    
    // Count total for pagination
    const totalResults = await this.firestoreClient.query(this.collection, { where });
    const total = totalResults.length;
    
    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findByStatus(status: string): Promise<User[]> {
    const results = await this.firestoreClient.query(this.collection, {
      where: [{ field: 'status', operator: '==', value: status }]
    });
    
    return results.map(doc => User.fromDTO(doc));
  }

  async findByRole(role: string): Promise<User[]> {
    const results = await this.firestoreClient.query(this.collection, {
      where: [{ field: 'role', operator: '==', value: role }]
    });
    
    return results.map(doc => User.fromDTO(doc));
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
    const results = await this.firestoreClient.query(this.collection, {
      where: [{ field: 'status', operator: '==', value: status }]
    });
    
    return results.length;
  }

  async countByRole(role: string): Promise<number> {
    const results = await this.firestoreClient.query(this.collection, {
      where: [{ field: 'role', operator: '==', value: role }]
    });
    
    return results.length;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const results = await this.firestoreClient.query(this.collection, {
      where: [{ field: 'email', operator: '==', value: email }],
      limit: 1
    });
    
    return results.length > 0;
  }

  async findInactiveUsers(days: number): Promise<User[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const results = await this.firestoreClient.query(this.collection, {
      where: [
        { field: 'lastLoginAt', operator: '<', value: cutoffDate.toISOString() },
        { field: 'status', operator: '==', value: 'active' }
      ]
    });
    
    return results.map(doc => User.fromDTO(doc));
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
    const allUsers = await this.firestoreClient.query(this.collection, {});
    
    const stats = {
      total: allUsers.length,
      active: 0,
      inactive: 0,
      blocked: 0,
      pendingVerification: 0,
      admins: 0,
      support: 0,
      users: 0
    };
    
    for (const userData of allUsers) {
      // Count by status
      switch (userData.status) {
        case 'active':
          stats.active++;
          break;
        case 'inactive':
          stats.inactive++;
          break;
        case 'blocked':
          stats.blocked++;
          break;
        case 'pending_verification':
          stats.pendingVerification++;
          break;
      }
      
      // Count by role
      switch (userData.role) {
        case 'admin':
          stats.admins++;
          break;
        case 'support':
          stats.support++;
          break;
        case 'user':
          stats.users++;
          break;
      }
    }
    
    return stats;
  }
}