import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo?: React.ErrorInfo;
  resetError: () => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log do erro
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
    
    // Callback personalizado para logging
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error!}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

// Componente de fallback padrão
function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <Card className="w-full max-w-2xl mx-auto my-8">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <CardTitle className="text-red-700">Ops! Algo deu errado</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro na aplicação</AlertTitle>
          <AlertDescription>
            Ocorreu um erro inesperado. Por favor, tente novamente ou entre em contato com o suporte se o problema persistir.
          </AlertDescription>
        </Alert>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
              Detalhes técnicos (apenas em desenvolvimento)
            </summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
        
        <div className="flex space-x-2">
          <Button onClick={resetError} className="flex items-center">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Recarregar Página
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// HOC para facilitar o uso
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorFallback?: React.ComponentType<ErrorFallbackProps>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={errorFallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook para reportar erros manualmente
export function useErrorHandler() {
  return (error: Error, errorInfo?: any) => {
    console.error('Erro capturado manualmente:', error, errorInfo);
    
    // Aqui você poderia enviar para um serviço de monitoramento
    // como Sentry, LogRocket, etc.
  };
}

// Componente para erros de formulário
interface FormErrorDisplayProps {
  error: string | Error | null;
  className?: string;
  onDismiss?: () => void;
}

export function FormErrorDisplay({ error, className, onDismiss }: FormErrorDisplayProps) {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Erro</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{errorMessage}</span>
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Fechar
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Componente para erros de carregamento
interface LoadingErrorProps {
  error: Error;
  onRetry: () => void;
  className?: string;
}

export function LoadingError({ error, onRetry, className }: LoadingErrorProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Erro ao carregar dados
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {error.message}
            </p>
          </div>
          <Button onClick={onRetry} className="flex items-center">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}