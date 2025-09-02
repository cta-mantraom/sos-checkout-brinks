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

// Interface para dados brutos do MercadoPago Brick
interface MercadoPagoBrickData {
  payment_method_id?: string;
  paymentMethodId?: string;
  payment_method?: string;
  selectedPaymentMethod?: {
    id?: string;
    type?: string;
  };
  installments?: number;
  token?: string; // Token do Payment Brick para cartões
  payer?: {
    email?: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  formData?: {
    payment_method_id?: string;
    payment_method?: string;
    installments?: number;
    token?: string; // Token pode vir dentro de formData também
    payer?: {
      email?: string;
      identification?: {
        type: string;
        number: string;
      };
    };
  };
}

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
  profileId?: string;  // Opcional agora
  profileData?: {  // Dados do perfil para novo fluxo
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
  profileId,
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

        const brickOptions = {
          initialization: {
            amount: amount,
            preferenceId: null, // será gerado pelo backend
          },
          customization: {
            paymentMethods: {
              creditCard: 'all',
              debitCard: 'all',
              bankTransfer: 'all',  // PIX habilitado
              // NUNCA usar ticket: 'none' ou mercadoPago: 'none' - causa erro 422
              // Simplesmente NÃO incluir esses campos para desabilitá-los
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
                  formPadding: '16px',
                  // REMOVIDAS propriedades inválidas que causavam erro 422
                },
              },
            },
          },
          callbacks: {
            onReady: () => {
              console.log('Payment Brick está pronto');
              setIsLoading(false);
            },
            onSubmit: async (data: unknown) => {
              console.log('Dados brutos do MercadoPago Brick:', JSON.stringify(data, null, 2));
              
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
                // IMPORTANTE: O Payment Brick do MercadoPago deve processar o pagamento
                // Vamos apenas enviar os dados para o backend processar corretamente
                // Detectar o método de pagamento corretamente
                let paymentMethodId = brickData.payment_method_id || 
                                     brickData.paymentMethodId ||
                                     brickData.payment_method ||
                                     brickData.selectedPaymentMethod?.id ||
                                     brickData.formData?.payment_method_id ||
                                     brickData.formData?.payment_method;
                
                // PIX vem como 'pix'
                const isPix = paymentMethodId === 'pix';
                
                // Mapeamento completo dos payment_method_id do MercadoPago
                const creditCardMethods = [
                  'visa', 'master', 'mastercard', 'amex', 'elo', 'hipercard', 
                  'diners', 'tarshop', 'cencosud', 'cmr_falabella', 'argencard',
                  'naranja', 'maestro', 'cabal', 'shopping'
                ];
                
                const debitCardMethods = [
                  'debvisa', 'debmaster', 'debelo', 'debcabal', 'debmae', 
                  'debmastro', 'debnaranja', 'maestro_internacional'
                ];
                
                // Mapear tipos de pagamento - APENAS PIX, CRÉDITO e DÉBITO
                let paymentMethod: 'credit_card' | 'debit_card' | 'pix';
                
                if (isPix) {
                  paymentMethod = 'pix';
                  paymentMethodId = 'pix';
                } else if (paymentMethodId && debitCardMethods.includes(paymentMethodId.toLowerCase())) {
                  paymentMethod = 'debit_card';
                } else if (paymentMethodId && creditCardMethods.includes(paymentMethodId.toLowerCase())) {
                  paymentMethod = 'credit_card';
                } else if (paymentMethodId && (paymentMethodId.includes('debit') || paymentMethodId.includes('debito'))) {
                  // Fallback para métodos com 'debit' no nome
                  paymentMethod = 'debit_card';
                } else if (paymentMethodId && (paymentMethodId.includes('credit') || paymentMethodId.includes('credito'))) {
                  // Fallback para métodos com 'credit' no nome
                  paymentMethod = 'credit_card';
                } else if (paymentMethodId) {
                  // ✅ DEFAULT SEGURO: Se não identificado especificamente, assumir cartão de crédito
                  // A maioria dos payment_method_id desconhecidos são cartões de crédito
                  console.warn(`Método de pagamento não mapeado, assumindo crédito: ${paymentMethodId}`);
                  paymentMethod = 'credit_card';
                } else {
                  throw new Error('Método de pagamento não foi detectado pelo Payment Brick');
                }
                
                console.log('Método de pagamento identificado:', { 
                  paymentMethodId, 
                  paymentMethod,
                  isPix 
                });
                
                // ✅ VALIDAÇÃO CRÍTICA: Para cartões, token é OBRIGATÓRIO
                const isCardPayment = paymentMethod === 'credit_card' || paymentMethod === 'debit_card';
                const token = brickData.token || brickData.formData?.token;
                
                if (isCardPayment && !token) {
                  throw new Error('Token de pagamento não foi gerado pelo Payment Brick. Tente novamente.');
                }
                
                console.log('Validações de pagamento:', {
                  paymentMethod,
                  isCardPayment,
                  hasToken: !!token,
                  tokenLength: token ? token.length : 0
                });
                
                // Transformar dados do MercadoPago para formato esperado pelo backend
                const transformedData = profileData ? {
                  // NOVO FLUXO: Enviar dados do perfil
                  amount,
                  paymentMethodId: paymentMethodId || 'pix',
                  paymentMethod: paymentMethod,
                  installments: brickData.installments || brickData.formData?.installments || 1,
                  token: token, // ✅ Token do Payment Brick para cartões
                  deviceId: finalDeviceId, // ✅ Device ID GARANTIDO
                  payer: {
                    email: brickData.payer?.email || brickData.formData?.payer?.email || profileData.email,
                    identification: {
                      type: 'CPF',
                      number: profileData.cpf // ✅ SEMPRE usar CPF do profileData, não do Brick
                    }
                  },
                  profileData: {
                    ...profileData,
                    subscriptionPlan: subscriptionType
                  }
                } : {
                  // FLUXO ANTIGO: Enviar profileId
                  profileId,
                  amount,
                  paymentMethodId: paymentMethodId || 'pix',
                  paymentMethod: paymentMethod,
                  installments: brickData.installments || brickData.formData?.installments || 1,
                  token: token, // ✅ Token do Payment Brick para cartões
                  deviceId: finalDeviceId, // ✅ Device ID GARANTIDO
                  payer: {
                    email: brickData.payer?.email || brickData.formData?.payer?.email,
                    identification: brickData.payer?.identification || brickData.formData?.payer?.identification
                  }
                };

                // Payment Brick gerencia tokenização automaticamente
                
                console.log('Dados transformados para envio:', transformedData);

                // ✅ Log de dados transformados (mascarado)
                console.log('[PaymentBrick] 📦 Dados transformados para envio:', {
                  ...transformedData,
                  deviceId: transformedData.deviceId?.substring(0, 8) + '...', // Mascarar Device ID
                  token: token ? token.substring(0, 8) + '...' : undefined, // Mascarar token
                  paymentMethod: transformedData.paymentMethod,
                  amount: transformedData.amount
                });

                // IMPORTANTE: Usar API process-payment que NÃO salva no banco
                // Dados só serão salvos quando pagamento for aprovado via webhook
                const response = await fetch('/api/process-payment', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Device-Session-Id': finalDeviceId, // ✅ Header de segurança GARANTIDO
                  },
                  body: JSON.stringify(transformedData),
                });

