# 🚨 REGRAS UNIVERSAIS OBRIGATÓRIAS - TODOS OS AGENTES

## ❌ PROIBIÇÕES ABSOLUTAS (NUNCA VIOLAR)

### 1. TYPE SAFETY - ANY É PROIBIDO SEMPRE
- ❌ **ANY É SEMPRE PROIBIDO** - Não existe "any com validação" - ANY NUNCA!
- ❌ **NUNCA** fazer cast direto - sempre validar com Zod primeiro
- ❌ **NUNCA** usar `as` para forçar tipos - validar com schema
- ❌ **NUNCA** ignorar erros de TypeScript com `@ts-ignore`
- ❌ **NUNCA** usar `@ts-nocheck` ou `@ts-expect-error`

### 2. REGRAS DO `unknown` - USO RESTRITO

#### ✅ QUANDO `unknown` É PERMITIDO (APENAS ESTES CASOS):

**1. Dados de APIs Externas:**
```typescript
// ✅ CORRETO: Webhook do MercadoPago
function processWebhookData(payload: unknown) {
  // Validar IMEDIATAMENTE com Zod
  const validatedData = WebhookSchema.parse(payload);
  return validatedData; // Agora tipado!
}
```

**2. Dados do localStorage/sessionStorage:**
```typescript
// ✅ CORRETO: Dados do storage
function getStoredData(): unknown {
  const data = localStorage.getItem('userData');
  return data ? JSON.parse(data) : null;
}
// USO: Sempre validar após chamar
const rawData = getStoredData();
const validData = UserSchema.parse(rawData);
```

**3. Resposta de fetch sem tipagem:**
```typescript
// ✅ CORRETO: Fetch de API externa
async function fetchExternalAPI(): Promise<unknown> {
  const response = await fetch('/api/external');
  return response.json();
}
// USO: Validar imediatamente
const data = await fetchExternalAPI();
const validated = ExternalDataSchema.parse(data);
```

**4. Dados do Firebase Firestore:**
```typescript
// ✅ CORRETO: Dados do Firestore
const doc = await firestore.collection('profiles').doc(id).get();
const rawData: unknown = doc.data(); // Firestore retorna unknown
const profile = ProfileSchema.parse(rawData); // Validar imediatamente!
```

#### ❌ QUANDO `unknown` É PROIBIDO:

```typescript
// ❌ ERRADO: Dados internos do sistema
interface UserProfile {
  data: unknown; // ❌ Defina o tipo correto!
}

// ❌ ERRADO: Parâmetros de funções internas
function processProfile(profile: unknown) { // ❌ Use interface específica!
  // ...
}

// ❌ ERRADO: Estados do React
const [userData, setUserData] = useState<unknown>(null); // ❌ Defina o tipo!

// ❌ ERRADO: Retorno de funções internas
function calculateTotal(): unknown { // ❌ Sempre retornar tipo específico!
  return total;
}
```

#### 🔄 FLUXO OBRIGATÓRIO COM `unknown`:

1. **Receber** como `unknown` (dados externos apenas)
2. **Validar IMEDIATAMENTE** com Zod (na próxima linha!)
3. **Usar** o tipo validado (nunca propagar unknown)

```typescript
// ✅ PADRÃO CORRETO COMPLETO
export async function handleMercadoPagoWebhook(req: Request) {
  // 1. Receber como unknown (dado externo)
  const webhookData: unknown = req.body;
  
  // 2. Validar IMEDIATAMENTE (próxima linha!)
  const webhook = MercadoPagoWebhookSchema.parse(webhookData);
  
  // 3. Usar com tipo seguro
  if (webhook.action === 'payment.updated') {
    await processPaymentUpdate(webhook); // webhook é tipado!
  }
  
  // SEMPRE retornar 200 para webhooks
  return new Response('OK', { status: 200 });
}
```

### 3. TESTES - PROIBIÇÃO TOTAL
- ❌ **NUNCA** implementar testes em nenhuma parte do código
- ❌ **NUNCA** criar arquivos `.test.ts` ou `.spec.ts`
- ❌ **NUNCA** configurar Jest, Vitest ou qualquer framework de teste
- ❌ **NUNCA** escrever testes unitários, integração ou E2E
- ❌ **NUNCA** adicionar coverage ou métricas de teste

