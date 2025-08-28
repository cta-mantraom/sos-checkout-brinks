import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { FormErrorDisplay } from '@/components/common/ErrorBoundary';
import { useMercadoPagoBrick } from '@/hooks/usePayment';
import { SubscriptionType } from '@/schemas/payment';
import { SUBSCRIPTION_PRICES } from '@/lib/constants/prices';
import { CreditCard, Smartphone, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentBrickProps {
  subscriptionType: SubscriptionType;
  profileId: string;
  amount: number;
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentError: (error: any) => void;
  onPaymentPending?: (paymentData: any) => void;
  className?: string;
  disabled?: boolean;
}

interface BrickInstance {
  mount: (containerId: string) => void;
  unmount: () => void;
  update: (data: any) => void;
}

export function PaymentBrick({
  subscriptionType,
  profileId,
  amount,
  onPaymentSuccess,
  onPaymentError,
  onPaymentPending,
  className,
  disabled = false,
}: PaymentBrickProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [brickInstance, setBrickInstance] = React.useState<BrickInstance | null>(null);
  const { initializeBrick } = useMercadoPagoBrick();

  const containerId = 'payment-brick-container';

  React.useEffect(() => {
    const loadBrick = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const brickOptions = {
          initialization: {
            amount: amount,
            preferenceId: null, // será gerado pelo backend
          },
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
                  fontSizeExtraSmall: '12px',
                  fontSizeSmall: '14px',
                  fontSizeMedium: '16px',
                  fontSizeLarge: '18px',
                  fontWeightNormal: '400',
                  fontWeightSemiBold: '600',
                  formPadding: '16px',
                  formBorderRadius: '8px',
                },
              },
            },
          },
          callbacks: {
            onReady: () => {
              console.log('Payment Brick está pronto');
              setIsLoading(false);
            },
            onSubmit: async ({ selectedPaymentMethod, formData }: any) => {
              try {
                const paymentData = {
                  subscriptionType,
                  profileId,
                  amount,
                  paymentMethod: selectedPaymentMethod,
                  formData,
                };

                // Enviar dados para o backend processar o pagamento
                const response = await fetch('/api/process-payment', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(paymentData),
                });

                const result = await response.json();

                if (!response.ok) {
                  throw new Error(result.message || 'Erro ao processar pagamento');
                }

                // Verificar status do pagamento
                switch (result.status) {
                  case 'approved':
                    onPaymentSuccess(result);
                    break;
                  case 'pending':
                    onPaymentPending?.(result);
                    break;
                  case 'rejected':
                    onPaymentError(new Error(result.status_detail || 'Pagamento rejeitado'));
                    break;
                  default:
                    onPaymentError(new Error('Status de pagamento desconhecido'));
                }

                return result;
              } catch (error) {
                console.error('Erro no processamento do pagamento:', error);
                onPaymentError(error);
                throw error;
              }
            },
            onError: (error: any) => {
              console.error('Erro no Payment Brick:', error);
              setError(error.message || 'Erro no formulário de pagamento');
              onPaymentError(error);
            },
          },
        };

        const brick = await initializeBrick(containerId, brickOptions);
        setBrickInstance(brick);
      } catch (err) {
        console.error('Erro ao carregar Payment Brick:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar formulário de pagamento');
        setIsLoading(false);
      }
    };

    // Carregar o SDK do MercadoPago primeiro
    if (!window.MercadoPago) {
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.onload = () => loadBrick();
      script.onerror = () => {
        setError('Erro ao carregar SDK do MercadoPago');
        setIsLoading(false);
      };
      document.head.appendChild(script);

      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    } else {
      loadBrick();
    }

    // Cleanup
    return () => {
      if (brickInstance) {
        try {
          brickInstance.unmount();
        } catch (err) {
          console.warn('Erro ao desmontar brick:', err);
        }
      }
    };
  }, [subscriptionType, profileId, amount]);

  const subscriptionInfo = {
    basic: {
      name: 'Plano Básico',
      price: SUBSCRIPTION_PRICES.basic,
      duration: '30 dias',
      description: 'Acesso completo por 1 mês',
      icon: <Smartphone className="h-5 w-5" />,
    },
    premium: {
      name: 'Plano Premium',
      price: SUBSCRIPTION_PRICES.premium,
      duration: '365 dias',
      description: 'Acesso completo por 1 ano',
      icon: <CreditCard className="h-5 w-5" />,
    },
  };

  const currentSubscription = subscriptionInfo[subscriptionType];

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <FormErrorDisplay 
            error={error} 
            onDismiss={() => setError(null)}
          />
          <div className="mt-4 text-center">
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Recarregar Página
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("w-full max-w-2xl mx-auto space-y-6", className)}>
      {/* Resumo da Assinatura */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            {currentSubscription.icon}
            <div>
              <CardTitle>{currentSubscription.name}</CardTitle>
              <CardDescription>{currentSubscription.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Duração:</p>
              <p className="font-medium">{currentSubscription.duration}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total:</p>
              <p className="text-2xl font-bold text-primary">
                R$ {amount.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de Pagamento */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Receipt className="h-5 w-5" />
            <CardTitle>Dados de Pagamento</CardTitle>
          </div>
          <CardDescription>
            Escolha a forma de pagamento e preencha os dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <LoadingSpinner size="lg" />
                <p className="text-sm text-muted-foreground">
                  Carregando formulário de pagamento...
                </p>
              </div>
            </div>
          ) : (
            <div 
              id={containerId}
              className={cn("min-h-[400px]", { "opacity-50 pointer-events-none": disabled })}
            />
          )}
        </CardContent>
      </Card>

      {/* Informações de Segurança */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm text-muted-foreground">
            <h4 className="font-medium text-foreground mb-3">Pagamento Seguro</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></div>
                <span>Seus dados são protegidos com criptografia SSL</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></div>
                <span>Processamento via MercadoPago, certificado PCI DSS</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></div>
                <span>Não armazenamos dados de cartão de crédito</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></div>
                <span>Transações monitoradas 24/7</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métodos de Pagamento Aceitos */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-medium mb-3">Métodos de Pagamento Aceitos</h4>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="bg-gray-100 px-2 py-1 rounded">PIX</span>
            <span className="bg-gray-100 px-2 py-1 rounded">Cartão de Crédito</span>
            <span className="bg-gray-100 px-2 py-1 rounded">Cartão de Débito</span>
            <span className="bg-gray-100 px-2 py-1 rounded">Boleto Bancário</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}