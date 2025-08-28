import { Subscription } from '../../domain/entities/Subscription.js';

export interface ISubscriptionRepository {
  /**
   * Salva uma nova assinatura
   */
  save(subscription: Subscription): Promise<void>;
  
  /**
   * Busca uma assinatura por ID
   */
  findById(id: string): Promise<Subscription | null>;
  
  /**
   * Busca assinatura por ID do perfil
   */
  findByProfileId(profileId: string): Promise<Subscription | null>;
  
  /**
   * Busca assinaturas por ID do pagamento
   */
  findByPaymentId(paymentId: string): Promise<Subscription[]>;
  
  /**
   * Atualiza uma assinatura existente
   */
  update(subscription: Subscription): Promise<void>;
  
  /**
   * Remove uma assinatura
   */
  delete(id: string): Promise<void>;
  
  /**
   * Lista assinaturas com paginação
   */
  findMany(options: {
    page?: number;
    limit?: number;
    status?: string;
    plan?: string;
  }): Promise<{
    subscriptions: Subscription[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  
  /**
   * Busca assinaturas por status
   */
  findByStatus(status: string): Promise<Subscription[]>;
  
  /**
   * Busca assinaturas expiradas
   */
  findExpired(): Promise<Subscription[]>;
  
  /**
   * Busca assinaturas próximas ao vencimento
   */
  findNearRenewal(days: number): Promise<Subscription[]>;
  
  /**
   * Busca assinaturas ativas por plano
   */
  findActiveByPlan(plan: string): Promise<Subscription[]>;
  
  /**
   * Conta assinaturas por status
   */
  countByStatus(status: string): Promise<number>;
  
  /**
   * Conta assinaturas por plano
   */
  countByPlan(plan: string): Promise<number>;
  
  /**
   * Busca estatísticas de assinaturas
   */
  getSubscriptionStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    cancelled: number;
    basic: number;
    premium: number;
  }>;
  
  /**
   * Busca receita mensal recorrente (MRR)
   */
  calculateMRR(): Promise<number>;
  
  /**
   * Busca receita anual recorrente (ARR)
   */
  calculateARR(): Promise<number>;
}