### 4. PAGAMENTO - MERCADOPAGO BRICK ONLY
- ❌ **NUNCA** implementar checkout customizado
- ❌ **NUNCA** coletar dados de cartão diretamente
- ❌ **NUNCA** processar pagamento sem Device ID
- ❌ **NUNCA** criar formulário próprio de pagamento
- ❌ **NUNCA** usar outra solução que não seja Payment Brick

## ✅ OBRIGAÇÕES ABSOLUTAS (SEMPRE FAZER)

### 1. VALIDAÇÃO COM ZOD
```typescript
// ✅ SEMPRE fazer assim - SEM EXCEÇÕES
import { z } from 'zod';

// Definir schema completo
const PaymentSchema = z.object({
  amount: z.number().min(5).max(10), // R$ 5 ou R$ 10
  deviceId: z.string().min(1), // OBRIGATÓRIO
  planType: z.enum(['basic', 'premium'])
});

// Validar IMEDIATAMENTE após receber unknown
const data = PaymentSchema.parse(unknownData);
```

### 2. EXEMPLOS PRÁTICOS NO SISTEMA SOS

#### Webhook MercadoPago:
```typescript
// api/webhook/mercadopago.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // ✅ Receber como unknown (dado externo)
    const webhookData: unknown = req.body;
    
    // ✅ Validar IMEDIATAMENTE
    const validatedWebhook = MercadoPagoWebhookSchema.parse(webhookData);
    
    // ✅ Verificar HMAC
    if (!validateHMAC(validatedWebhook, req.headers['x-signature'])) {
      // SEMPRE retornar 200 mesmo com erro
      return res.status(200).json({ error: 'Invalid signature' });
    }
    
    // ✅ Usar com tipo seguro
    await processPaymentWebhook(validatedWebhook);
    
    // SEMPRE retornar 200
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Webhook failed', error);
    // SEMPRE retornar 200 para evitar retry
    res.status(200).json({ error: 'Processing failed' });
  }
}
```

#### Dados do Firebase:
```typescript
// lib/repositories/medical-profile.repository.ts
export class MedicalProfileRepository {
  async getProfile(id: string): Promise<IMedicalProfile> {
    const doc = await firestore.collection('medical_profiles').doc(id).get();
    
    // ✅ Dados do Firestore são unknown
    const rawData: unknown = doc.data();
    
    // ✅ Validar com Zod
    const profile = MedicalProfileSchema.parse(rawData);
    
    // ✅ Retornar tipo seguro
    return profile;
  }
  
  // ❌ NUNCA fazer isso
  async getProfileWrong(id: string): Promise<any> { // ❌ ANY PROIBIDO!
    const doc = await firestore.collection('medical_profiles').doc(id).get();
    return doc.data() as any; // ❌ CAST PROIBIDO!
  }
}
```

#### Formulário Médico:
```typescript
// components/MedicalForm.tsx
function MedicalForm() {
  // ✅ Estado com tipo definido
  const [formData, setFormData] = useState<IMedicalFormData>({
    fullName: '',
    cpf: '',
    bloodType: 'O+',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    }
  });
  
  const handleSubmit = async (data: unknown) => {
    // ✅ Validar entrada do usuário
    const validated = MedicalFormSchema.parse(data);
    
    // ✅ Sanitizar dados sensíveis
    const sanitized = {
      ...validated,
      allergies: validated.allergies.map(a => DOMPurify.sanitize(a))
    };
    
    await saveMedicalProfile(sanitized);
  };
}
```

### 3. PAYMENT BRICK DO MERCADOPAGO
```typescript
// ✅ SEMPRE usar Payment Brick
import { Payment } from '@mercadopago/sdk-react';

// ❌ NUNCA criar form próprio
```

