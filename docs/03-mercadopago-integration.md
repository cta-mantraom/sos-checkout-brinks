# 💳 GUIA COMPLETO DE INTEGRAÇÃO MERCADOPAGO

## 🔑 CONFIGURAÇÃO INICIAL

### 1. Credenciais Necessárias

```env
# Sandbox (Desenvolvimento)
VITE_MP_PUBLIC_KEY_SANDBOX=TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MP_ACCESS_TOKEN_SANDBOX=TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MP_WEBHOOK_SECRET_SANDBOX=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Produção
VITE_MP_PUBLIC_KEY=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MP_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MP_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Instalação das Dependências

```bash
# SDK React do MercadoPago
npm install @mercadopago/sdk-react

# SDK Node.js para backend
npm install mercadopago

# Dependências auxiliares
npm install crypto uuid qrcode
```

### 3. Configuração do Ambiente

```typescript
// lib/infrastructure/mercadopago/config.ts
export const getMercadoPagoConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    publicKey: isProduction 
      ? process.env.VITE_MP_PUBLIC_KEY!
      : process.env.VITE_MP_PUBLIC_KEY_SANDBOX!,
    accessToken: isProduction
      ? process.env.MP_ACCESS_TOKEN!
      : process.env.MP_ACCESS_TOKEN_SANDBOX!,
    webhookSecret: isProduction
      ? process.env.MP_WEBHOOK_SECRET!
      : process.env.MP_WEBHOOK_SECRET_SANDBOX!,
    locale: 'pt-BR',
    options: {
      timeout: 30000,
      idempotencyKey: true
    }
  };
};
```

## 🎨 PAYMENT BRICK - IMPLEMENTAÇÃO COMPLETA

### 1. Inicialização do SDK

```typescript
// src/hooks/useMercadoPago.ts
import { initMercadoPago } from '@mercadopago/sdk-react';
import { useEffect } from 'react';
import { getMercadoPagoConfig } from '@/lib/infrastructure/mercadopago/config';

export const useMercadoPago = () => {
  useEffect(() => {
    const config = getMercadoPagoConfig();
    initMercadoPago(config.publicKey, {
      locale: config.locale
    });
  }, []);
};
```

### 2. Componente Payment Brick

```typescript
// src/components/CheckoutModal/PaymentBrick.tsx
import { Payment } from '@mercadopago/sdk-react';
import { useState, useCallback } from 'react';

interface PaymentBrickProps {
  amount: number;
  email: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: Error) => void;
}

export const PaymentBrick: React.FC<PaymentBrickProps> = ({
  amount,
  email,
  onSuccess,
  onError
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const initialization = {
    amount,
    payer: {
      email,
    },
  };

  const customization = {
    paymentMethods: {
      creditCard: 'all',
      debitCard: 'all',
      bankTransfer: ['pix'],
      mercadoPago: ['wallet_purchase'],
      ticket: null, // Desabilitar boleto
      prepaidCard: null,
      atm: null,
      onboarding_credits: null,
      maxInstallments: 12,
      minInstallments: 1
    },
    visual: {
      style: {
        theme: 'default',
        customVariables: {
          baseColor: '#FF6B00',
          borderRadiusSmall: '4px',
          borderRadiusMedium: '8px',
          borderRadiusLarge: '12px',
          borderRadiusFull: '20px'
        }
      },
      hideStatusDetails: false,
      hidePaymentButton: false,
      texts: {
        formTitle: 'Dados do Pagamento',
        cardholderName: {
          label: 'Nome no cartão',
          placeholder: 'João Silva'
        },
        cardholderIdentification: {
          label: 'CPF do titular'
        },
        cardNumber: {
          label: 'Número do cartão'
        },
        expirationDate: {
          label: 'Validade'
        },
        securityCode: {
          label: 'CVV'
        },
        selectInstallments: 'Parcelas',
        selectIssuerBank: 'Banco emissor',
        emailSectionTitle: 'E-mail para recebimento',
        formSubmit: 'Pagar e Gerar QR Code',
        paymentMethodsTitle: 'Forma de pagamento'
      }
    }
  };

  const onSubmit = useCallback(async ({ formData }: any) => {
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/process-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar pagamento');
      }

      onSuccess(data.paymentId);
    } catch (error) {
      onError(error as Error);
    } finally {
      setIsProcessing(false);
    }
  }, [onSuccess, onError]);

  const onError = useCallback((error: any) => {
    console.error('Payment Brick Error:', error);
    onError(new Error(error.message || 'Erro no Payment Brick'));
  }, [onError]);

  const onReady = useCallback(() => {
    console.log('Payment Brick is ready');
  }, []);

  return (
    <div className="payment-brick-container">
      {isProcessing && (
        <div className="processing-overlay">
          <span>Processando pagamento...</span>
        </div>
      )}
      <Payment
        initialization={initialization}
        customization={customization}
        onSubmit={onSubmit}
        onReady={onReady}
        onError={onError}
      />
    </div>
  );
};
```

## 🔄 PROCESSAMENTO DE PAGAMENTOS - BACKEND

### 1. API de Processamento

```typescript
// api/process-payment.ts
import { NextRequest } from 'next/server';
import mercadopago from 'mercadopago';
import { z } from 'zod';
import crypto from 'crypto';

