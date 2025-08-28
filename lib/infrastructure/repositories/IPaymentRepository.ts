import { Payment } from '../../domain/entities/Payment.js';

export interface IPaymentRepository {
  /**
   * Salva um novo pagamento
   */
  save(payment: Payment): Promise<void>;
  
  /**
   * Busca um pagamento por ID
   */
  findById(id: string): Promise<Payment | null>;
  
  /**
   * Busca um pagamento por ID do MercadoPago
   */
  findByMercadoPagoId(mercadoPagoId: string): Promise<Payment | null>;
  
  /**
   * Busca pagamento por ID externo (alias para findByMercadoPagoId)
   */
  findByExternalId(externalId: string): Promise<Payment | null>;
  
  /**
   * Busca pagamentos por ID do perfil
   */
  findByProfileId(profileId: string): Promise<Payment[]>;
  
  /**
   * Atualiza um pagamento existente
   */
  update(payment: Payment): Promise<void>;
  
  /**
   * Remove um pagamento
   */
  delete(id: string): Promise<void>;
  
  /**
   * Lista pagamentos com paginação
   */
  findMany(options: {
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
  }>;
  
  /**
   * Busca pagamentos por status
   */
  findByStatus(status: string): Promise<Payment[]>;
  
  /**
   * Busca pagamentos expirados
   */
  findExpired(): Promise<Payment[]>;
  
  /**
   * Busca pagamentos pendentes por método
   */
  findPendingByMethod(paymentMethod: string): Promise<Payment[]>;
  
  /**
   * Busca pagamentos em um período
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<Payment[]>;
  
  /**
   * Conta total de pagamentos por status
   */
  countByStatus(status: string): Promise<number>;
  
  /**
   * Calcula total de receita por período
   */
  calculateRevenueByPeriod(startDate: Date, endDate: Date): Promise<number>;
  
  /**
   * Busca estatísticas de pagamento
   */
  getPaymentStats(): Promise<{
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    totalRevenue: number;
  }>;
}