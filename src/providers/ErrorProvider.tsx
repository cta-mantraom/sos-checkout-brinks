import React from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ErrorContextType {
  reportError: (error: Error, errorInfo?: Record<string, unknown>) => void;
  clearError: () => void;
}

const ErrorContext = React.createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: React.ReactNode;
}

// Componente de fallback personalizado para erros de rota
function RouteErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  const navigate = useNavigate();
  
  const handleGoHome = () => {
    navigate('/');
    resetError();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Oops! Algo deu errado
          </h1>
          <p className="text-gray-600">
            Encontramos um erro inesperado. Tente uma das opções abaixo.
          </p>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro da Aplicação</AlertTitle>
          <AlertDescription>
            {error.message || 'Erro desconhecido ocorreu'}
          </AlertDescription>
        </Alert>

        {/* Detalhes técnicos apenas em desenvolvimento */}
        {import.meta.env.DEV && (
          <details className="bg-gray-50 p-4 rounded-lg">
            <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
              Detalhes técnicos
            </summary>
            <pre className="mt-2 text-xs overflow-auto text-gray-600">
              {error.stack}
            </pre>
          </details>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={resetError} className="flex items-center">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
          
          <Button variant="outline" onClick={handleRefresh}>
            Recarregar Página
          </Button>
          
          <Button variant="outline" onClick={handleGoHome}>
            <Home className="h-4 w-4 mr-2" />
            Ir para Início
          </Button>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>
            Se o problema persistir, entre em contato com o suporte:
            <br />
            <a 
              href="mailto:suporte@soscheckout.com" 
              className="text-blue-600 hover:underline"
            >
              suporte@soscheckout.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [globalError, setGlobalError] = React.useState<Error | null>(null);

  const reportError = React.useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Erro reportado:', error, errorInfo);
    
    // Aqui você pode integrar com serviços de monitoramento
    // como Sentry, LogRocket, Bugsnag, etc.
    if (import.meta.env.PROD) {
      try {
        // Exemplo de integração com Sentry:
        // Sentry.captureException(error, {
        //   extra: errorInfo,
        //   tags: {
        //     section: 'ErrorProvider'
        //   }
        // });
        
        // Ou enviar para seu próprio serviço de logging
        fetch('/api/log-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name,
            },
            errorInfo,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
          }),
        }).catch(() => {
          // Falhou ao enviar o erro - não há muito que possamos fazer
          console.warn('Falha ao enviar erro para o servidor');
        });
      } catch (loggingError) {
        console.error('Erro ao reportar erro:', loggingError);
      }
    }
  }, []);

  const clearError = React.useCallback(() => {
    setGlobalError(null);
  }, []);

  const contextValue = React.useMemo(
    () => ({ reportError, clearError }),
    [reportError, clearError]
  );

  // Capturar erros não tratados globalmente
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Promise rejeitada não tratada:', event.reason);
      
      // Criar um erro se a razão não for um Error
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      reportError(error, { componentStack: '' });
      
      // Prevenir que o erro apareça no console
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Erro global capturado:', event.error);
      
      const error = event.error instanceof Error 
        ? event.error 
        : new Error(event.message);
      
      reportError(error, { 
        componentStack: `${event.filename}:${event.lineno}:${event.colno}`
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [reportError]);

  // Se houver um erro global, mostrar o fallback
  if (globalError) {
    return (
      <RouteErrorFallback 
        error={globalError} 
        resetError={clearError} 
      />
    );
  }

  return (
    <ErrorContext.Provider value={contextValue}>
      <ErrorBoundary 
        fallback={RouteErrorFallback}
        onError={reportError}
      >
        {children}
      </ErrorBoundary>
    </ErrorContext.Provider>
  );
}

// Hook para usar o contexto de erro
export function useErrorHandler() {
  const context = React.useContext(ErrorContext);
  
  if (!context) {
    throw new Error('useErrorHandler must be used within ErrorProvider');
  }
  
  return context;
}

// Hook para capturar erros em components funcionais
export function useAsyncError() {
  const { reportError } = useErrorHandler();
  
  return React.useCallback(
    (error: Error) => {
      reportError(error, { type: 'asyncError' });
    },
    [reportError]
  );
}

// HOC para capturar erros em componentes específicos
export function withErrorHandling<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = React.forwardRef<unknown, P>((props, ref) => (
    <ErrorBoundary 
      onError={(error, errorInfo) => {
        console.error(`Erro em ${componentName || Component.name}:`, error, errorInfo);
      }}
    >
      <Component {...props as P} ref={ref as React.Ref<unknown>} />
    </ErrorBoundary>
  ));

  WrappedComponent.displayName = `withErrorHandling(${componentName || Component.displayName || Component.name})`;
  
  return WrappedComponent;
}