### 4. TYPE SAFETY COMPLETA
```typescript
// ✅ CORRETO - Interface tipada
interface IPayment {
  amount: number;
  deviceId: string;
  planType: 'basic' | 'premium';
}

// ❌ ERRADO - Nunca fazer
const payment: any = getData();
const result = data as Payment;
```

## 🏗️ ARQUITETURA DE CONFIGURAÇÃO DESACOPLADA

### REGRA FUNDAMENTAL
**LEIA OBRIGATORIAMENTE**: `.claude/CONFIG_ARCHITECTURE.md`

### PROIBIÇÕES DE CONFIGURAÇÃO
- ❌ **NUNCA** acessar `process.env` diretamente
- ❌ **NUNCA** misturar schema com config no mesmo arquivo
- ❌ **NUNCA** validar junto com configuração
- ❌ **NUNCA** usar export default para configs
- ❌ **NUNCA** carregar configs que não serão usadas

### ESTRUTURA OBRIGATÓRIA `/lib/config/`
```
/lib/config/
├── schemas/      # Schemas Zod isolados
├── contexts/     # Configurações por domínio
├── validators/   # Validadores customizados
├── types/        # Type definitions
└── utils/        # Utilitários (singleton, mask)
```

### PADRÃO OBRIGATÓRIO - LAZY LOADING
```typescript
// contexts/payment.config.ts
export class PaymentConfig {
  private static instance: PaymentConfig | null = null;
  private config: PaymentConfigType | null = null;
  
  public static getInstance(): PaymentConfig {
    if (!PaymentConfig.instance) {
      PaymentConfig.instance = new PaymentConfig();
    }
    return PaymentConfig.instance;
  }
  
  public getConfig(): PaymentConfigType {
    if (!this.config) {
      this.config = this.loadAndValidate();
    }
    return this.config;
  }
}

// Export helper function
export const getPaymentConfig = () => PaymentConfig.getInstance().getConfig();
```

### USO CORRETO
```typescript
// ❌ ERRADO
const token = process.env.MERCADOPAGO_TOKEN;

// ✅ CORRETO
import { getPaymentConfig } from '@/lib/config';
const { mercadopago } = getPaymentConfig();
const token = mercadopago.accessToken;
```

### MÉTRICAS DE PERFORMANCE
- **-75%** cold start com lazy loading
- **-30%** bundle size com separação
- **100%** type safe com schemas Zod

## 🎯 RESUMO: ANY vs UNKNOWN

### ANY - SEMPRE PROIBIDO
- ❌ **NUNCA USE ANY**
- ❌ Não existe "any temporário"
- ❌ Não existe "any com validação"
- ❌ ANY = CÓDIGO REJEITADO

### UNKNOWN - USO RESTRITO
- ✅ **APENAS** para dados externos (API, storage, Firebase)
- ✅ **SEMPRE** validar na próxima linha com Zod
- ✅ **NUNCA** propagar unknown pelo código
- ✅ **NUNCA** usar para dados internos

### Fluxo Correto:
```typescript
// 1. Dado externo como unknown
const external: unknown = await fetch('/api/data');

// 2. Validar IMEDIATAMENTE
const validated = DataSchema.parse(external);

// 3. Usar tipo validado
processData(validated); // validated tem tipo!
```

## 🧠 THINKING BUDGETS - "ULTRA THINK"

### Antes de QUALQUER ação, o agente DEVE:

1. **PENSAR PROFUNDAMENTE** sobre type safety
   - Questionar cada tipo
   - Validar cada entrada
   - Nunca assumir tipos

2. **ANALISAR IMPACTO** de cada decisão
   - Segurança primeiro
   - Performance depois
   - Custos por último

3. **VALIDAR 3X** antes de implementar
   - Primeira: Lógica está correta?
   - Segunda: Types estão corretos?
   - Terceira: Segurança garantida?

4. **CONSIDERAR COMPLIANCE** sempre
   - LGPD para dados pessoais
   - PCI para pagamentos
   - WCAG para acessibilidade

5. **QUESTIONAR NECESSIDADE**
   - É realmente necessário?
   - Existe solução mais simples?
   - Payment Brick resolve isso?

