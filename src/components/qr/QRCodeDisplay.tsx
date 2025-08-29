import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { FormErrorDisplay } from '@/components/common/ErrorBoundary';
import { 
  Download, 
  Share2, 
  RefreshCw, 
  Copy, 
  QrCode, 
  Clock, 
  AlertTriangle,
  CheckCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQRCodeShare, useQRCodeValidation } from '@/hooks/useQRCode';

interface QRCodeData {
  profileId: string;
  qrCode: string;
  shortUrl: string;
  expiresAt: string;
  createdAt: string;
}

interface QRCodeDisplayProps {
  qrData: QRCodeData;
  profileName: string;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  error?: string | Error | null;
  className?: string;
}

export function QRCodeDisplay({
  qrData,
  profileName,
  onRegenerate,
  isRegenerating = false,
  error,
  className,
}: QRCodeDisplayProps) {
  const { shareQRCode, downloadQRCode } = useQRCodeShare();
  const { checkExpiration, getTimeUntilExpiration, shouldRegenerate } = useQRCodeValidation();
  
  const [copySuccess, setCopySuccess] = React.useState(false);
  
  const isExpired = !checkExpiration(qrData.expiresAt);
  const timeUntilExpiration = getTimeUntilExpiration(qrData.expiresAt);
  const shouldRegenerateQR = shouldRegenerate(qrData.expiresAt);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrData.shortUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar URL:', err);
    }
  };

  const handleShare = async () => {
    await shareQRCode(qrData, profileName);
  };

  const handleDownload = () => {
    // Criar um canvas com o QR Code
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 512;
    canvas.width = size;
    canvas.height = size;

    // Fundo branco
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, size, size);

      // Criar uma nova imagem do SVG
      const svgData = new XMLSerializer().serializeToString(
        document.querySelector('#qr-code-svg') as SVGElement
      );
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, size, size);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            downloadQRCode(url, profileName);
            URL.revokeObjectURL(url);
          }
        });
        URL.revokeObjectURL(svgUrl);
      };
      img.src = svgUrl;
    }
  };

  return (
    <div className={cn("w-full max-w-md mx-auto space-y-4", className)}>
      <FormErrorDisplay error={error || null} />
      
      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <QrCode className="h-6 w-6" />
            <CardTitle>QR Code Médico</CardTitle>
          </div>
          <CardDescription>
            QR Code para acesso rápido ao perfil médico de {profileName}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status do QR Code */}
          <div className="space-y-2">
            {isExpired ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  QR Code expirado. Gere um novo para continuar usando.
                </AlertDescription>
              </Alert>
            ) : shouldRegenerateQR ? (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  QR Code expira em {timeUntilExpiration}. Considere gerar um novo.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>QR Code válido por {timeUntilExpiration}</span>
              </div>
            )}
          </div>

          {/* QR Code */}
          <div className="flex justify-center p-4 bg-white rounded-lg border">
            {isRegenerating ? (
              <div className="flex items-center justify-center w-64 h-64">
                <div className="text-center space-y-4">
                  <LoadingSpinner size="lg" />
                  <p className="text-sm text-muted-foreground">
                    Gerando novo QR Code...
                  </p>
                </div>
              </div>
            ) : (
              <QRCodeSVG
                id="qr-code-svg"
                value={qrData.shortUrl}
                size={256}
                level="M"
                includeMargin={true}
                className={cn("rounded-lg", { "opacity-50": isExpired })}
              />
            )}
          </div>

          {/* URL curta */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Link de acesso:</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={qrData.shortUrl}
                readOnly
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-gray-50"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyUrl}
                className="shrink-0"
              >
                {copySuccess ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {copySuccess && (
              <p className="text-xs text-green-600">Link copiado!</p>
            )}
          </div>

          {/* Ações */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={handleShare}
              className="flex items-center justify-center space-x-2"
            >
              <Share2 className="h-4 w-4" />
              <span>Compartilhar</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={handleDownload}
              className="flex items-center justify-center space-x-2"
              disabled={isExpired}
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </Button>
          </div>

          {/* Regenerar QR Code */}
          {(shouldRegenerateQR || isExpired) && onRegenerate && (
            <Button
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="w-full flex items-center justify-center space-x-2"
              variant={isExpired ? "default" : "outline"}
            >
              <RefreshCw className={cn("h-4 w-4", { "animate-spin": isRegenerating })} />
              <span>
                {isExpired ? 'Gerar Novo QR Code' : 'Renovar QR Code'}
              </span>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Informações adicionais */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Criado em:</span>
              <span>{new Date(qrData.createdAt).toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex justify-between">
              <span>Expira em:</span>
              <span>{new Date(qrData.expiresAt).toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={cn(
                "font-medium",
                isExpired ? "text-red-600" : "text-green-600"
              )}>
                {isExpired ? "Expirado" : "Ativo"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instruções de uso */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como usar</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start space-x-2">
              <span className="text-primary">•</span>
              <span>Mostre este QR Code para profissionais de saúde em emergências</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-primary">•</span>
              <span>O QR Code contém um link seguro para seu perfil médico</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-primary">•</span>
              <span>Mantenha-o sempre atualizado com informações precisas</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-primary">•</span>
              <span>Você pode imprimir ou salvar no celular para acesso offline</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}