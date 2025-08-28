import { MedicalProfile } from '../../domain/entities/MedicalProfile.js';

export interface IProfileRepository {
  /**
   * Salva um novo perfil médico
   */
  save(profile: MedicalProfile): Promise<void>;
  
  /**
   * Busca um perfil por ID
   */
  findById(id: string): Promise<MedicalProfile | null>;
  
  /**
   * Busca um perfil por email
   */
  findByEmail(email: string): Promise<MedicalProfile | null>;
  
  /**
   * Busca um perfil por CPF
   */
  findByCPF(cpf: string): Promise<MedicalProfile | null>;
  
  /**
   * Atualiza um perfil existente
   */
  update(profile: MedicalProfile): Promise<void>;
  
  /**
   * Remove um perfil (soft delete)
   */
  delete(id: string): Promise<void>;
  
  /**
   * Lista perfis com paginação
   */
  findMany(options: {
    page?: number;
    limit?: number;
    status?: string;
    plan?: string;
  }): Promise<{
    profiles: MedicalProfile[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  
  /**
   * Busca perfis por status de pagamento
   */
  findByPaymentStatus(status: string): Promise<MedicalProfile[]>;
  
  /**
   * Busca perfis expirados
   */
  findExpired(): Promise<MedicalProfile[]>;
  
  /**
   * Conta total de perfis por status
   */
  countByStatus(status: string): Promise<number>;
  
  /**
   * Verifica se existe um perfil com o email
   */
  existsByEmail(email: string): Promise<boolean>;
  
  /**
   * Verifica se existe um perfil com o CPF
   */
  existsByCPF(cpf: string): Promise<boolean>;
}