import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

// Interfaces do MercadoPago
interface MercadoPagoBrick {
  mount: (containerId: string) => void;
  unmount: () => void;
  update: (data: Record<string, unknown>) => void;
}

interface MercadoPagoBricksBuilder {
  create: (type: 'payment' | 'statusScreen' | 'wallet' | 'cardForm', containerId: string, options: Record<string, unknown>) => Promise<MercadoPagoBrick>;
}

interface MercadoPagoInstance {
  bricks: () => MercadoPagoBricksBuilder;
  checkout?: (options: Record<string, unknown>) => void;
  getIdentificationTypes?: () => Promise<Array<{id: string; name: string}>>;
  getPaymentMethods?: (options: Record<string, unknown>) => Promise<unknown>;
  getIssuers?: (options: Record<string, unknown>) => Promise<unknown>;
  getInstallments?: (options: Record<string, unknown>) => Promise<unknown>;
  createCardToken?: (cardData: Record<string, unknown>) => Promise<{id: string}>;
}

// Tipos para o contexto
interface MercadoPagoContextType {
  mp: MercadoPagoInstance | null;
  isReady: boolean;
  error: Error | null;
  deviceId: string | null;
}

// Contexto do MercadoPago
const MercadoPagoContext = createContext<MercadoPagoContextType | undefined>(undefined);

interface MercadoPagoProviderProps {
  children: React.ReactNode;
}

/**
 * Provider global para gerenciar instância única do MercadoPago
 * Evita múltiplas inicializações e garante consistência
 */
export function MercadoPagoProvider({ children }: MercadoPagoProviderProps) {
  const [mp, setMp] = useState<MercadoPagoInstance | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const initializationRef = useRef(false);

  useEffect(() => {
    // Evitar múltiplas inicializações
    if (initializationRef.current) {
      console.log('[MercadoPagoProvider] Já inicializado, pulando...');
      return;
    }

    initializationRef.current = true;

    const initializeMercadoPago = async () => {
      try {
        console.log('[MercadoPagoProvider] Iniciando inicialização...');

        // Aguardar SDK estar disponível
        let attempts = 0;
        const maxAttempts = 50; // 5 segundos (50 * 100ms)
        
        while (!window.MercadoPago && attempts < maxAttempts) {
          console.log(`[MercadoPagoProvider] Aguardando SDK... tentativa ${attempts + 1}/${maxAttempts}`);
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!window.MercadoPago) {
          throw new Error('MercadoPago SDK não foi carregado após 5 segundos');
        }

        console.log('[MercadoPagoProvider] SDK disponível, inicializando...');

        // Obter public key
        const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
        if (!publicKey || publicKey === 'YOUR_MERCADOPAGO_PUBLIC_KEY_HERE') {
          throw new Error('MercadoPago Public Key não configurada. Configure VITE_MERCADOPAGO_PUBLIC_KEY no arquivo .env');
        }

        // Criar instância única do MercadoPago
        const mpInstance = new window.MercadoPago(publicKey, {
          locale: 'pt-BR'
        });

        console.log('[MercadoPagoProvider] Instância criada com sucesso');

        // Aguardar Device ID
        let deviceAttempts = 0;
        const maxDeviceAttempts = 30; // 3 segundos
        
        while (!window.MP_DEVICE_SESSION_ID && deviceAttempts < maxDeviceAttempts) {
          console.log(`[MercadoPagoProvider] Aguardando Device ID... tentativa ${deviceAttempts + 1}/${maxDeviceAttempts}`);
          await new Promise(resolve => setTimeout(resolve, 100));
          deviceAttempts++;
        }

        if (window.MP_DEVICE_SESSION_ID) {
          console.log('[MercadoPagoProvider] Device ID detectado:', window.MP_DEVICE_SESSION_ID.substring(0, 8) + '...');
          setDeviceId(window.MP_DEVICE_SESSION_ID);
        } else {
          console.warn('[MercadoPagoProvider] Device ID não detectado após 3 segundos');
        }

        setMp(mpInstance);
        setIsReady(true);
        setError(null);
        console.log('[MercadoPagoProvider] ✅ Inicialização completa');

      } catch (err) {
        const initError = err instanceof Error ? err : new Error('Erro ao inicializar MercadoPago');
        console.error('[MercadoPagoProvider] ❌ Erro na inicialização:', initError);
        setError(initError);
        setIsReady(false);
      }
    };

    // Inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeMercadoPago);
    } else {
      initializeMercadoPago();
    }

    return () => {
      document.removeEventListener('DOMContentLoaded', initializeMercadoPago);
    };
  }, []);

  // Monitorar mudanças no Device ID
  useEffect(() => {
    const checkDeviceId = setInterval(() => {
      if (window.MP_DEVICE_SESSION_ID && !deviceId) {
        console.log('[MercadoPagoProvider] Device ID detectado tardiamente:', window.MP_DEVICE_SESSION_ID.substring(0, 8) + '...');
        setDeviceId(window.MP_DEVICE_SESSION_ID);
      }
    }, 500);

    return () => clearInterval(checkDeviceId);
  }, [deviceId]);

  const contextValue: MercadoPagoContextType = {
    mp,
    isReady,
    error,
    deviceId
  };

  return (
    <MercadoPagoContext.Provider value={contextValue}>
      {children}
    </MercadoPagoContext.Provider>
  );
}

