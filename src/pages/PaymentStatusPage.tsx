import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePayment } from '@/hooks/usePayment';
import { PixQRCode } from '@/components/payment/PixQRCode';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Clock, Home } from 'lucide-react';

export function PaymentStatusPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get('paymentId');
  const paymentMethod = searchParams.get('method');
  
  const { data: payment, isLoading, error } = usePayment(paymentId || undefined);

  React.useEffect(() => {
    // Redirecionar para success quando pagamento for aprovado
    if (payment?.status === 'approved') {
      setTimeout(() => {
        navigate('/success', { replace: true });
      }, 2000);
    }
  }, [payment?.status, navigate]);

  if (!paymentId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <XCircle className="h-16 w-16 text-red-500 mx-auto" />
              <h2 className="text-xl font-semibold">ID de pagamento não encontrado</h2>
              <Button onClick={() => navigate('/')} variant="outline">
                <Home className="mr-2 h-4 w-4" />
                Voltar ao início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-muted-foreground">Carregando status do pagamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <XCircle className="h-16 w-16 text-red-500 mx-auto" />
              <h2 className="text-xl font-semibold">Erro ao carregar pagamento</h2>
              <p className="text-muted-foreground">{error.message}</p>
              <Button onClick={() => navigate('/')} variant="outline">
                <Home className="mr-2 h-4 w-4" />
                Voltar ao início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PIX Payment with QR Code
  if (paymentMethod === 'pix' && payment?.status === 'pending') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Complete seu pagamento PIX</h1>
            <p className="text-muted-foreground">
              Use o QR Code abaixo para realizar o pagamento
            </p>
          </div>

          <PixQRCode
            qrCode={payment.qrCodeData}
            qrCodeBase64={payment.qrCodeBase64}
            amount={payment.amount}
            status={payment.status}
          />

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Após o pagamento, você será redirecionado automaticamente
            </p>
            <Button onClick={() => navigate('/')} variant="outline" size="sm">
              Cancelar e voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Other payment methods or status
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {payment?.status === 'approved' && (
              <>
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                <h2 className="text-xl font-semibold">Pagamento Aprovado!</h2>
                <p className="text-muted-foreground">
                  Redirecionando para a página de sucesso...
                </p>
              </>
            )}

            {payment?.status === 'pending' && (
              <>
                <Clock className="h-16 w-16 text-yellow-500 mx-auto animate-pulse" />
                <h2 className="text-xl font-semibold">Pagamento Pendente</h2>
                <p className="text-muted-foreground">
                  Aguardando confirmação do pagamento...
                </p>
                <div className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    ID do Pagamento: {paymentId}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Valor: R$ {payment.amount.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </>
            )}

            {payment?.status === 'rejected' && (
              <>
                <XCircle className="h-16 w-16 text-red-500 mx-auto" />
                <h2 className="text-xl font-semibold">Pagamento Recusado</h2>
                <p className="text-muted-foreground">
                  Houve um problema com seu pagamento. Por favor, tente novamente.
                </p>
                <Button onClick={() => navigate('/checkout')} className="mt-4">
                  Tentar novamente
                </Button>
              </>
            )}

            {payment?.status === 'cancelled' && (
              <>
                <XCircle className="h-16 w-16 text-gray-500 mx-auto" />
                <h2 className="text-xl font-semibold">Pagamento Cancelado</h2>
                <p className="text-muted-foreground">
                  O pagamento foi cancelado.
                </p>
                <Button onClick={() => navigate('/')} variant="outline" className="mt-4">
                  <Home className="mr-2 h-4 w-4" />
                  Voltar ao início
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}