                const result = await response.json();

                if (!response.ok) {
                  throw new Error(result.message || 'Erro ao criar pagamento');
                }

                console.log('Resposta do backend:', result);
                console.log('[PaymentBrick] DEBUG - payment.externalId:', result.data?.payment?.externalId);
                console.log('[PaymentBrick] DEBUG - payment.id:', result.data?.payment?.id);
                console.log('[PaymentBrick] DEBUG - mercadopago.paymentId:', result.data?.mercadopago?.paymentId);

                // Verificar se é PIX e tem QR Code
                const isPixPayment = paymentMethod === 'pix';
                if (isPixPayment && result.data?.mercadopago?.pixData) {
                  console.log('PIX QR Code recebido:', result.data.mercadopago.pixData);
                }

                // Verificar status do pagamento
                const paymentStatus = result.data?.mercadopago?.status || result.status;
                // IMPORTANTE: Para o Status Screen Brick, SEMPRE usar o externalId (ID real do MercadoPago)
                // O externalId vem do backend como um número, precisamos convertê-lo para string
                const mercadoPagoId = result.data?.payment?.externalId ? 
                                     String(result.data.payment.externalId) : 
                                     result.data?.mercadopago?.paymentId || result.id;
                
                console.log('[PaymentBrick] Status do pagamento:', {
                  paymentStatus,
                  mercadoPagoId,
                  externalId: result.data?.payment?.externalId,
                  paymentId: result.data?.mercadopago?.paymentId,
                  isPixPayment,
                  hasPixData: !!result.data?.mercadopago?.pixData
                });
                
