import React from 'react';
import { QueryClient, QueryClientProvider, DefaultOptions } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Configurações padrão para queries
const queryConfig: DefaultOptions = {
  queries: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (anteriormente cacheTime)
    retry: (failureCount, error) => {
      // Não tenta novamente para erros 4xx
      if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
        if (error.status >= 400 && error.status < 500) {
          return false;
        }
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    networkMode: 'online',
  },
  mutations: {
    retry: 1,
    networkMode: 'online',
  },
};

// Função para criar o cliente de query
function createQueryClient() {
  return new QueryClient({
    defaultOptions: queryConfig,
    logger: {
      log: (message) => {
        if (import.meta.env.DEV) {
          console.log('[React Query]', message);
        }
      },
      warn: (message) => {
        if (import.meta.env.DEV) {
          console.warn('[React Query]', message);
        }
      },
      error: (error) => {
        console.error('[React Query]', error);
        
        // Aqui você pode integrar com serviços de monitoramento
        // como Sentry, LogRocket, etc.
        if (import.meta.env.PROD) {
          // reportError(error);
        }
      },
    },
  });
}

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Usar useState para garantir que o mesmo cliente seja usado durante toda a vida do componente
  const [queryClient] = React.useState(() => createQueryClient());

  // Cleanup quando o componente for desmontado
  React.useEffect(() => {
    return () => {
      queryClient.clear();
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Mostrar devtools apenas em desenvolvimento */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools 
          initialIsOpen={false} 
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}

// Hook para acessar o query client
export function useQueryClient() {
  const client = React.useContext(QueryClientProvider.context);
  if (!client) {
    throw new Error('useQueryClient must be used within QueryProvider');
  }
  return client;
}

// Função para invalidar queries específicas
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  
  return {
    invalidateProfile: (profileId?: string) => {
      if (profileId) {
        queryClient.invalidateQueries({ queryKey: ['profile', profileId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      }
    },
    
    invalidatePayment: (paymentId?: string) => {
      if (paymentId) {
        queryClient.invalidateQueries({ queryKey: ['payment', paymentId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['payment'] });
      }
    },
    
    invalidateQRCode: (profileId?: string) => {
      if (profileId) {
        queryClient.invalidateQueries({ queryKey: ['qrcode', profileId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['qrcode'] });
      }
    },
    
    invalidateAll: () => {
      queryClient.invalidateQueries();
    },
    
    clearCache: () => {
      queryClient.clear();
    },
  };
}

// Hook para gerenciar estado offline
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
}

// Função para prefetch de dados importantes
export function usePrefetchData() {
  const queryClient = useQueryClient();
  
  return {
    prefetchProfile: (profileId: string) => {
      queryClient.prefetchQuery({
        queryKey: ['profile', profileId],
        queryFn: async () => {
          const response = await fetch(`/api/get-profile?id=${profileId}`);
          if (!response.ok) throw new Error('Failed to fetch profile');
          return response.json();
        },
        staleTime: 5 * 60 * 1000,
      });
    },
    
    prefetchQRCode: (profileId: string) => {
      queryClient.prefetchQuery({
        queryKey: ['qrcode', profileId],
        queryFn: async () => {
          const response = await fetch(`/api/get-qr?profileId=${profileId}`);
          if (response.status === 404) return null;
          if (!response.ok) throw new Error('Failed to fetch QR code');
          return response.json();
        },
        staleTime: 10 * 60 * 1000,
      });
    },
  };
}