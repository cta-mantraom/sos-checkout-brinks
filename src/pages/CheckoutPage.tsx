import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PaymentBrick } from '@/components/payment/PaymentBrick';
import { usePaymentCalculations, useProcessPayment } from '@/hooks/usePayment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  User, 
  ShieldCheck, 
  CreditCard, 
  CheckCircle,
  AlertTriangle 
} from 'lucide-react';
import { SUBSCRIPTION_PRICES, SUBSCRIPTION_DURATIONS } from '@/lib/constants/prices';
import { SubscriptionType } from '@/schemas/payment';
import { cn } from '@/lib/utils';

interface LocationState {
  profileId?: string;
  selectedPlan?: SubscriptionType;
  profileData?: {
    id: string;
    name: string;
    email: string;
  };
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { calculateAmount } = usePaymentCalculations();
  const processPaymentMutation = useProcessPayment();
  
  const state = location.state as LocationState;
  const profileId = state?.profileId;
  const selectedPlan = (state?.selectedPlan || 'basic') as SubscriptionType;
  const profileData = state?.profileData;

  // Redirecionar se não tiver dados necessários
  React.useEffect(() => {
    if (!profileId || !profileData) {
      navigate('/medical-form');
    }
  }, [profileId, profileData, navigate]);

  if (!profileId || !profileData) {
    return null; // Component will redirect
  }

  const { basePrice, totalAmount } = calculateAmount(selectedPlan);
  const duration = SUBSCRIPTION_DURATIONS[selectedPlan];

  const planInfo = {
    basic: {
      name: 'Plano Básico',
      description: 'Proteção médica essencial',
      features: [
        'Perfil médico completo',
        'QR Code personalizado',
        'Acesso móvel 24/7',
        'Contatos de emergência',
        'Suporte por email'
      ]
    },
    premium: {
      name: 'Plano Premium',
      description: 'Proteção médica completa',
      features: [
        'Tudo do plano Básico',
        'Validade de 1 ano completo',
        'Backup automático',
        'Histórico de acessos',
        'Suporte prioritário 24/7',
        'Múltiplos QR Codes'
      ]
    }
  };

  const currentPlan = planInfo[selectedPlan];

  const handlePaymentSuccess = (paymentData: any) => {
    navigate('/success', {
      state: {
        profileId,
        paymentId: paymentData.id,
        subscriptionType: selectedPlan,
        profileData
      }
    });
  };

  const handlePaymentError = (error: any) => {
    console.error('Erro no pagamento:', error);
  };

  const handlePaymentPending = (paymentData: any) => {
    navigate('/success', {
      state: {
        profileId,
        paymentId: paymentData.id,
        subscriptionType: selectedPlan,
        profileData,
        paymentStatus: 'pending'
      }
    });
  };

  const handleGoBack = () => {
    navigate('/medical-form', { 
      state: { selectedPlan } 
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleGoBack}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Finalizar Assinatura</h1>
              <p className="text-muted-foreground">Complete seu pagamento para ativar sua proteção médica</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Resumo do pedido */}
          <div className="lg:col-span-1 space-y-6">
            {/* Informações do usuário */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <CardTitle className="text-lg">Perfil Criado</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Dados salvos com sucesso</span>
                </div>
                <div className="text-sm">
                  <strong>Nome:</strong> {profileData.name}
                </div>
                <div className="text-sm">
                  <strong>Email:</strong> {profileData.email}
                </div>
              </CardContent>
            </Card>

            {/* Resumo do plano */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="h-5 w-5" />
                    <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
                  </div>
                  {selectedPlan === 'premium' && (
                    <Badge variant="secondary">Mais Popular</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold">{currentPlan.name}</h3>
                  <p className="text-sm text-muted-foreground">{currentPlan.description}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Plano {selectedPlan === 'basic' ? 'Básico' : 'Premium'}:</span>
                    <span>R$ {basePrice.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Duração:</span>
                    <span>{duration} dias</span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>R$ {totalAmount.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Incluído:</h4>
                  <ul className="space-y-1">
                    {currentPlan.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-2 text-xs">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Garantias */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Garantias</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Satisfação garantida ou seu dinheiro de volta</span>
                </div>
                <div className="flex items-start space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Pagamento 100% seguro</span>
                </div>
                <div className="flex items-start space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Suporte técnico incluído</span>
                </div>
                <div className="flex items-start space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Cancelamento a qualquer momento</span>
                </div>
              </CardContent>
            </Card>

            {/* Progress indicator */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span>Etapa 2 de 3</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full w-2/3 transition-all duration-300"></div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Após o pagamento, seu QR Code estará disponível
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulário de pagamento */}
          <div className="lg:col-span-2">
            {processPaymentMutation.error && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {processPaymentMutation.error instanceof Error 
                    ? processPaymentMutation.error.message 
                    : 'Erro ao processar pagamento. Tente novamente.'}
                </AlertDescription>
              </Alert>
            )}

            <PaymentBrick
              subscriptionType={selectedPlan}
              profileId={profileId}
              amount={totalAmount}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
              onPaymentPending={handlePaymentPending}
              disabled={processPaymentMutation.isPending}
            />

            {/* Próximos passos */}
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <CardTitle className="text-lg">Após o Pagamento</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-xs font-medium text-primary">1</span>
                    </div>
                    <div>
                      <strong>Confirmação Imediata</strong>
                      <p className="text-muted-foreground">Você receberá a confirmação por email</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-xs font-medium text-primary">2</span>
                    </div>
                    <div>
                      <strong>QR Code Disponível</strong>
                      <p className="text-muted-foreground">Acesse, baixe e compartilhe seu QR Code médico</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-xs font-medium text-primary">3</span>
                    </div>
                    <div>
                      <strong>Proteção Ativa</strong>
                      <p className="text-muted-foreground">Sua proteção médica estará ativa por {duration} dias</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}