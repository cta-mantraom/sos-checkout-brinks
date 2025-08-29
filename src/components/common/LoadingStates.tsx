import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return <Spinner size={size} className={className} />;
}

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
  className?: string;
}

export function LoadingOverlay({ 
  isLoading, 
  children, 
  message = "Carregando...",
  className 
}: LoadingOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface LoadingCardProps {
  message?: string;
  className?: string;
}

export function LoadingCard({ 
  message = "Carregando...", 
  className 
}: LoadingCardProps) {
  return (
    <div className={cn(
      "flex items-center justify-center p-8 rounded-lg border bg-card",
      className
    )}>
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

interface LoadingButtonProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

export function LoadingButton({ 
  isLoading, 
  children, 
  loadingText = "Carregando...",
  className,
  disabled,
  onClick,
  type = "button"
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2",
        className
      )}
      disabled={disabled || isLoading}
      onClick={onClick}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size="sm" className="mr-2" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

// Estados de loading para formulários
interface FormLoadingStatesProps {
  state: 'idle' | 'validating' | 'submitting' | 'success' | 'error';
  className?: string;
}

export function FormLoadingStates({ state, className }: FormLoadingStatesProps) {
  const stateConfig = {
    idle: { show: false, message: '', color: '' },
    validating: { 
      show: true, 
      message: 'Validando dados...', 
      color: 'text-blue-600' 
    },
    submitting: { 
      show: true, 
      message: 'Enviando formulário...', 
      color: 'text-blue-600' 
    },
    success: { 
      show: true, 
      message: 'Sucesso!', 
      color: 'text-green-600' 
    },
    error: { 
      show: true, 
      message: 'Erro ao processar', 
      color: 'text-red-600' 
    },
  };

  const config = stateConfig[state];

  if (!config.show) return null;

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {(state === 'validating' || state === 'submitting') && (
        <LoadingSpinner size="sm" />
      )}
      <span className={cn("text-sm", config.color)}>
        {config.message}
      </span>
    </div>
  );
}

// Componente para exibir erros
interface LoadingErrorProps {
  error: Error;
  onRetry?: () => void;
  className?: string;
}

export function LoadingError({ error, onRetry, className }: LoadingErrorProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 rounded-lg border bg-card",
      className
    )}>
      <p className="text-destructive mb-4 text-center">{error.message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Tentar Novamente
        </button>
      )}
    </div>
  );
}

// Skeleton para carregamento de listas
interface SkeletonItemProps {
  className?: string;
}

export function SkeletonItem({ className }: SkeletonItemProps) {
  return (
    <div className={cn("animate-pulse", className)}>
      <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-gray-300 rounded w-1/2"></div>
    </div>
  );
}

interface SkeletonListProps {
  items?: number;
  className?: string;
}

export function SkeletonList({ items = 3, className }: SkeletonListProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: items }).map((_, index) => (
        <SkeletonItem key={index} />
      ))}
    </div>
  );
}