// Configurar MercadoPago
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN!
});

// Schema de validação
const PaymentSchema = z.object({
  transaction_amount: z.number().min(5),
  token: z.string(),
  description: z.string().optional(),
  installments: z.number().min(1).max(12),
  payment_method_id: z.string(),
  issuer_id: z.number().optional(),
  payer: z.object({
    email: z.string().email(),
    identification: z.object({
      type: z.string(),
      number: z.string()
    })
  })
});

export default async function handler(req: NextRequest) {
  try {
    // Headers de segurança
    const idempotencyKey = req.headers.get('X-Idempotency-Key');
    if (!idempotencyKey) {
      return Response.json(
        { error: 'X-Idempotency-Key header is required' },
        { status: 400 }
      );
    }

    // Validar body
    const body = await req.json();
    const validated = PaymentSchema.parse(body);

    // Device fingerprint para anti-fraude
    const deviceId = req.headers.get('X-Device-Session-Id');

    // Criar pagamento
    const paymentData = {
      ...validated,
      statement_descriptor: 'SOS BRINKS',
      notification_url: `${process.env.VITE_APP_URL}/api/mercadopago-webhook`,
      metadata: {
        profile_id: body.profileId,
        device_id: deviceId
      },
      additional_info: {
        items: [{
          id: body.profileId,
          title: body.planName || 'Plano Básico',
          description: 'QR Code de Emergência Médica',
          category_id: 'services',
          quantity: 1,
          unit_price: validated.transaction_amount
        }],
        payer: {
          first_name: body.payerName?.split(' ')[0],
          last_name: body.payerName?.split(' ').slice(1).join(' ')
        }
      }
    };

    const payment = await mercadopago.payment.create(paymentData, {
      idempotency: idempotencyKey
    });

    // Processar resposta baseado no status
    const response = {
      id: payment.body.id,
      status: payment.body.status,
      status_detail: payment.body.status_detail,
      payment_method: payment.body.payment_method,
      installments: payment.body.installments,
      transaction_amount: payment.body.transaction_amount,
      date_approved: payment.body.date_approved,
      pix_qr_code: null as string | null,
      pix_qr_code_base64: null as string | null,
      redirect_url: null as string | null
    };

    // Se for PIX, incluir QR Code
    if (payment.body.payment_method_id === 'pix') {
      response.pix_qr_code = payment.body.point_of_interaction?.transaction_data?.qr_code || null;
      response.pix_qr_code_base64 = payment.body.point_of_interaction?.transaction_data?.qr_code_base64 || null;
    }

    // Determinar URL de redirecionamento
    switch (payment.body.status) {
      case 'approved':
        response.redirect_url = `/success?payment_id=${payment.body.id}`;
        break;
      case 'pending':
      case 'in_process':
        response.redirect_url = `/pending?payment_id=${payment.body.id}`;
        break;
      case 'rejected':
      case 'cancelled':
        response.redirect_url = `/failed?reason=${payment.body.status_detail}`;
        break;
    }

    return Response.json(response, { status: 200 });

  } catch (error) {
    console.error('Payment processing error:', error);
    
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Invalid payment data', details: error.errors },
        { status: 400 }
      );
    }

    return Response.json(
      { error: 'Payment processing failed' },
      { status: 500 }
    );
  }
}
```

## 🎯 PIX - IMPLEMENTAÇÃO ESPECÍFICA

### 1. Processamento PIX

```typescript
// lib/infrastructure/mercadopago/PIXProcessor.ts
export class PIXProcessor {
  async createPIXPayment(data: PIXPaymentData): Promise<PIXPaymentResponse> {
    const payment = await mercadopago.payment.create({
      transaction_amount: data.amount,
      payment_method_id: 'pix',
      payer: {
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        identification: {
          type: 'CPF',
          number: data.cpf
        }
      },
      description: 'QR Code Emergência Médica'
    });

    return {
      id: payment.body.id,
      status: payment.body.status,
      qrCode: payment.body.point_of_interaction?.transaction_data?.qr_code!,
      qrCodeBase64: payment.body.point_of_interaction?.transaction_data?.qr_code_base64!,
      ticketUrl: payment.body.point_of_interaction?.transaction_data?.ticket_url!,
      expirationDate: payment.body.date_of_expiration
    };
  }
}
```

### 2. Componente PIX QR Code

```typescript
// src/components/PIXQRCode/index.tsx
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface PIXQRCodeProps {
  paymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  onPaymentConfirmed: () => void;
}