/**
 * Hook para usar o contexto do MercadoPago
 */
export function useMercadoPago() {
  const context = useContext(MercadoPagoContext);
  
  if (context === undefined) {
    throw new Error('useMercadoPago deve ser usado dentro de um MercadoPagoProvider');
  }
  
  return context;
}

/**
 * Hook para criar Payment Brick usando instância global
 */
export function useMercadoPagoBrick() {
  const { mp, isReady, error: contextError } = useMercadoPago();
  const brickInstancesRef = useRef<Map<string, MercadoPagoBrick>>(new Map());

  const createBrick = async (
    containerId: string,
    options: {
      initialization: {
        amount: number;
        preferenceId?: string | null;
      };
      customization?: Record<string, unknown>;
      callbacks: {
        onReady: () => void;
        onSubmit: (data: unknown) => Promise<unknown>;
        onError: (error: { message?: string }) => void;
      };
    }
  ) => {
    if (!isReady || !mp) {
      throw new Error('MercadoPago não está pronto. Aguarde a inicialização.');
    }

    if (contextError) {
      throw contextError;
    }

    // Verificar se já existe um brick para este container
    const existingBrick = brickInstancesRef.current.get(containerId);
    if (existingBrick) {
      console.log(`[useMercadoPagoBrick] Brick já existe para ${containerId}, desmontando...`);
      try {
        existingBrick.unmount();
      } catch (e) {
        console.warn(`[useMercadoPagoBrick] Erro ao desmontar brick existente:`, e);
      }
      brickInstancesRef.current.delete(containerId);
    }

    try {
      console.log(`[useMercadoPagoBrick] Criando novo Payment Brick para ${containerId}`);
      
      const bricksBuilder = mp.bricks();
      const brick = await bricksBuilder.create('payment', containerId, {
        initialization: options.initialization,
        customization: options.customization || {
          paymentMethods: {
            creditCard: 'all',
            debitCard: 'all',
            bankTransfer: 'all',  // PIX
            ticket: 'none',  // Desabilitar boleto
            mercadoPago: 'none',  // Desabilitar Wallet
          },
          visual: {
            style: {
              customVariables: {
                formBackgroundColor: '#ffffff',
                baseColor: '#3b82f6',
                completeColor: '#10b981',
                errorColor: '#ef4444',
                fontSizeExtraSmall: '12px',
                fontSizeSmall: '14px',
                fontSizeMedium: '16px',
                fontSizeLarge: '18px',
                fontWeightNormal: '400',
                fontWeightSemiBold: '600',
                formPadding: '16px',
                formBorderRadius: '8px',
              }
            }
          }
        },
        callbacks: options.callbacks,
      });

      // Armazenar referência do brick
      brickInstancesRef.current.set(containerId, brick);
      console.log(`[useMercadoPagoBrick] ✅ Payment Brick criado com sucesso para ${containerId}`);
      
      return brick;
    } catch (error) {
      console.error(`[useMercadoPagoBrick] ❌ Erro ao criar Payment Brick:`, error);
      
      // Se o erro for "Brick already initialized", tentar desmontar e recriar
      if (error instanceof Error && error.message.includes('already initialized')) {
        console.log(`[useMercadoPagoBrick] Tentando limpar e recriar...`);
        
        // Limpar container
        const container = document.getElementById(containerId);
        if (container) {
          container.innerHTML = '';
        }
        
        // Aguardar um pouco e tentar novamente
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Tentar criar novamente (sem recursão infinita)
        const bricksBuilder = mp.bricks();
        const brick = await bricksBuilder.create('payment', containerId, {
          initialization: options.initialization,
          customization: options.customization,
          callbacks: options.callbacks,
        });
        
        brickInstancesRef.current.set(containerId, brick);
        return brick;
      }
      
      throw error;
    }
  };

  const unmountBrick = (containerId: string) => {
    const brick = brickInstancesRef.current.get(containerId);
    if (brick) {
      try {
        console.log(`[useMercadoPagoBrick] Desmontando brick ${containerId}`);
        brick.unmount();
        brickInstancesRef.current.delete(containerId);
      } catch (e) {
        console.warn(`[useMercadoPagoBrick] Erro ao desmontar brick:`, e);
      }
    }
  };

  const unmountAllBricks = () => {
    console.log(`[useMercadoPagoBrick] Desmontando todos os bricks...`);
    brickInstancesRef.current.forEach((brick, containerId) => {
      try {
        brick.unmount();
        console.log(`[useMercadoPagoBrick] Brick ${containerId} desmontado`);
      } catch (e) {
        console.warn(`[useMercadoPagoBrick] Erro ao desmontar brick ${containerId}:`, e);
      }
    });
    brickInstancesRef.current.clear();
  };

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      unmountAllBricks();
    };
  }, []);

  return {
    createBrick,
    unmountBrick,
    unmountAllBricks,
    isReady,
    error: contextError
  };
}