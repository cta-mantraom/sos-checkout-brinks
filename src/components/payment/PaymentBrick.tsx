import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { FormErrorDisplay } from '@/components/common/ErrorBoundary';
import { StatusScreenBrick } from './StatusScreenBrick';
import { useMercadoPago, useMercadoPagoBrick } from '@/contexts/MercadoPagoContext';
import { SubscriptionType } from '@/schemas/payment';
import { SUBSCRIPTION_PRICES } from '@/lib/constants/prices';
import { CreditCard, Smartphone, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

// ✅ MODO DIRETO: Interface para dados do pagamento JÁ PROCESSADO pelo Payment Brick
interface PaymentError {
  message?: string;
  cause?: unknown;
}

interface PaymentResult {
  id: string;
  status: 'approved' | 'pending' | 'rejected';
  status_detail?: string;
  payment_method_id?: string;
  payment_type_id?: string;
  transaction_amount: number;
}

interface PaymentBrickProps {
  subscriptionType: SubscriptionType;
  profileData?: {
    fullName: string;
    cpf: string;
    phone: string;
    email: string;
    bloodType?: string;
    emergencyContact: {
      name: string;
      phone: string;
      relationship: string;
    };
    medicalInfo?: {
      allergies: string[];
      medications: Array<{
        name: string;
        dosage: string;
        frequency: string;
      }>;
      medicalConditions: string[];
      additionalNotes?: string;
    };
  };
  amount: number;
  onPaymentSuccess: (paymentData: PaymentResult) => void;
  onPaymentError: (error: Error | PaymentError) => void;
  onPaymentPending?: (paymentData: PaymentResult) => void;
  className?: string;
  disabled?: boolean;
}

export function PaymentBrick({
  subscriptionType,
  profileData,
  amount,
  onPaymentSuccess,
  onPaymentError,
  onPaymentPending,
  className,
  disabled = false,
}: PaymentBrickProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showStatusScreen, setShowStatusScreen] = React.useState(false);
  const [mercadoPagoPaymentId, setMercadoPagoPaymentId] = React.useState<string | null>(null);
  
  const context = useMercadoPago();
  const { deviceId } = context;
  const ensureDeviceId = (context as { ensureDeviceId?: (maxRetries?: number) => Promise<string | null> }).ensureDeviceId;
  const { createBrick, unmountBrick, isReady } = useMercadoPagoBrick();

  const containerId = 'payment-brick-container';

  React.useEffect(() => {
    // ✅ VALIDAÇÕES OBRIGATÓRIAS ANTES DE CRIAR BRICK
    if (!isReady) {
      console.log('[PaymentBrick] ⏳ Aguardando MercadoPago estar pronto...');
      return;
    }
    
    // Aguardar Device ID estar disponível antes de criar Brick
    if (!deviceId && !window.MP_DEVICE_SESSION_ID) {
      console.log('[PaymentBrick] ⏳ Aguardando Device ID para criar Payment Brick...');
      return;
    }

    // Validar dados obrigatórios para modo direto
    if (!profileData) {
      setError('Dados do perfil são obrigatórios para pagamento');
      return;
    }

    const loadBrick = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Aguardar o container estar disponível no DOM
        const waitForContainer = async (id: string, maxAttempts = 10): Promise<boolean> => {
          for (let i = 0; i < maxAttempts; i++) {
            if (document.getElementById(id)) {
              return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          return false;
        };

        const containerExists = await waitForContainer(containerId);
        if (!containerExists) {
          throw new Error('Container do Payment Brick não foi encontrado');
        }

        // ✅ CONFIGURAÇÃO PARA MODO DIRETO
        const brickOptions = {
          initialization: {
            amount: amount,
            // ✅ MODO DIRETO: Pré-preenchimento de dados para melhor conversão
            payer: {
              email: profileData.email,
              identification: {
                type: 'CPF',
                number: profileData.cpf.replace(/\D/g, '')
              }
            }
          },
          customization: {
            paymentMethods: {
              creditCard: 'all',
              debitCard: 'all',
              bankTransfer: 'all'  // PIX habilitado
              // ✅ APENAS cartões e PIX - boleto/wallet removidos
            },
            visual: {
              style: {
                customVariables: {
                  formBackgroundColor: '#ffffff',
                  baseColor: '#3b82f6',
                  errorColor: '#ef4444',
                  fontSizeExtraSmall: '12px',
                  fontSizeSmall: '14px',
                  fontSizeMedium: '16px',
                  fontSizeLarge: '18px',
                  fontWeightNormal: '400',
                  fontWeightSemiBold: '600',
                  formPadding: '16px'
                },
              },
            },
          },
          callbacks: {
            onReady: () => {
              console.log('✅ Payment Brick (MODO DIRETO) está pronto');
              setIsLoading(false);
            },
            onSubmit: async (data: unknown) => {
              console.log('[PaymentBrick] 📦 MODO DIRETO: Dados recebidos do Brick:', JSON.stringify(data, null, 2));
              
              // ✅ VALIDAÇÃO CRÍTICA: Garantir Device ID SEMPRE
              console.log('[PaymentBrick] 🔍 Validando Device ID para pagamento...');
              
              let finalDeviceId = deviceId;
              
              // Se não tiver Device ID, tentar obter
              if (!finalDeviceId) {
                console.log('[PaymentBrick] 🔄 Device ID não disponível, forçando detecção...');
                
                if (ensureDeviceId) {
                  finalDeviceId = await ensureDeviceId(30); // 3 segundos
                }
                
                // Última tentativa: verificar window diretamente
                if (!finalDeviceId && window.MP_DEVICE_SESSION_ID) {
                  finalDeviceId = window.MP_DEVICE_SESSION_ID;
                  console.log('[PaymentBrick] 🎯 Device ID encontrado diretamente no window');
                }
              }
              
              // BLOQUEIO ABSOLUTO se não tiver Device ID
              if (!finalDeviceId) {
                const deviceError = new Error('Device ID é obrigatório para segurança. Recarregue a página e aguarde o carregamento completo.');
                console.error('[PaymentBrick] ❌ BLOQUEIO: Device ID não encontrado após todas as tentativas');
                onPaymentError(deviceError);
                return;
              }
              
              console.log('[PaymentBrick] ✅ Device ID GARANTIDO para pagamento:', {
                deviceId: finalDeviceId.substring(0, 8) + '...', // Log mascarado
                length: finalDeviceId.length,
                source: finalDeviceId === deviceId ? 'context' : 'forced_detection'
              });
              
              // Validar e tipar dados do Brick
              const brickData = data as MercadoPagoBrickData;
              
              try {
                // Extrair dados do pagamento
                const paymentData = brickData.formData || brickData;
                const paymentMethodId = paymentData.payment_method_id;
                const token = paymentData.token;
                
                // Detectar se é PIX
                const isPix = paymentMethodId === 'pix';
                
                console.log('[PaymentBrick] 📦 Dados para processar:', {
                  method: paymentMethodId,
                  isPix,
                  hasToken: !!token
                });
                
                // Preparar dados para o backend processar
                const transformedData = {
                  ...paymentData,
                  profileData,
                  amount,
                  subscriptionType,
                  deviceId: finalDeviceId,
                  paymentMethod: paymentMethodId,
                  paymentMethodId: paymentMethodId,
                  installments: paymentData.installments || 1
                };
                
                // Backend processa o pagamento
                const response = await fetch('/api/process-payment', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Device-Session-Id': finalDeviceId,
                  },
                  body: JSON.stringify(transformedData),
                });
                
                const result = await response.json();
                
                if (!response.ok) {
                  throw new Error(result.message || 'Erro ao validar pagamento no backend');
                }
                
                console.log('[PaymentBrick] ✅ Resposta do backend:', result);
                
                // Processar resultado baseado no status
                const paymentStatus = result.data?.payment?.status || result.payment?.status || result.status;
                const paymentId = result.data?.payment?.id || result.payment?.id || result.paymentId;
                const paymentMethod = result.data?.payment?.paymentMethod || result.payment?.payment_method_id || paymentMethodId;
                
                console.log('[PaymentBrick] 📊 Status do pagamento:', {
                  paymentStatus,
                  isPix,
                  paymentId,
                  paymentMethod,
                  hasPixData: !!(result.data?.mercadopago?.pixQrCode || result.payment?.point_of_interaction?.transaction_data)
                });
                
                switch (paymentStatus) {
                  case 'approved':
                    console.log('[PaymentBrick] ✅ Pagamento aprovado');
                    onPaymentSuccess(result);
                    break;
                    
                  case 'pending':
                    if (isPix && paymentId) {
                      console.log('[PaymentBrick] 📱 PIX detectado - Mostrando Status Screen');
                      // Para PIX, o backend retorna o QR Code e precisamos mostrar
                      setMercadoPagoPaymentId(paymentId);
                      setShowStatusScreen(true);
                      unmountBrick(containerId);
                      // Chamar callback de pending com os dados do PIX
                      if (onPaymentPending) {
                        onPaymentPending(result);
                      }
                    } else {
                      console.log('[PaymentBrick] ⏳ Pagamento pendente');
                      onPaymentPending?.(result);
                    }
                    break;
                    
                  case 'rejected':
                    console.log('[PaymentBrick] ❌ Pagamento rejeitado');
                    onPaymentError(new Error(result.payment?.status_detail || 'Pagamento rejeitado'));
                    break;
                    
                  default:
                    console.error('[PaymentBrick] ❓ Status desconhecido:', paymentStatus);
                    onPaymentError(new Error('Status de pagamento desconhecido: ' + paymentStatus));
                }

                return result;
                
              } catch (error) {
                console.error('[PaymentBrick] ❌ Erro na validação do pagamento:', error);
                onPaymentError(error instanceof Error ? error : new Error('Erro desconhecido na validação'));
                throw error;
              }
            },
            onError: (error: PaymentError) => {
              console.error('[PaymentBrick] ❌ Erro no Payment Brick:', error);
              setError(error.message || 'Erro no formulário de pagamento');
              onPaymentError(error);
            },
          },
        };

        await createBrick(containerId, brickOptions);
        console.log('[PaymentBrick] ✅ Payment Brick (MODO DIRETO) criado com sucesso');
        
      } catch (err) {
        console.error('[PaymentBrick] ❌ Erro ao carregar Payment Brick:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar formulário de pagamento');
        setIsLoading(false);
      }
    };

    // Carregar brick quando MercadoPago estiver pronto
    loadBrick();

    // ✅ Cleanup
    return () => {
      console.log('[PaymentBrick] 🧹 Limpando Payment Brick...');
      unmountBrick(containerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, subscriptionType, profileData, amount, deviceId, onPaymentSuccess, onPaymentError, onPaymentPending]);

  const subscriptionInfo = {
    basic: {
      name: 'Plano Básico',
      price: SUBSCRIPTION_PRICES.basic,
      duration: '30 dias',
      description: 'Acesso completo por 1 mês',
      icon: <Smartphone className="h-5 w-5" />,
    },
    premium: {
      name: 'Plano Premium',
      price: SUBSCRIPTION_PRICES.premium,
      duration: '365 dias',
      description: 'Acesso completo por 1 ano',
      icon: <CreditCard className="h-5 w-5" />,
    },
  };

  const currentSubscription = subscriptionInfo[subscriptionType];

  // ✅ STATUS SCREEN para PIX
  if (showStatusScreen && mercadoPagoPaymentId) {
    return (
      <StatusScreenBrick
        paymentId={mercadoPagoPaymentId}
        onSuccess={(data) => {
          console.log('✅ Pagamento PIX aprovado via Status Screen:', data);
          onPaymentSuccess(data as PaymentResult);
        }}
        onError={(error) => {
          console.error('❌ Erro no pagamento PIX:', error);
          setError(error.message);
          setShowStatusScreen(false);
          setMercadoPagoPaymentId(null);
          onPaymentError(error);
        }}
        className={className}
      />
    );
  }

  // ✅ EXIBIÇÃO DE ERRO
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <FormErrorDisplay 
            error={error} 
            onDismiss={() => setError(null)}
          />
          <div className="mt-4 text-center">
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Recarregar Página
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("w-full max-w-2xl mx-auto space-y-6", className)}>
      {/* Resumo da Assinatura */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            {currentSubscription.icon}
            <div>
              <CardTitle>{currentSubscription.name}</CardTitle>
              <CardDescription>{currentSubscription.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Duração:</p>
              <p className="font-medium">{currentSubscription.duration}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total:</p>
              <p className="text-2xl font-bold text-primary">
                R$ {amount.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de Pagamento */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Receipt className="h-5 w-5" />
            <CardTitle>Dados de Pagamento</CardTitle>
          </div>
          <CardDescription>
            Pagamento processado diretamente pelo MercadoPago (modo seguro)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="text-center space-y-4">
                  <LoadingSpinner size="lg" />
                  <p className="text-sm text-muted-foreground">
                    Carregando formulário de pagamento seguro...
                  </p>
                </div>
              </div>
            )}
            <div 
              id={containerId}
              className={cn(
                "min-h-[400px]",
                { "opacity-0": isLoading },
                { "opacity-50 pointer-events-none": disabled }
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Informações de Segurança */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm text-muted-foreground">
            <h4 className="font-medium text-foreground mb-3">🔒 Pagamento Ultra Seguro (Modo Direto)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></div>
                <span>Processamento direto pelo MercadoPago</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></div>
                <span>Criptografia SSL de ponta a ponta</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></div>
                <span>Certificação PCI DSS Level 1</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></div>
                <span>Device fingerprinting ativo</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métodos de Pagamento Aceitos */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-medium mb-3">💳 Métodos de Pagamento</h4>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">PIX Instantâneo</span>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">Cartão de Crédito</span>
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">Cartão de Débito</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}