export const PIXQRCode: React.FC<PIXQRCodeProps> = ({
  paymentId,
  qrCode,
  qrCodeBase64,
  onPaymentConfirmed
}) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutos

  // Polling para verificar status
  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await fetch(`/api/verify-payment?id=${paymentId}`);
      const data = await response.json();
      
      if (data.status === 'approved') {
        onPaymentConfirmed();
        clearInterval(interval);
      }
    }, 5000); // Verificar a cada 5 segundos

    return () => clearInterval(interval);
  }, [paymentId, onPaymentConfirmed]);

  // Timer de expiração
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="pix-qr-container">
      <h2>Pague com PIX</h2>
      
      <div className="qr-code-wrapper">
        <img src={`data:image/png;base64,${qrCodeBase64}`} alt="PIX QR Code" />
      </div>

      <div className="pix-code-copy">
        <input 
          type="text" 
          value={qrCode} 
          readOnly 
          className="pix-code-input"
        />
        <button onClick={copyToClipboard} className="copy-button">
          {copied ? '✓ Copiado!' : 'Copiar código'}
        </button>
      </div>

      <div className="expiration-timer">
        <span>Expira em: {formatTime(timeLeft)}</span>
      </div>

      <div className="pix-instructions">
        <h3>Como pagar:</h3>
        <ol>
          <li>Abra o app do seu banco</li>
          <li>Escolha pagar com PIX</li>
          <li>Escaneie o QR Code ou copie o código</li>
          <li>Confirme o pagamento</li>
        </ol>
      </div>
    </div>
  );
};
```

## 🔔 WEBHOOK - VALIDAÇÃO E PROCESSAMENTO

### 1. Webhook Handler com HMAC

```typescript
// api/mercadopago-webhook.ts
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';

const WebhookSchema = z.object({
  action: z.string(),
  api_version: z.string(),
  data: z.object({
    id: z.string()
  }),
  date_created: z.string(),
  id: z.number(),
  live_mode: z.boolean(),
  type: z.string(),
  user_id: z.string().optional()
});

