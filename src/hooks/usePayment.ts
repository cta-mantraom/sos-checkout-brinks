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

// Interface para opções do brick
interface BrickOptions {
  initialization: {
    amount: number;
    preferenceId?: string | null;
  };
  customization?: {
    paymentMethods?: {
      creditCard?: string;
      debitCard?: string;
      ticket?: string;
      bankTransfer?: string;
    };
    visual?: {
      style?: {
        customVariables?: Record<string, string>;
      };
    };
  };
  callbacks: {
    onReady: () => void;
    onSubmit: (data: unknown) => Promise<unknown>;
    onError: (error: { message?: string }) => void;
  };
}

// Hook para MercadoPago Brick
export function useMercadoPagoBrick() {
  const initializeBrick = async (containerId: string, options: BrickOptions) => {
    if (!window.MercadoPago) {
      throw new Error('MercadoPago SDK não foi carregado');
    }

    const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
    if (!publicKey || publicKey === 'YOUR_MERCADOPAGO_PUBLIC_KEY_HERE') {
      console.error('MercadoPago Public Key não configurada. Verifique o arquivo .env');
      throw new Error('MercadoPago Public Key não configurada. Configure VITE_MERCADOPAGO_PUBLIC_KEY no arquivo .env');
    }

    try {
      console.log('Inicializando MercadoPago Brick com containerId:', containerId);
      
      const mp = new window.MercadoPago(
        publicKey,
        {
          locale: 'pt-BR'
        }
      );

      const bricksBuilder = mp.bricks();
      
      const brick = await bricksBuilder.create('payment', containerId, {
        initialization: options.initialization,
        customization: {
          paymentMethods: {
            creditCard: 'all',
            debitCard: 'all',
            ticket: 'all',
            bankTransfer: 'all',
          },
          visual: {
            style: {
              customVariables: {
                formBackgroundColor: '#ffffff',
                inputBackgroundColor: '#ffffff',
                inputFocusedBackgroundColor: '#ffffff',
                inputBorderColor: '#e2e8f0',
                inputFocusedBorderColor: '#3b82f6',
                buttonBackgroundColor: '#3b82f6',
                buttonTextColor: '#ffffff',
              }
            }
          }
        },
        callbacks: options.callbacks,
      });

      console.log('MercadoPago Brick inicializado com sucesso');
      return brick;
    } catch (error) {
      console.error('Erro ao inicializar MercadoPago Brick:', error);
      if (error instanceof Error && error.message.includes('container_not_found')) {
        throw new Error(`Container '${containerId}' não encontrado no DOM. Verifique se o elemento existe.`);
      }
      throw error;
    }
  };

  return {
    initializeBrick,
  };
}

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