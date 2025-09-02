import React from 'react';

/**
 * Hook para gerenciar o Device ID do MercadoPago de forma segura
 * O Device ID é obrigatório para pagamentos seguros
 */
export function useDeviceId() {
  const [deviceId, setDeviceId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const checkIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    let attempts = 0;
    const maxAttempts = 30; // 30 segundos máximo
    const checkInterval = 1000; // Verificar a cada 1 segundo

    const checkDeviceId = () => {
      attempts++;
      
      if (window.MP_DEVICE_SESSION_ID) {
        console.log('✅ Device ID detectado:', {
          id: window.MP_DEVICE_SESSION_ID.substring(0, 8) + '...',
          length: window.MP_DEVICE_SESSION_ID.length,
          attempts
        });
        
        setDeviceId(window.MP_DEVICE_SESSION_ID);
        setIsLoading(false);
        setError(null);
        
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
        return;
      }

      if (attempts >= maxAttempts) {
        const errorMessage = 'Device ID não foi gerado pelo MercadoPago. Recarregue a página.';
        console.error('❌ Device ID timeout após', attempts, 'tentativas');
        setError(errorMessage);
        setIsLoading(false);
        
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
        return;
      }

      console.log(`⏳ Aguardando Device ID... (tentativa ${attempts}/${maxAttempts})`);
    };

    // Primeira verificação imediata
    checkDeviceId();

    // Se não encontrou, começar polling
    if (!window.MP_DEVICE_SESSION_ID) {
      checkIntervalRef.current = setInterval(checkDeviceId, checkInterval);
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, []);

  const retry = React.useCallback(() => {
    setError(null);
    setIsLoading(true);
    setDeviceId(null);
    // O useEffect será executado novamente devido às mudanças de estado
  }, []);

  return {
    deviceId,
    isLoading,
    error,
    retry,
    isReady: !isLoading && !error && !!deviceId
  };
}