## 📊 HIERARQUIA DE DECISÕES

1. **Segurança** (máxima prioridade)
2. **Type Safety** (sem exceções)
3. **Compliance** (LGPD, PCI)
4. **Performance** (depois de segurança)
5. **Developer Experience** (última prioridade)

## 🔴 SINAIS DE ALERTA (PARAR IMEDIATAMENTE)

Se detectar qualquer um destes, **PARAR** e alertar:
- Uso de `any` ou `unknown` sem validação
- Tentativa de criar testes
- Implementação de checkout customizado
- Coleta direta de dados de cartão
- Cast forçado de tipos
- Dados sensíveis sem criptografia
- Console.log com dados pessoais
- Ausência de Device ID em pagamento

## 🎯 VALORES FIXOS DO PROJETO

- **Plano Básico**: R$ 5,00
- **Plano Premium**: R$ 10,00
- **Moeda**: BRL apenas
- **Gateway**: MercadoPago apenas
- **Checkout**: Payment Brick apenas
- **Device ID**: OBRIGATÓRIO
- **CPF**: SEMPRE validar com algoritmo
- **QR Code**: SEMPRE público

## 🚀 WORKFLOW OBRIGATÓRIO

### Para QUALQUER implementação:

1. **Definir interfaces** primeiro
2. **Criar schemas Zod** para validação
3. **Implementar** com types stricts
4. **Validar** com schemas
5. **NUNCA** criar testes

## 💬 FRASES PROIBIDAS

Agentes **NUNCA** devem dizer:
- "Vamos criar testes para..."
- "Implementar testes unitários..."
- "Para testar isso..."
- "Vou usar any temporariamente..."
- "Fazer um cast rápido..."
- "Checkout customizado seria melhor..."

## 🔒 DADOS SENSÍVEIS

### SEMPRE Criptografar:
- CPF
- Dados médicos detalhados
- Histórico de pagamentos

### NUNCA Expor:
- Device ID em logs
- Tokens de pagamento
- Dados de cartão
- CPF sem máscara

## ⚡ PERFORMANCE

### Regras de Otimização:
1. Queries com índices SEMPRE
2. Batch writes quando possível
3. Lazy loading de componentes pesados
4. Cache de dados não sensíveis
5. Debounce em validações

## 📝 DOCUMENTAÇÃO

### Todo agente DEVE:
1. Documentar decisões críticas
2. Explicar validações complexas
3. Justificar schemas Zod
4. Detalhar fluxos de pagamento
5. **NUNCA** documentar testes (não existem)

## 🔄 INTEGRAÇÃO ENTRE AGENTES

### Ao passar trabalho para outro agente:
1. Garantir types corretos
2. Validar dados com Zod
3. Documentar contratos
4. Nunca passar `any`
5. Sempre incluir Device ID em pagamentos

## ⛔ COMPORTAMENTO EM CASO DE DÚVIDA

Se houver **QUALQUER** dúvida sobre tipos:
1. **PARAR** imediatamente
2. **DEFINIR** interface clara
3. **CRIAR** schema Zod
4. **VALIDAR** antes de continuar
5. **NUNCA** usar `any` para "resolver depois"

## 📅 REVISÃO CONSTANTE

Estas regras devem ser:
- Lidas antes de cada tarefa
- Aplicadas sem exceção
- Questionadas se necessário
- Atualizadas com aprovação
- **NUNCA** ignoradas

---

# ⚠️ ENFORCEMENT

**VIOLAÇÃO DESTAS REGRAS = CÓDIGO REJEITADO**

Não há exceções. Não há "casos especiais". Não há "só dessa vez".

**Type Safety é VIDA em sistemas médicos de emergência.**

---

**LEMBRE-SE SEMPRE**:
- Este sistema SALVA VIDAS
- Type safety PREVINE MORTES
- Segurança NÃO É NEGOCIÁVEL
- Payment Brick É OBRIGATÓRIO
- Testes NÃO EXISTEM neste projeto

**"THINKING BUDGETS" - Pensar mais ao fundo, sempre questionar, nunca assumir.**