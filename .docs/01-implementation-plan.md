# 📋 PLANO DE IMPLEMENTAÇÃO COMPLETO

## 🎯 ESCOPO E OBJETIVOS

### Objetivo Principal
Desenvolver um sistema de checkout focado exclusivamente em:
- ✅ Checkout com MercadoPago (Cartão e PIX)
- ✅ Formulário médico essencial
- ✅ Geração de QR Code para emergências
- ✅ Páginas de status de pagamento

### Funcionalidades EXCLUÍDAS do Escopo
- ❌ Sistema de e-mail
- ❌ Redis/Cache distribuído
- ❌ QStash/Filas
- ❌ Funcionalidades além do checkout

## 📊 FASES DE IMPLEMENTAÇÃO

### 🔧 FASE 0: PREPARAÇÃO E SETUP
**Duração Estimada:** 2 horas

#### Tarefas:
1. **Setup do Ambiente**
   - [ ] Configurar Node.js 20+
   - [ ] Instalar Vercel CLI
   - [ ] Criar projeto Firebase
   - [ ] Obter credenciais MercadoPago

2. **Configuração Inicial**
   - [ ] Criar estrutura de pastas DDD
   - [ ] Configurar TypeScript strict mode
   - [ ] Setup Vite + React
   - [ ] Instalar dependências base

3. **Variáveis de Ambiente**
   ```env
   # .env.local
   VITE_MP_PUBLIC_KEY=
   MP_ACCESS_TOKEN=
   MP_WEBHOOK_SECRET=
   FIREBASE_PROJECT_ID=
   FIREBASE_PRIVATE_KEY=
   FIREBASE_CLIENT_EMAIL=
   VITE_APP_URL=https://memoryys.com
   ```

### 🏗️ FASE 1: DOMAIN LAYER (DDD)
**Duração Estimada:** 4 horas

#### Estrutura:
```
lib/
├── domain/           # Camada de Domínio
│   ├── entities/     # Entidades principais
│   ├── value-objects/# Objetos de valor
│   └── services/     # Serviços de domínio
├── infrastructure/   # Camada de Infraestrutura
│   ├── repositories/ # Repositórios
│   ├── mercadopago/  # Cliente MP
│   └── firebase/     # Config Firebase
├── application/      # Camada de Aplicação
│   ├── use-cases/    # Casos de uso
│   └── dto/          # Data Transfer Objects
└── shared/          # Compartilhado
    ├── types/       # Tipos TypeScript
    ├── constants/   # Constantes
    └── validations/ # Schemas Zod
```

#### Implementações Principais:

##### 1. Entidades
```typescript
// lib/domain/entities/MedicalProfile.ts
interface MedicalProfile {
  id: string;
  fullName: string;
  phone: PhoneNumber;
  email: Email;
  bloodType: BloodType;
  emergencyContact: EmergencyContact;
  qrCodeUrl?: string;
  subscriptionPlan: 'basic' | 'premium';
  paymentStatus: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

##### 2. Value Objects
```typescript
// lib/domain/value-objects/BloodType.ts
import { z } from 'zod';

export const BloodTypeSchema = z.enum([
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
]);
```

##### 3. Validações Zod
```typescript
// lib/shared/validations/profileSchema.ts
export const MedicalFormSchema = z.object({
  fullName: z.string().min(3).max(100),
  phone: z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/),
  email: z.string().email(),
  bloodType: BloodTypeSchema,
  emergencyContact: z.object({
    name: z.string().min(3),
    phone: z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/)
  })
});
```

### 💳 FASE 2: INTEGRAÇÃO MERCADOPAGO
**Duração Estimada:** 6 horas

#### 1. Configuração SDK React
```bash
npm install @mercadopago/sdk-react
```

```typescript
// src/hooks/useMercadoPago.ts
import { initMercadoPago } from '@mercadopago/sdk-react';

export const useMercadoPago = () => {
  useEffect(() => {
    initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY, {
      locale: 'pt-BR'
    });
  }, []);
};
```

#### 2. Payment Brick Configuration
```typescript
const initialization = {
  amount: selectedPlan === 'basic' ? 5.00 : 10.00,
  payer: { email: formData.email }
};

