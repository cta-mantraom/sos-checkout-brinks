import { Payment } from '../../domain/entities/Payment.js';
import { IMercadoPagoClient } from '../../domain/services/PaymentService.js';

export interface MercadoPagoConfig {
  accessToken: string;
  webhookSecret: string;
  environment: 'sandbox' | 'production';
}

export interface MercadoPagoPaymentRequest {
  transaction_amount: number;
  payment_method_id: string;
  token?: string;
  installments?: number;
  payer: {
    email: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  metadata?: {
    profile_id: string;
    subscription_plan: string;
  };
  description?: string;
}

export interface MercadoPagoPaymentResponse {
  id: string;
  status: string;
  status_detail: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
}

export class MercadoPagoClient implements IMercadoPagoClient {
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly webhookSecret: string;

  constructor(config: MercadoPagoConfig) {
    this.accessToken = config.accessToken;
    this.webhookSecret = config.webhookSecret;
    this.baseUrl = config.environment === 'production' 
      ? 'https://api.mercadopago.com' 
      : 'https://api.mercadopago.com'; // Mesmo endpoint para sandbox
  }

  async createPayment(payment: Payment): Promise<{
    id: string;
    status: string;
    status_detail: string;
    pixQrCode?: string;
    pixQrCodeBase64?: string;
    boletoUrl?: string;
  }> {
    try {
      const paymentData: MercadoPagoPaymentRequest = {
        transaction_amount: payment.getAmount(),
        payment_method_id: payment.getPaymentMethod(),
        token: payment.getToken(),
        installments: payment.getInstallments(),
        payer: {
          email: 'user@example.com', // Será obtido do perfil
        },
        metadata: {
          profile_id: payment.getProfileId(),
          subscription_plan: 'basic' // Será obtido do perfil
        },
        description: payment.getDescription() || 'Assinatura SOS Checkout Brinks'
      };

      const response = await this.makeRequest('POST', '/v1/payments', paymentData) as MercadoPagoPaymentResponse;
      
      return {
        id: response.id,
        status: response.status,
        status_detail: response.status_detail,
        pixQrCode: response.point_of_interaction?.transaction_data?.qr_code,
        pixQrCodeBase64: response.point_of_interaction?.transaction_data?.qr_code_base64,
        boletoUrl: response.point_of_interaction?.transaction_data?.ticket_url
      };

    } catch (error) {
      console.error('Erro ao criar pagamento no MercadoPago:', error);
      throw new Error(`Falha na criação do pagamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async getPaymentById(id: string): Promise<MercadoPagoPaymentResponse> {
    try {
      return await this.makeRequest('GET', `/v1/payments/${id}`) as MercadoPagoPaymentResponse;
    } catch (error) {
      console.error('Erro ao buscar pagamento no MercadoPago:', error);
      throw new Error(`Falha ao buscar pagamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async validateWebhook(payload: unknown, headers: Record<string, string>): Promise<boolean> {
    try {
      const xSignature = headers['x-signature'];
      const xRequestId = headers['x-request-id'];

      if (!xSignature || !xRequestId) {
        console.error('Headers de webhook ausentes:', { xSignature: !!xSignature, xRequestId: !!xRequestId });
        return false;
      }

      // Extrair timestamp e hash do header x-signature
      const signatureParts = xSignature.split(',');
      let ts = '';
      let hash = '';

      for (const part of signatureParts) {
        const [key, value] = part.split('=');
        if (key.trim() === 'ts') {
          ts = value;
        } else if (key.trim() === 'v1') {
          hash = value;
        }
      }

      if (!ts || !hash) {
        console.error('Timestamp ou hash ausentes na assinatura');
        return false;
      }

      // Construir string para validação
      const dataId = typeof payload === 'object' && payload && 'data' in payload && 
                    typeof payload.data === 'object' && payload.data && 'id' in payload.data 
                    ? String(payload.data.id) : '';
      
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

      // Calcular hash HMAC SHA256
      const crypto = await import('crypto');
      const calculatedHash = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(manifest)
        .digest('hex');

      const isValid = calculatedHash === hash;
      
      if (!isValid) {
        console.error('Webhook signature validation failed:', {
          expected: hash,
          calculated: calculatedHash,
          manifest
        });
      }

      return isValid;

    } catch (error) {
      console.error('Erro ao validar webhook:', error);
      return false;
    }
  }

  async refundPayment(paymentId: string, amount?: number): Promise<{
    id: string;
    status: string;
    amount: number;
  }> {
    try {
      const refundData = amount ? { amount } : {};
      
      const response = await this.makeRequest('POST', `/v1/payments/${paymentId}/refunds`, refundData) as { id: string; status: string; amount: number };
      
      return {
        id: response.id,
        status: response.status,
        amount: response.amount
      };

    } catch (error) {
      console.error('Erro ao estornar pagamento no MercadoPago:', error);
      throw new Error(`Falha no estorno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async cancelPayment(paymentId: string): Promise<{
    id: string;
    status: string;
  }> {
    try {
      const response = await this.makeRequest('PUT', `/v1/payments/${paymentId}`, {
        status: 'cancelled'
      }) as { id: string; status: string };
      
      return {
        id: response.id,
        status: response.status
      };

    } catch (error) {
      console.error('Erro ao cancelar pagamento no MercadoPago:', error);
      throw new Error(`Falha no cancelamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private async makeRequest(method: string, endpoint: string, data?: unknown): Promise<unknown> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        'X-Idempotency-Key': this.generateIdempotencyKey()
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
    }

    return await response.json();
  }

  private generateIdempotencyKey(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  // Métodos utilitários para configuração
  static getPaymentMethods(): Record<string, string> {
    return {
      'pix': 'pix',
      'credit_card': 'credit_card',
      'debit_card': 'debit_card',
      'boleto': 'bolbradesco'
    };
  }

  static validateConfig(config: MercadoPagoConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.accessToken) {
      errors.push('Access Token é obrigatório');
    }

    if (!config.webhookSecret) {
      errors.push('Webhook Secret é obrigatório');
    }

    if (!['sandbox', 'production'].includes(config.environment)) {
      errors.push('Environment deve ser "sandbox" ou "production"');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}