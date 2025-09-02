import React from 'react';
import { useMercadoPago } from '@/contexts/MercadoPagoContext';

interface MercadoPagoInitializerProps {
  children: React.ReactNode;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Componente wrapper simplificado que usa o contexto global do MercadoPago
 * Garante que o SDK esteja pronto antes de renderizar os children
 */
export function MercadoPagoInitializer({ 
  children, 
  onReady, 
  onError 
}: MercadoPagoInitializerProps) {
  const { isReady, error } = useMercadoPago();

  React.useEffect(() => {
    if (isReady) {
      console.log('[MercadoPagoInitializer] ✅ MercadoPago está pronto');
      onReady?.();
    }
  }, [isReady, onReady]);

  React.useEffect(() => {
    if (error) {
      console.error('[MercadoPagoInitializer] ❌ Erro:', error);
      onError?.(error);
    }
  }, [error, onError]);

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <h3 className="font-medium text-red-800">Erro ao carregar MercadoPago</h3>
        <p className="text-red-600 text-sm mt-1">{error.message}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Recarregar Página
        </button>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Carregando MercadoPago...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}