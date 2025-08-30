import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { AlertCircle } from 'lucide-react';

interface StatusScreenBrickProps {
  paymentId: string; // ID do pagamento no MercadoPago
  onSuccess?: (paymentData: unknown) => void;
  onError?: (error: Error) => void;
  className?: string;
}

interface MercadoPagoStatusScreen {
  mount: (containerId: string) => void;
  unmount: () => void;
}

declare global {
  interface Window {
    statusScreenBrickController?: MercadoPagoStatusScreen;
  }
}

export function StatusScreenBrick({
  paymentId,
  onSuccess,
  onError,
  className
}: StatusScreenBrickProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const navigate = useNavigate();
  const containerId = `status-screen-brick-${paymentId}`;
  const pollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (!paymentId) {
      setError('ID do pagamento não fornecido');
      setIsLoading(false);
      return;
    }

    const initializeStatusScreen = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Verificar se MercadoPago SDK está carregado
        if (!window.MercadoPago) {
          // Carregar SDK se ainda não estiver carregado
          await new Promise<void>((resolve, reject) => {
            if (document.querySelector('script[src*="sdk.mercadopago.com"]')) {
              // SDK já está sendo carregado, aguardar
              const checkInterval = setInterval(() => {
                if (window.MercadoPago) {
                  clearInterval(checkInterval);
                  resolve();
                }
              }, 100);
              
              // Timeout após 10 segundos
              setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('Timeout ao carregar SDK do MercadoPago'));
              }, 10000);
            } else {
              // Carregar SDK
              const script = document.createElement('script');
              script.src = 'https://sdk.mercadopago.com/js/v2';
              script.onload = () => resolve();
              script.onerror = () => reject(new Error('Erro ao carregar SDK do MercadoPago'));
              document.head.appendChild(script);
            }
          });
        }

        // Aguardar container estar no DOM
        await new Promise(resolve => setTimeout(resolve, 100));

        const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
        if (!publicKey || publicKey === 'YOUR_MERCADOPAGO_PUBLIC_KEY_HERE') {
          throw new Error('MercadoPago Public Key não configurada');
        }

        // Inicializar MercadoPago
        const mp = new window.MercadoPago(publicKey, {
          locale: 'pt-BR'
        });

        // Configurar Status Screen Brick
        const bricksBuilder = mp.bricks();
        
        const settings = {
          initialization: {
            paymentId: paymentId, // ID do pagamento no MercadoPago
          },
          customization: {
            visual: {
              hideFormTitle: false,
              style: {
                theme: 'default', // ou 'dark', 'bootstrap', 'flat'
              }
            },
            backUrls: {
              error: `${window.location.origin}/checkout`,
              return: `${window.location.origin}/success`
            }
          },
          callbacks: {
            onReady: () => {
              console.log('Status Screen Brick está pronto');
              setIsLoading(false);
              
              // Iniciar polling para verificar status
              startPolling();
            },
            onError: (error: { message?: string }) => {
              console.error('Erro no Status Screen Brick:', error);
              setError(error.message || 'Erro ao carregar status do pagamento');
              onError?.(new Error(error.message || 'Erro desconhecido'));
              setIsLoading(false);
            },
          },
        };

        // Criar Status Screen Brick
        // O tipo 'statusScreen' não está nos tipos padrão, usar assertion
        window.statusScreenBrickController = await bricksBuilder.create(
          'statusScreen' as 'payment',
          containerId,
          settings
        );

        // Função para fazer polling do status usando /api/payment-status
        const startPolling = () => {
          // Limpar intervalo anterior se existir
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }

          pollIntervalRef.current = setInterval(async () => {
            try {
              // Usar endpoint payment-status existente com mercadoPagoId
              const response = await fetch(`/api/payment-status?mercadoPagoId=${paymentId}`);
              
              if (!response.ok) {
                console.error('Erro ao verificar status:', response.statusText);
                return;
              }

              const data = await response.json();
              console.log('Status do pagamento:', data.status);

              if (data.status === 'approved') {
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current);
                  pollIntervalRef.current = null;
                }
                onSuccess?.(data);
                
                // Redirecionar para página de sucesso após 2 segundos
                setTimeout(() => {
                  navigate('/success');
                }, 2000);
              } else if (data.status === 'rejected' || data.status === 'cancelled') {
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current);
                  pollIntervalRef.current = null;
                }
                onError?.(new Error(`Pagamento ${data.status}`));
              }
            } catch (err) {
              console.error('Erro no polling:', err);
            }
          }, 5000); // Verificar a cada 5 segundos
        };

      } catch (err) {
        console.error('Erro ao inicializar Status Screen:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar status do pagamento');
        onError?.(err instanceof Error ? err : new Error('Erro desconhecido'));
        setIsLoading(false);
      }
    };

    initializeStatusScreen();

    // Cleanup
    return () => {
      // Limpar polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      // Desmontar Status Screen Brick
      if (window.statusScreenBrickController) {
        try {
          window.statusScreenBrickController.unmount();
          window.statusScreenBrickController = undefined;
        } catch (err) {
          console.warn('Erro ao desmontar Status Screen:', err);
        }
      }
    };
  }, [paymentId, navigate, onSuccess, onError]);

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <h3 className="text-lg font-semibold">Erro ao carregar pagamento</h3>
            <p className="text-sm text-muted-foreground text-center">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-8">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-muted-foreground">Carregando status do pagamento...</p>
        </div>
      )}
      
      {/* Container para o Status Screen Brick */}
      <div id={containerId} className="w-full" />
    </div>
  );
}