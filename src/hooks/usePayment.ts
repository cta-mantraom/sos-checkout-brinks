import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SubscriptionType } from '@/schemas/payment';
import { SUBSCRIPTION_PRICES } from '@/lib/constants/prices';

interface PaymentData {
  subscriptionType: SubscriptionType;
  paymentMethod: string;
  amount: number;
  installments?: number;
  payerInfo: {
    name: string;
    email: string;
    cpf: string;
  };
  profileId: string;
}

interface PaymentResponse {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  externalId: string;
  amount: number;
  installments: number;
  paymentMethod: string;
  qrCodeData?: string;
  qrCodeBase64?: string;
  paymentUrl?: string;
  boletoUrl?: string;
  createdAt: string;
  expiresAt?: string;
}


// MercadoPago interfaces estão definidas em src/types/global.d.ts

async function processPayment(data: PaymentData): Promise<PaymentResponse> {
  const response = await fetch('/api/process-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao processar pagamento');
  }

  return response.json();
}

async function getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
  const response = await fetch(`/api/payment-status?id=${paymentId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao consultar status do pagamento');
  }

  return response.json();
}

export function usePayment(paymentId?: string) {
  return useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () => getPaymentStatus(paymentId!),
    enabled: !!paymentId,
    refetchInterval: (query) => {
      // Continua polling se o pagamento estiver pendente
      const response = query.state.data;
      if (!response) return false;
      return response.status === 'pending' ? 5000 : false;
    },
    staleTime: 0, // Sempre buscar status atualizado
    retry: 3,
  });
}

export function useProcessPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: processPayment,
    onSuccess: (data) => {
      // Adiciona o pagamento ao cache
      queryClient.setQueryData(['payment', data.id], data);
      // Invalida queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (error) => {
      console.error('Erro ao processar pagamento:', error);
    },
  });
}

// Hook para calcular valores do pagamento
export function usePaymentCalculations() {
  const calculateAmount = (
    subscriptionType: SubscriptionType,
    installments: number = 1
  ) => {
    const basePrice = SUBSCRIPTION_PRICES[subscriptionType];
    
    // Acréscimo de juros para parcelamento (apenas cartão de crédito)
    let totalAmount = basePrice;
    if (installments > 1) {
      const interestRate = 0.0299; // 2.99% ao mês
      totalAmount = basePrice * (1 + (interestRate * (installments - 1)));
    }
    
    return {
      basePrice,
      totalAmount: Number(totalAmount.toFixed(2)),
      installmentAmount: Number((totalAmount / installments).toFixed(2)),
    };
  };

  const getMaxInstallments = (subscriptionType: SubscriptionType) => {
    const amount = SUBSCRIPTION_PRICES[subscriptionType];
    // Mínimo de R$ 10 por parcela
    return Math.min(12, Math.floor(amount / 10));
  };

  return {
    calculateAmount,
    getMaxInstallments,
  };
}

// NOTA: useMercadoPagoBrick foi movido para o contexto global MercadoPagoContext
// Use import { useMercadoPagoBrick } from '@/contexts/MercadoPagoContext' ao invés deste hook

// Hook para gerenciar estado do checkout
export function useCheckoutState() {
  const queryClient = useQueryClient();

  const clearCheckoutData = () => {
    queryClient.removeQueries({ queryKey: ['checkout'] });
  };

  const setCheckoutData = (data: unknown) => {
    queryClient.setQueryData(['checkout'], data);
  };

  const getCheckoutData = () => {
    return queryClient.getQueryData(['checkout']);
  };

  return {
    clearCheckoutData,
    setCheckoutData,
    getCheckoutData,
  };
}