                switch (paymentStatus) {
                  case 'approved':
                    console.log('[PaymentBrick] Pagamento aprovado, chamando onPaymentSuccess');
                    onPaymentSuccess(result);
                    break;
                  case 'pending':
                    // Para PIX, mostrar Status Screen Brick em vez de redirecionar
                    if (isPixPayment && mercadoPagoId) {
                      console.log('[PaymentBrick] PIX detectado - Mostrando Status Screen');
                      console.log('[PaymentBrick] ID do MercadoPago para Status Screen:', mercadoPagoId);
                      console.log('[PaymentBrick] Tipo do ID:', typeof mercadoPagoId);
                      console.log('[PaymentBrick] DEBUG - payment.externalId original:', result.data?.payment?.externalId);
                      console.log('[PaymentBrick] DEBUG - mercadopago.paymentId:', result.data?.mercadopago?.paymentId);
                      setMercadoPagoPaymentId(mercadoPagoId);
                      setShowStatusScreen(true);
                      // Esconder o Payment Brick
                      console.log('[PaymentBrick] Desmontando Payment Brick');
                      unmountBrick(containerId);
                      // IMPORTANTE: NÃO chamar onPaymentPending para PIX
                      console.log('[PaymentBrick] StatusScreen deve ser renderizado agora');
                    } else {
                      console.log('[PaymentBrick] Não é PIX ou falta ID - chamando onPaymentPending');
                      // Para outros métodos, chamar callback de pending
                      if (result.data?.mercadopago?.pixData) {
                        result.pixData = result.data.mercadopago.pixData;
                      }
                      onPaymentPending?.(result);
                    }
                    break;
                  case 'rejected':
                    onPaymentError(new Error(result.data?.mercadopago?.status_detail || 'Pagamento rejeitado'));
                    break;
                  default:
                    onPaymentError(new Error('Status de pagamento desconhecido'));
                }

                return result;
              } catch (error) {
                console.error('Erro no processamento do pagamento:', error);
                onPaymentError(error instanceof Error ? error : new Error('Erro desconhecido'));
                throw error;
              }
            },
            onError: (error: PaymentError) => {
              console.error('Erro no Payment Brick:', error);
              setError(error.message || 'Erro no formulário de pagamento');
              onPaymentError(error);
            },
          },
        };

        await createBrick(containerId, brickOptions);
        console.log('[PaymentBrick] Brick criado com sucesso');
      } catch (err) {
        console.error('Erro ao carregar Payment Brick:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar formulário de pagamento');
        setIsLoading(false);
      }
    };

    // Carregar brick quando MercadoPago estiver pronto
    loadBrick();

    // ✅ Cleanup aprimorado
    return () => {
      console.log('[PaymentBrick] Limpando Payment Brick...');
      unmountBrick(containerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, subscriptionType, profileId, profileData, amount, deviceId, onPaymentSuccess, onPaymentError, onPaymentPending]);

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

  // Se está mostrando Status Screen para PIX
  if (showStatusScreen && mercadoPagoPaymentId) {
    return (
      <StatusScreenBrick
        paymentId={mercadoPagoPaymentId}
        onSuccess={(data) => {
          console.log('Pagamento PIX aprovado:', data);
          onPaymentSuccess(data as PaymentResult);
        }}
        onError={(error) => {
          console.error('Erro no pagamento PIX:', error);
          setError(error.message);
          setShowStatusScreen(false);
          setMercadoPagoPaymentId(null);
          onPaymentError(error);
        }}
        className={className}
      />
    );
  }

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
            Escolha a forma de pagamento e preencha os dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="text-center space-y-4">
                  <LoadingSpinner size="lg" />
                  <p className="text-sm text-muted-foreground">
                    Carregando formulário de pagamento...
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
            <h4 className="font-medium text-foreground mb-3">Pagamento Seguro</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></div>
                <span>Seus dados são protegidos com criptografia SSL</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></div>
                <span>Processamento via MercadoPago, certificado PCI DSS</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></div>
                <span>Não armazenamos dados de cartão de crédito</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></div>
                <span>Transações monitoradas 24/7</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métodos de Pagamento Aceitos */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-medium mb-3">Métodos de Pagamento Aceitos</h4>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="bg-gray-100 px-2 py-1 rounded">PIX</span>
            <span className="bg-gray-100 px-2 py-1 rounded">Cartão de Crédito</span>
            <span className="bg-gray-100 px-2 py-1 rounded">Cartão de Débito</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}