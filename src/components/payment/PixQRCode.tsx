import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, QrCode, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PixQRCodeProps {
  qrCode?: string;
  qrCodeBase64?: string;
  amount: number;
  status?: 'pending' | 'approved' | 'rejected';
  onCopyCode?: () => void;
  className?: string;
}

export function PixQRCode({
  qrCode,
  qrCodeBase64,
  amount,
  status = 'pending',
  onCopyCode,
  className
}: PixQRCodeProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyCode = async () => {
    if (!qrCode) return;
    
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      onCopyCode?.();
      
      // Reset after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar código:', error);
    }
  };

  if (status === 'approved') {
    return (
      <Card className={cn("w-full max-w-md mx-auto", className)}>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h3 className="text-xl font-semibold text-green-700">Pagamento Aprovado!</h3>
            <p className="text-muted-foreground">
              Seu pagamento PIX foi confirmado com sucesso.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'rejected') {
    return (
      <Card className={cn("w-full max-w-md mx-auto", className)}>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
            <h3 className="text-xl font-semibold text-red-700">Pagamento Recusado</h3>
            <p className="text-muted-foreground">
              Houve um problema com seu pagamento PIX. Tente novamente.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <QrCode className="h-6 w-6" />
          <CardTitle>Pague com PIX</CardTitle>
        </div>
        <CardDescription>
          Escaneie o QR Code ou copie o código PIX
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Code Display */}
        <div className="flex flex-col items-center space-y-4">
          {qrCodeBase64 ? (
            <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
              <img 
                src={`data:image/png;base64,${qrCodeBase64}`}
                alt="QR Code PIX"
                className="w-64 h-64"
              />
            </div>
          ) : qrCode ? (
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <div className="font-mono text-xs break-all max-w-sm">
                {qrCode.substring(0, 100)}...
              </div>
            </div>
          ) : (
            <div className="p-8 bg-gray-50 rounded-lg border-2 border-gray-200">
              <Clock className="h-12 w-12 text-gray-400 animate-pulse" />
              <p className="text-sm text-muted-foreground mt-2">
                Gerando QR Code...
              </p>
            </div>
          )}
        </div>

        {/* Copy Code Button */}
        {qrCode && (
          <div className="space-y-2">
            <Button
              onClick={handleCopyCode}
              variant="outline"
              className="w-full"
              disabled={copied}
            >
              {copied ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Código Copiado!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Código PIX
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Cole este código no app do seu banco
            </p>
          </div>
        )}

        {/* Amount Display */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Valor a pagar:</span>
            <span className="text-xl font-bold">
              R$ {amount.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="border-t pt-4 space-y-2">
          <h4 className="font-medium text-sm">Como pagar:</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Abra o app do seu banco</li>
            <li>Procure a opção PIX</li>
            <li>Escolha "Pagar com QR Code"</li>
            <li>Escaneie o código acima ou cole o código copiado</li>
            <li>Confirme o pagamento</li>
          </ol>
        </div>

        {/* Status Indicator */}
        <div className="border-t pt-4">
          <div className="flex items-center space-x-2 text-sm text-amber-600">
            <Clock className="h-4 w-4 animate-pulse" />
            <span>Aguardando pagamento...</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            O status será atualizado automaticamente após o pagamento
          </p>
        </div>
      </CardContent>
    </Card>
  );
}