export default async function handler(req: NextRequest) {
  try {
    // Validar método
    if (req.method !== 'POST') {
      return Response.json(
        { error: 'Method not allowed' },
        { status: 405 }
      );
    }

    // Extrair headers
    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');

    if (!xSignature || !xRequestId) {
      return Response.json(
        { error: 'Missing required headers' },
        { status: 401 }
      );
    }

    // Parse body
    const body = await req.json();
    const validated = WebhookSchema.parse(body);

    // Validar HMAC
    const isValid = validateHMAC(validated, xSignature, xRequestId);
    if (!isValid) {
      return Response.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Processar baseado no tipo de evento
    switch (validated.type) {
      case 'payment':
        await processPaymentWebhook(validated.data.id);
        break;
      case 'point_integration_wh':
        // PIX específico
        await processPIXWebhook(validated.data.id);
        break;
      default:
        console.log(`Unhandled webhook type: ${validated.type}`);
    }

    // IMPORTANTE: Sempre retornar 200/201
    return Response.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    
    // Mesmo em erro, retornar 200 para evitar retentativas
    return Response.json({ success: false }, { status: 200 });
  }
}

function validateHMAC(
  payload: any,
  xSignature: string,
  xRequestId: string
): boolean {
  try {
    // Extrair timestamp e hash
    const parts = xSignature.split(',');
    const ts = parts.find(p => p.startsWith('ts='))?.split('=')[1];
    const hash = parts.find(p => p.startsWith('v1='))?.split('=')[1];

    if (!ts || !hash) {
      return false;
    }

    // Construir manifest
    const manifest = `id:${payload.data.id};request-id:${xRequestId};ts:${ts};`;

    // Calcular hash
    const secret = process.env.MP_WEBHOOK_SECRET!;
    const calculatedHash = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    // Comparar hashes
    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(calculatedHash)
    );
  } catch (error) {
    console.error('HMAC validation error:', error);
    return false;
  }
}

async function processPaymentWebhook(paymentId: string) {
  // Buscar detalhes do pagamento
  const payment = await mercadopago.payment.findById(paymentId);
  
  // Atualizar status no banco
  await updatePaymentStatus(paymentId, payment.body.status);
  
  // Se aprovado, gerar QR Code
  if (payment.body.status === 'approved') {
    const profileId = payment.body.metadata?.profile_id;
    if (profileId) {
      await generateQRCodeForProfile(profileId);
    }
  }
}
```

## 🎭 STATUS SCREEN - PÁGINAS DE STATUS

### 1. Status Screen Brick

```typescript
// src/components/StatusScreen/index.tsx
import { StatusScreen } from '@mercadopago/sdk-react';

interface PaymentStatusProps {
  paymentId: string;
}

export const PaymentStatus: React.FC<PaymentStatusProps> = ({ paymentId }) => {
  const initialization = {
    paymentId
  };

  const customization = {
    visual: {
      hideStatusDetails: false,
      hideTransactionDate: false,
      style: {
        theme: 'default'
      }
    },
    backUrls: {
      'return': '/',
      error: '/checkout'
    }
  };

  return (
    <StatusScreen
      initialization={initialization}
      customization={customization}
      onReady={() => console.log('Status Screen ready')}
      onError={(error) => console.error('Status Screen error:', error)}
    />
  );
};
```

## 🔒 SEGURANÇA E BOAS PRÁTICAS

### 1. Device Fingerprinting

```html
<!-- index.html -->
<script src="https://www.mercadopago.com/v2/security.js" view="checkout"></script>
```

```typescript
// src/hooks/useDeviceFingerprint.ts
export const useDeviceFingerprint = () => {
  const [deviceId, setDeviceId] = useState<string>();

  useEffect(() => {
    // O script cria uma variável global
    const id = (window as any).MP_DEVICE_SESSION_ID;
    if (id) {
      setDeviceId(id);
    }
  }, []);

  return deviceId;
};
```

### 2. Headers de Segurança

```typescript
// Sempre incluir em requisições
const headers = {
  'Content-Type': 'application/json',
  'X-Idempotency-Key': crypto.randomUUID(),
  'X-Device-Session-Id': deviceId,
  'X-Request-Id': crypto.randomUUID()
};
```

### 3. Validação de Dados

```typescript
// Sempre validar com Zod
const PaymentDataSchema = z.object({
  amount: z.number().min(5).max(10000),
  email: z.string().email(),
  cpf: z.string().regex(/^\d{11}$/),
  // ... outros campos
});

