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
  ensureDeviceId?: (maxRetries?: number) => Promise<string | null>; // ✅ Função para garantir Device ID
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
  const deviceIdPromiseRef = useRef<Promise<string | null> | null>(null);

  // ✅ NOVA FUNÇÃO: Garantir Device ID ANTES de qualquer operação
  const ensureDeviceId = async (maxRetries = 50): Promise<string | null> => {
    // Se já existe uma promessa em andamento, usar ela
    if (deviceIdPromiseRef.current) {
      return deviceIdPromiseRef.current;
    }

    // Criar nova promessa para Device ID
    deviceIdPromiseRef.current = new Promise((resolve) => {
      let attempts = 0;
      
      const checkDeviceId = () => {
        if (window.MP_DEVICE_SESSION_ID) {
          const deviceId = window.MP_DEVICE_SESSION_ID;
          console.log(`[MercadoPagoProvider] ✅ Device ID capturado (tentativa ${attempts + 1}):`, deviceId.substring(0, 8) + '...');
          setDeviceId(deviceId);
          resolve(deviceId);
          return;
        }

        attempts++;
        if (attempts >= maxRetries) {
          console.error('[MercadoPagoProvider] ❌ Device ID não foi detectado após', maxRetries, 'tentativas');
          resolve(null);
          return;
        }

        console.log(`[MercadoPagoProvider] Aguardando Device ID... tentativa ${attempts}/${maxRetries}`);
        setTimeout(checkDeviceId, 100);
      };

      checkDeviceId();
    });

    return deviceIdPromiseRef.current;
  };

  useEffect(() => {
    // Evitar múltiplas inicializações
    if (initializationRef.current) {
      console.log('[MercadoPagoProvider] Já inicializado, pulando...');
      return;
    }

    initializationRef.current = true;

    const initializeMercadoPago = async () => {
      try {
        console.log('[MercadoPagoProvider] 🚀 Iniciando inicialização...');

        // ✅ ETAPA 1: Aguardar SDK estar disponível
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

        console.log('[MercadoPagoProvider] ✅ SDK disponível');

        // ✅ ETAPA 2: Obter public key APENAS do frontend (SEGURO)
        // ❌ NUNCA usar getMercadoPagoCredentials() no frontend - contém secrets
        const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
        if (!publicKey || publicKey === 'YOUR_MERCADOPAGO_PUBLIC_KEY_HERE') {
          throw new Error('MercadoPago Public Key não configurada. Configure VITE_MERCADOPAGO_PUBLIC_KEY no arquivo .env');
        }
        console.log('[MercadoPagoProvider] ✅ Public Key obtida do frontend (seguro)');

        // ✅ ETAPA 3: Criar instância MercadoPago
        const mpInstance = new window.MercadoPago(publicKey, {
          locale: 'pt-BR'
        });

        console.log('[MercadoPagoProvider] ✅ Instância MercadoPago criada');

        // ✅ ETAPA 4: AGUARDAR Device ID - CRÍTICO PARA diff_param_bins
        console.log('[MercadoPagoProvider] ⏳ Aguardando Device ID (crítico para evitar diff_param_bins)...');
        const detectedDeviceId = await ensureDeviceId(80); // 8 segundos máximo
        
        if (!detectedDeviceId) {
          // Device ID é CRÍTICO - mas não bloquear totalmente
          console.warn('[MercadoPagoProvider] ⚠️ Device ID não detectado - pagamentos com cartão podem falhar');
        } else {
          console.log('[MercadoPagoProvider] ✅ Device ID garantido para sessão:', detectedDeviceId.substring(0, 8) + '...');
        }

        // ✅ ETAPA 5: Finalizar inicialização
        setMp(mpInstance);
        setIsReady(true);
        setError(null);
        console.log('[MercadoPagoProvider] 🎉 Inicialização completa com Device ID sincronizado');

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

  // ✅ NOVO: Monitoramento inteligente de Device ID
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    // Só monitorar se ainda não temos Device ID
    if (!deviceId) {
      intervalId = setInterval(() => {
        if (window.MP_DEVICE_SESSION_ID && !deviceId) {
          const newDeviceId = window.MP_DEVICE_SESSION_ID;
          console.log('[MercadoPagoProvider] 🔄 Device ID detectado tardiamente:', newDeviceId.substring(0, 8) + '...');
          setDeviceId(newDeviceId);
          
          // Atualizar promessa de Device ID também
          deviceIdPromiseRef.current = Promise.resolve(newDeviceId);
        }
      }, 200); // Verificar mais frequentemente
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [deviceId]);

  const contextValue: MercadoPagoContextType = {
    mp,
    isReady,
    error,
    deviceId,
    ensureDeviceId // ✅ Expor função para garantir Device ID
  } as MercadoPagoContextType & { ensureDeviceId: typeof ensureDeviceId };

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
 * Hook para criar Payment Brick usando instância global com sincronização de Device ID
 */
export function useMercadoPagoBrick() {
  const context = useMercadoPago();
  const { mp, isReady, error: contextError, deviceId } = context;
  const ensureDeviceId = (context as MercadoPagoContextType & { ensureDeviceId?: (maxRetries?: number) => Promise<string | null> }).ensureDeviceId;
  
  const brickInstancesRef = useRef<Map<string, MercadoPagoBrick>>(new Map());
  const creationInProgressRef = useRef<Map<string, Promise<MercadoPagoBrick>>>(new Map());

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

    // ✅ PROTEÇÃO CONTRA CRIAÇÃO SIMULTÂNEA
    const existingCreation = creationInProgressRef.current.get(containerId);
    if (existingCreation) {
      console.log(`[useMercadoPagoBrick] ⏳ Criação em progresso para ${containerId}, aguardando...`);
      return existingCreation;
    }

    // ✅ GARANTIR DEVICE ID ANTES DE CRIAR BRICK - CRÍTICO!
    console.log(`[useMercadoPagoBrick] 🔒 Garantindo Device ID antes de criar Payment Brick...`);
    let finalDeviceId = deviceId;
    
    if (!finalDeviceId && ensureDeviceId) {
      console.log(`[useMercadoPagoBrick] 🔄 Device ID não disponível, forçando detecção...`);
      finalDeviceId = await ensureDeviceId(50); // 5 segundos máximo
      
      if (!finalDeviceId) {
        console.error(`[useMercadoPagoBrick] ❌ CRÍTICO: Device ID não detectado - pagamentos com cartão irão falhar!`);
        // Continuar mesmo assim, mas alertar
      } else {
        console.log(`[useMercadoPagoBrick] ✅ Device ID garantido:`, finalDeviceId.substring(0, 8) + '...');
      }
    }

    // Criar promessa de criação
    const creationPromise = (async () => {
      try {
        // ✅ LIMPEZA SEGURA DE BRICK EXISTENTE
        const existingBrick = brickInstancesRef.current.get(containerId);
        if (existingBrick) {
          console.log(`[useMercadoPagoBrick] 🧹 Desmontando brick existente para ${containerId}`);
          try {
            existingBrick.unmount();
            await new Promise(resolve => setTimeout(resolve, 100)); // Aguardar desmontagem
          } catch (e) {
            console.warn(`[useMercadoPagoBrick] ⚠️ Erro ao desmontar brick:`, e);
          }
          brickInstancesRef.current.delete(containerId);
        }

        // ✅ LIMPEZA COMPLETA DO CONTAINER
        const container = document.getElementById(containerId);
        if (container) {
          container.innerHTML = '';
          // Aguardar um ciclo para garantir limpeza
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        console.log(`[useMercadoPagoBrick] 🚀 Criando Payment Brick para ${containerId} com Device ID:`, finalDeviceId?.substring(0, 8) + '...');
        
        const bricksBuilder = mp.bricks();
        const brick = await bricksBuilder.create('payment', containerId, {
          initialization: options.initialization,
          customization: options.customization || {
            paymentMethods: {
              creditCard: 'all',
              debitCard: 'all',
              bankTransfer: 'all',  // PIX habilitado
              // NUNCA incluir ticket ou mercadoPago - causam erro 422
            },
            visual: {
              style: {
                customVariables: {
                  formBackgroundColor: '#ffffff',
                  baseColor: '#3b82f6',
                  errorColor: '#ef4444',
                  fontSizeExtraSmall: '12px',
                  fontSizeSmall: '14px',
                  fontSizeMedium: '16px',
                  fontSizeLarge: '18px',
                  fontWeightNormal: '400',
                  fontWeightSemiBold: '600',
                  formPadding: '16px'
                  // Removidas propriedades inválidas
                }
              }
            }
          },
          callbacks: {
            ...options.callbacks,
            // ✅ WRAPPER PARA VALIDAR DEVICE ID NO SUBMIT
            onSubmit: async (data: unknown) => {
              console.log(`[useMercadoPagoBrick] 🔍 Submit interceptado - validando Device ID...`);
              
              // Verificar Device ID no momento exato do submit
              const currentDeviceId = window.MP_DEVICE_SESSION_ID || finalDeviceId;
              if (!currentDeviceId) {
                console.error(`[useMercadoPagoBrick] ❌ BLOQUEIO: Device ID ausente no submit!`);
                throw new Error('Device ID é obrigatório para segurança. Recarregue a página e tente novamente.');
              }
              
              console.log(`[useMercadoPagoBrick] ✅ Device ID validado no submit:`, currentDeviceId.substring(0, 8) + '...');
              
              // Chamar callback original
              return await options.callbacks.onSubmit(data);
            }
          },
        });

        // ✅ ARMAZENAR REFERÊNCIA E LIMPAR PROGRESSO
        brickInstancesRef.current.set(containerId, brick);
        creationInProgressRef.current.delete(containerId);
        
        console.log(`[useMercadoPagoBrick] 🎉 Payment Brick criado com sucesso para ${containerId}`);
        return brick;
        
      } catch (error) {
        // Limpar progresso em caso de erro
        creationInProgressRef.current.delete(containerId);
        
        console.error(`[useMercadoPagoBrick] ❌ Erro ao criar Payment Brick:`, error);
        
        // ✅ TRATAMENTO MELHORADO DE ERROS
        if (error instanceof Error) {
          if (error.message.includes('already initialized')) {
            console.log(`[useMercadoPagoBrick] 🔄 Brick já inicializado, tentando limpeza forçada...`);
            
            // Limpeza mais agressiva
            const container = document.getElementById(containerId);
            if (container) {
              container.innerHTML = '';
              await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // Uma única tentativa de recriação
            throw new Error('Payment Brick já foi inicializado. Recarregue a página para tentar novamente.');
          }
          
          if (error.message.includes('diff_param_bins')) {
            console.error(`[useMercadoPagoBrick] 💥 DIFF_PARAM_BINS detectado - Device ID dessincronizado!`);
            throw new Error('Erro de sincronização de dispositivo. Recarregue a página e tente novamente.');
          }
        }
        
        throw error;
      }
    })();

    // Armazenar promessa de criação
    creationInProgressRef.current.set(containerId, creationPromise);
    
    return creationPromise;
  };

  const unmountBrick = (containerId: string) => {
    // Cancelar criação em progresso se existir
    creationInProgressRef.current.delete(containerId);
    
    const brick = brickInstancesRef.current.get(containerId);
    if (brick) {
      try {
        console.log(`[useMercadoPagoBrick] 🧹 Desmontando brick ${containerId}`);
        brick.unmount();
        brickInstancesRef.current.delete(containerId);
        
        // Limpar container também
        const container = document.getElementById(containerId);
        if (container) {
          container.innerHTML = '';
        }
      } catch (e) {
        console.warn(`[useMercadoPagoBrick] ⚠️ Erro ao desmontar brick:`, e);
      }
    }
  };

  const unmountAllBricks = () => {
    console.log(`[useMercadoPagoBrick] 🧹 Desmontando todos os bricks...`);
    
    // Cancelar todas as criações em progresso
    creationInProgressRef.current.clear();
    
    brickInstancesRef.current.forEach((brick, containerId) => {
      try {
        brick.unmount();
        console.log(`[useMercadoPagoBrick] ✅ Brick ${containerId} desmontado`);
        
        // Limpar container
        const container = document.getElementById(containerId);
        if (container) {
          container.innerHTML = '';
        }
      } catch (e) {
        console.warn(`[useMercadoPagoBrick] ⚠️ Erro ao desmontar brick ${containerId}:`, e);
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