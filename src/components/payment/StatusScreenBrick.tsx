import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { AlertCircle } from 'lucide-react';
import { useMercadoPago } from '@/contexts/MercadoPagoContext';

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
  const initializationRef = React.useRef(false);
  
  const { mp, isReady } = useMercadoPago();

  console.log('[StatusScreenBrick] Componente montado com paymentId:', paymentId);
  console.log('[StatusScreenBrick] DEBUG - Tipo do paymentId:', typeof paymentId, 'Valor:', paymentId);
  console.log('[StatusScreenBrick] DEBUG - ID deve ser o externalId do MercadoPago (número), não nosso ID interno');

  React.useEffect(() => {
    if (!paymentId) {
      console.error('[StatusScreenBrick] ID do pagamento não fornecido');
      setError('ID do pagamento não fornecido');
      setIsLoading(false);
      return;
    }
    
    // Validar se é um ID válido do MercadoPago (deve ser numérico)
    if (paymentId.startsWith('payment_')) {
      console.error('[StatusScreenBrick] ERRO: Recebido ID interno em vez do externalId do MercadoPago!');
      console.error('[StatusScreenBrick] ID recebido:', paymentId);
      console.error('[StatusScreenBrick] Esperado: ID numérico do MercadoPago (ex: 123744491503)');
      setError('ID de pagamento inválido - usando ID interno em vez do ID do MercadoPago');
      setIsLoading(false);
      return;
    }
    
    // Aguardar MercadoPago estar pronto
    if (!isReady || !mp) {
      console.log('[StatusScreenBrick] Aguardando MercadoPago estar pronto...');
      return;
    }
    
    // Evitar múltiplas inicializações
    if (initializationRef.current) {
      console.log('[StatusScreenBrick] Já inicializado, pulando...');
      return;
    }
    
    initializationRef.current = true;

    console.log('[StatusScreenBrick] Inicializando Status Screen para paymentId:', paymentId);
    
    const initializeStatusScreen = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // MercadoPago já está inicializado via contexto global
        if (!mp) {
          throw new Error('MercadoPago não está inicializado');
        }
        
        // Aguardar container estar no DOM
        await new Promise(resolve => setTimeout(resolve, 100));

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
          console.log('[StatusScreenBrick] Iniciando polling para paymentId:', paymentId);
          
          // Limpar intervalo anterior se existir
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }

          pollIntervalRef.current = setInterval(async () => {
            try {
              // Usar endpoint payment-status existente com mercadoPagoId
              const url = `/api/payment-status?mercadoPagoId=${paymentId}`;
              console.log('[StatusScreenBrick] Fazendo polling:', url);
              
              const response = await fetch(url);
              
              if (!response.ok) {
                console.error('[StatusScreenBrick] Erro ao verificar status:', response.status, response.statusText);
                return;
              }

              const data = await response.json();
              console.log('[StatusScreenBrick] Status recebido:', data.status);

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
    
    // Cleanup
    return () => {
      initializationRef.current = false;
    };
  }, [paymentId, navigate, onSuccess, onError, isReady, mp]);

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