import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { QRCodeDisplay } from '@/components/qr/QRCodeDisplay';
import { useQRCode, useGenerateQRCode, useRegenerateQRCode } from '@/hooks/useQRCode';
import { usePayment } from '@/hooks/usePayment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingCard } from '@/components/common/LoadingStates';
import { FormErrorDisplay } from '@/components/common/ErrorBoundary';
import { cn } from '@/lib/utils';
import { 
  CheckCircle, 
  Home, 
  Download, 
  Share2, 
  AlertTriangle,
  Clock,
  RefreshCw,
  User
} from 'lucide-react';
import { SubscriptionType } from '@/schemas/payment';
import { SUBSCRIPTION_DURATIONS } from '@/lib/constants/prices';

interface LocationState {
  profileId?: string;
  paymentId?: string;
  subscriptionType?: SubscriptionType;
  paymentStatus?: 'approved' | 'pending' | 'rejected';
  profileData?: {
    id: string;
    name: string;
    email: string;
  };
}

export function SuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  const profileId = state?.profileId;
  const paymentId = state?.paymentId;
  const subscriptionType = state?.subscriptionType || 'basic';
  const paymentStatus = state?.paymentStatus || 'approved';
  const profileData = state?.profileData;

  // Query hooks
  const { data: qrData, isLoading: qrLoading, error: qrError } = useQRCode(profileId);
  const { data: paymentData } = usePayment(paymentId);
  const generateQRMutation = useGenerateQRCode();
  const regenerateQRMutation = useRegenerateQRCode();

  // Redirecionar se não tiver dados necessários
  React.useEffect(() => {
    if (!profileId || !profileData) {
      navigate('/');
    }
  }, [profileId, profileData, navigate]);

  // Gerar QR Code se ainda não existir
  React.useEffect(() => {
    if (profileId && !qrData && !qrLoading && !qrError) {
      generateQRMutation.mutate({ profileId });
    }
  }, [profileId, qrData, qrLoading, qrError, generateQRMutation]);

  if (!profileId || !profileData) {
    return null; // Component will redirect
  }

  const handleRegenerateQR = () => {
    if (profileId) {
      regenerateQRMutation.mutate(profileId);
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleViewProfile = () => {
    navigate(`/profile/${profileId}`);
  };

  const duration = SUBSCRIPTION_DURATIONS[subscriptionType];
  const planName = subscriptionType === 'basic' ? 'Básico' : 'Premium';

  // Status do pagamento
  const paymentStatusInfo = {
    approved: {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      title: 'Pagamento Aprovado!',
      message: 'Sua assinatura está ativa e seu QR Code já está disponível.'
    },
    pending: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      icon: <Clock className="h-5 w-5 text-yellow-600" />,
      title: 'Pagamento Pendente',
      message: 'Aguardando confirmação do pagamento. Você receberá uma notificação quando for processado.'
    },
    rejected: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
      title: 'Pagamento Rejeitado',
      message: 'Houve um problema com seu pagamento. Entre em contato com o suporte.'
    }
  };

  const currentStatus = paymentStatusInfo[paymentStatus];

  return (
    <div className="min-h-screen bg-background">
      {/* Header de sucesso */}
      <div className="bg-gradient-to-br from-green-50 to-blue-50 border-b">
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <div className="space-y-4">
            {currentStatus.icon}
            <h1 className="text-3xl md:text-4xl font-bold">{currentStatus.title}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {currentStatus.message}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* QR Code principal */}
          <div className="lg:col-span-2">
            {qrLoading || generateQRMutation.isPending ? (
              <LoadingCard message="Gerando seu QR Code médico..." />
            ) : qrError && !generateQRMutation.error ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">QR Code não encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    Vamos gerar um novo QR Code para você
                  </p>
                  <Button 
                    onClick={() => generateQRMutation.mutate({ profileId })}
                    disabled={generateQRMutation.isPending}
                    className="flex items-center"
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", {
                      "animate-spin": generateQRMutation.isPending
                    })} />
                    Gerar QR Code
                  </Button>
                </CardContent>
              </Card>
            ) : qrData ? (
              <QRCodeDisplay
                qrData={qrData}
                profileName={profileData.name}
                onRegenerate={handleRegenerateQR}
                isRegenerating={regenerateQRMutation.isPending}
                error={regenerateQRMutation.error || generateQRMutation.error}
              />
            ) : (
              <FormErrorDisplay 
                error={generateQRMutation.error || qrError}
              />
            )}
          </div>

          {/* Sidebar com informações */}
          <div className="lg:col-span-1 space-y-6">
            {/* Status da assinatura */}
            <Card className={cn("border-2", currentStatus.borderColor, currentStatus.bgColor)}>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  {currentStatus.icon}
                  <CardTitle className={currentStatus.color}>Status da Assinatura</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Plano:</span>
                    <span className="font-medium">{planName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duração:</span>
                    <span className="font-medium">{duration} dias</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={cn("font-medium capitalize", currentStatus.color)}>
                      {paymentStatus === 'approved' ? 'Ativo' : paymentStatus === 'pending' ? 'Pendente' : 'Rejeitado'}
                    </span>
                  </div>
                  {paymentData?.expiresAt && (
                    <div className="flex justify-between">
                      <span>Expira em:</span>
                      <span className="font-medium">
                        {new Date(paymentData.expiresAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Informações do perfil */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <CardTitle className="text-lg">Seu Perfil</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <strong>Nome:</strong> {profileData.name}
                </div>
                <div>
                  <strong>Email:</strong> {profileData.email}
                </div>
                <div>
                  <strong>ID do Perfil:</strong> {profileId.slice(-8)}
                </div>
              </CardContent>
            </Card>

            {/* Ações rápidas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleViewProfile} 
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <User className="h-4 w-4 mr-2" />
                  Ver Meu Perfil
                </Button>
                
                {qrData && (
                  <>
                    <Button 
                      onClick={() => {
                        // Implementar download do QR Code
                        // ... lógica de download
                      }}
                      variant="outline" 
                      className="w-full justify-start"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar QR Code
                    </Button>
                    
                    <Button 
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: `QR Code Médico - ${profileData.name}`,
                            url: qrData.shortUrl
                          });
                        }
                      }}
                      variant="outline" 
                      className="w-full justify-start"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Compartilhar
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Próximos passos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Próximos Passos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Salve o QR Code no seu celular</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Imprima uma cópia para a carteira</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Compartilhe com familiares</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Mantenha suas informações atualizadas</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botão voltar ao início */}
            <Button 
              onClick={handleGoHome} 
              className="w-full"
              size="lg"
            >
              <Home className="h-4 w-4 mr-2" />
              Voltar ao Início
            </Button>
          </div>
        </div>

        {/* Informações importantes */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Como Usar seu QR Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• Mostre o QR Code para profissionais de saúde em emergências</p>
              <p>• O código dá acesso seguro às suas informações médicas</p>
              <p>• Funciona mesmo sem internet após ser escaneado</p>
              <p>• Mantenha-o sempre atualizado com informações precisas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Suporte e Ajuda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• Email: suporte@soscheckout.com</p>
              <p>• WhatsApp: (11) 99999-9999</p>
              <p>• Central de Ajuda: /help</p>
              <p>• Disponível 24/7 para emergências</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}