const customization = {
  paymentMethods: {
    creditCard: 'all',
    debitCard: 'all',
    bankTransfer: ['pix'],
    mercadoPago: ['wallet_purchase'],
    ticket: null,
    prepaidCard: null
  },
  visual: {
    style: { theme: 'default' },
    texts: {
      formTitle: 'Finalizar Pagamento',
      formSubmit: 'Pagar e Gerar QR Code'
    }
  }
};
```

#### 3. Webhook Handler com HMAC
```typescript
// api/mercadopago-webhook.ts
const validateHMAC = (
  payload: string, 
  xSignature: string, 
  xRequestId: string
): boolean => {
  const [ts, hash] = xSignature.split(',')
    .map(part => part.split('=')[1]);
  
  const manifest = `id:${payload.id};request-id:${xRequestId};ts:${ts};`;
  
  const calculatedHash = crypto
    .createHmac('sha256', process.env.MP_WEBHOOK_SECRET!)
    .update(manifest)
    .digest('hex');
  
  return calculatedHash === hash;
};
```

### 🎨 FASE 3: FRONTEND IMPLEMENTATION
**Duração Estimada:** 6 horas

#### Componentes Principais:

##### 1. Formulário Médico
- Validação em tempo real com Zod
- Máscara de telefone brasileira
- Seleção de tipo sanguíneo
- Dados do contato de emergência

##### 2. Seleção de Planos
```typescript
// lib/shared/constants/prices.ts
export const PLANS = {
  basic: {
    name: 'Plano Básico',
    price: 5.00,
    features: ['QR Code de emergência', 'Dados essenciais']
  },
  premium: {
    name: 'Plano Premium',
    price: 10.00,
    features: ['QR Code', 'Dados completos', 'Notificação']
  }
};
```

##### 3. Páginas de Status
- **Success:** QR Code + instruções
- **Pending:** PIX QR + polling
- **Failed:** Erro + retry option

### 🔐 FASE 4: BACKEND IMPLEMENTATION
**Duração Estimada:** 8 horas

#### APIs Vercel Functions:

##### 1. Process Payment
```typescript
// api/process-payment.ts
export default async function handler(req: Request) {
  // 1. Validar com Zod
  const validated = PaymentSchema.safeParse(req.body);
  
  // 2. Processar com MercadoPago
  const payment = await mercadoPagoClient.payment.create({...});
  
  // 3. Salvar no Firebase
  await savePaymentToFirebase(payment);
  
  // 4. Retornar resposta
  return Response.json({ id, status });
}
```

##### 2. Generate QR Code
```typescript
// api/generate-qr.ts
export default async function handler(req: Request) {
  const memorialUrl = `https://memoryys.com/memorial/${profileId}`;
  const qrCodeDataUrl = await QRCode.toDataURL(memorialUrl);
  const qrCodeUrl = await uploadToFirebaseStorage(qrCodeDataUrl);
  return Response.json({ qrCodeUrl });
}
```

##### 3. Webhook Handler
```typescript
// api/mercadopago-webhook.ts
export default async function handler(req: Request) {
  // 1. Validar HMAC
  if (!validateHMAC(...)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  // 2. Processar notificação
  await processWebhookNotification(req.body);
  
  // 3. Retornar 200 (obrigatório)
  return Response.json({ success: true });
}
```

### 🚦 FASE 5: INTEGRAÇÃO E TESTES
**Duração Estimada:** 4 horas

#### Checklist de Integração:
1. **MercadoPago Sandbox**
   - [ ] Testar cartões de teste
   - [ ] Validar fluxo PIX
   - [ ] Verificar webhooks
   - [ ] Confirmar status de pagamento

2. **Firebase**
   - [ ] Salvar perfis médicos
   - [ ] Upload de QR Codes
   - [ ] Recuperar dados memorial

3. **Fluxo Completo**
   - [ ] Formulário → Plano → Checkout
   - [ ] Pagamento aprovado → QR Code
   - [ ] Scan QR → Página memorial

### 🚀 FASE 6: DEPLOY E PRODUÇÃO
**Duração Estimada:** 2 horas

#### Deploy Vercel:
```bash
# Build de produção
npm run build

# Deploy
vercel --prod
```

#### Checklist Produção:
- [ ] Ativar credenciais produção MercadoPago
- [ ] Configurar domínio custom
- [ ] Setup SSL/HTTPS
- [ ] Configurar webhook produção
- [ ] Testar fluxo completo em produção

## 📈 CRONOGRAMA TOTAL

| Fase | Duração | Dependências |
|------|---------|--------------|
| FASE 0 | 2h | - |
| FASE 1 | 4h | FASE 0 |
| FASE 2 | 6h | FASE 1 |
| FASE 3 | 6h | FASE 1 |
| FASE 4 | 8h | FASE 2 |
| FASE 5 | 4h | FASE 3, 4 |
| FASE 6 | 2h | FASE 5 |
| **TOTAL** | **32h** | - |

## ⚠️ PONTOS CRÍTICOS

### Segurança
- **JAMAIS** expor secrets no código
- **SEMPRE** validar HMAC nos webhooks
- **SEMPRE** validar entradas com Zod
- **NUNCA** usar `any` no TypeScript

### Performance
- Implementar device fingerprinting
- Headers de idempotência
- Rate limiting nas APIs
- Cache de QR Codes

### Manutenibilidade
- Código 100% tipado
- Documentação inline
- Logs estruturados
- Error boundaries

## 📝 NOTAS FINAIS

Este plano foi estruturado para entregar um MVP funcional e seguro em aproximadamente 32 horas de desenvolvimento. O foco está exclusivamente no checkout, formulário médico, pagamento e QR Code.

**Lembre-se:** Não implemente funcionalidades além do escopo definido. Mantenha o sistema simples, seguro e funcional.