// Nunca confiar em dados externos
const validated = PaymentDataSchema.safeParse(untrustedData);
if (!validated.success) {
  throw new ValidationError(validated.error);
}
```

## 📊 CÓDIGOS DE ERRO E TRATAMENTO

### Erros Comuns da API

| Código | Erro | Solução |
|--------|------|------|
| 2006 | Card Token not found | Token expirou, gerar novo |
| 2062 | Invalid card token | Token inválido |
| 3001 | Missing cardissuer_id | Incluir emissor do cartão |
| 3034 | Invalid installments | Verificar número de parcelas |
| 4020 | Invalid notification_url | URL deve ser HTTPS |
| 4292 | Missing X-Idempotency-Key | Header obrigatório |

### Tratamento de Erros

```typescript
function handleMercadoPagoError(error: any): string {
  const errorMap: Record<string, string> = {
    '2006': 'Token de pagamento expirou. Por favor, tente novamente.',
    '2062': 'Dados do cartão inválidos.',
    '3001': 'Banco emissor não identificado.',
    '3034': 'Número de parcelas inválido.',
    '4020': 'Configuração de webhook inválida.',
    '4292': 'Erro de processamento. Tente novamente.'
  };

  const code = error.cause?.[0]?.code;
  return errorMap[code] || 'Erro ao processar pagamento. Tente novamente.';
}
```

## 🧪 CARTÕES DE TESTE

### Cartões para Sandbox

| Bandeira | Número | CVV | Validade | CPF | Status |
|----------|--------|-----|----------|-----|--------|
| Mastercard | 5031 4332 1540 6351 | 123 | 11/25 | 12345678909 | Aprovado |
| Visa | 4235 6477 2802 5682 | 123 | 11/25 | 12345678909 | Aprovado |
| Mastercard | 5031 4332 1540 0001 | 123 | 11/25 | 12345678909 | Rejeitado |
| Visa | 4235 6477 2802 0001 | 123 | 11/25 | 12345678909 | Rejeitado |

### PIX de Teste

Em ambiente sandbox, o PIX é automaticamente aprovado após 30 segundos.

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### Configuração Inicial
- [ ] Obter credenciais sandbox
- [ ] Configurar variáveis de ambiente
- [ ] Instalar SDKs
- [ ] Configurar webhook URL no painel MP

### Frontend
- [ ] Inicializar SDK React
- [ ] Implementar Payment Brick
- [ ] Adicionar device fingerprinting
- [ ] Criar páginas de status
- [ ] Implementar componente PIX

### Backend
- [ ] API de processamento de pagamento
- [ ] Webhook handler com HMAC
- [ ] API de verificação de status
- [ ] Integração com Firebase
- [ ] Geração de QR Code

### Testes
- [ ] Testar cartões aprovados
- [ ] Testar cartões rejeitados
- [ ] Testar fluxo PIX
- [ ] Validar webhooks
- [ ] Testar idempotência

### Produção
- [ ] Migrar para credenciais produção
- [ ] Configurar webhook produção
- [ ] Validar SSL/HTTPS
- [ ] Monitoramento e logs
- [ ] Rate limiting

Este guia completo fornece todas as informações necessárias para implementar a integração com MercadoPago de forma segura e eficiente.