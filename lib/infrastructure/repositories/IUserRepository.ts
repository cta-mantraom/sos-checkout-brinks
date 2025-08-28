import { User } from '../../domain/entities/User.js';

export interface IUserRepository {
  /**
   * Salva um novo usuário
   */
  save(user: User): Promise<void>;
  
  /**
   * Busca um usuário por ID
   */
  findById(id: string): Promise<User | null>;
  
  /**
   * Busca um usuário por email
   */
  findByEmail(email: string): Promise<User | null>;
  
  /**
   * Busca usuário por ID do perfil
   */
  findByProfileId(profileId: string): Promise<User | null>;
  
  /**
   * Atualiza um usuário existente
   */
  update(user: User): Promise<void>;
  
  /**
   * Remove um usuário (soft delete)
   */
  delete(id: string): Promise<void>;
  
  /**
   * Lista usuários com paginação
   */
  findMany(options: {
    page?: number;
    limit?: number;
    status?: string;
    role?: string;
  }): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  
  /**
   * Busca usuários por status
   */
  findByStatus(status: string): Promise<User[]>;
  
  /**
   * Busca usuários por role
   */
  findByRole(role: string): Promise<User[]>;
  
  /**
   * Busca usuários ativos
   */
  findActive(): Promise<User[]>;
  
  /**
   * Busca usuários bloqueados
   */
  findBlocked(): Promise<User[]>;
  
  /**
   * Busca usuários pendentes de verificação
   */
  findPendingVerification(): Promise<User[]>;
  
  /**
   * Conta usuários por status
   */
  countByStatus(status: string): Promise<number>;
  
  /**
   * Conta usuários por role
   */
  countByRole(role: string): Promise<number>;
  
  /**
   * Verifica se existe um usuário com o email
   */
  existsByEmail(email: string): Promise<boolean>;
  
  /**
   * Busca usuários inativos por período
   */
  findInactiveUsers(days: number): Promise<User[]>;
  
  /**
   * Busca estatísticas de usuários
   */
  getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    blocked: number;
    pendingVerification: number;
    admins: number;
    support: number;
    users: number;
  }>;
}