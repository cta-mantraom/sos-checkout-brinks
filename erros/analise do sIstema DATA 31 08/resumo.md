# RESUMO COMPLETO DOS FLUXOS DE PAGAMENTO E ERROS IDENTIFICADOS

---

## 📊 VISÃO GERAL DOS DOIS FLUXOS

O sistema SOS Checkout Brinks possui **DOIS FLUXOS DISTINTOS** de processamento de pagamento que coexistem, causando complexidade e inconsistências:

### FLUXO LEGADO (Antigo)

- Utiliza **profileId** como referência
- Profile criado ANTES do pagamento
- Webhook busca profile existente

### FLUXO NOVO

- Dados do perfil enviados **inline** via metadata
- Profile pode ser criado no webhook
- Dados passados como JSON na metadata do pagamento

---

## 🔄 FLUXO LEGADO (ANTIGO) - PASSO A PASSO DETALHADO

### Etapa 1: Preenchimento do Formulário Médico

```
Usuário → MedicalForm.tsx
```

- **Entrada:** Dados médicos completos (CPF, nome, contatos de emergência, etc.)
- **Validação:** Zod schema com regex específicas
- **Saída:** Dados salvos no localStorage + navegação para checkout

### Etapa 2: Página de Checkout

```
MedicalForm → CheckoutPage.tsx
```

- **Entrada:** Dados via React Router state
- **Processamento:** Cálculo de valores (R$ 19,90/199,90)
- **Saída:** Exibição do resumo + PaymentBrick

### Etapa 3: Criação do Profile Médico

```
Frontend → API create-profile → ProfileService → FirebaseProfileRepository
```

- **⚠️ PROBLEMA:** Profile criado ANTES do pagamento ser processado
- **Dados salvos:** Profile completo no Firestore
- **ID gerado:** `profile_<timestamp>_<random>`
- **Status inicial:** paymentStatus = "pending"

### Etapa 4: Payment Brick

```
CheckoutPage → PaymentBrick.tsx
```

- **Entrada:** profileId + amount + plan
- **Processamento:** Integração com MercadoPago SDK
- **Saída:** Token de pagamento + método detectado

### Etapa 5: Processamento do Pagamento

```
PaymentBrick → API process-payment → MercadoPago
```

- **Entrada:** profileId, paymentMethod, token, installments
- **Processamento:** ProcessPaymentUseCase
- **⚠️ PROBLEMA:** Payment pode referenciar profileId inexistente
- **Saída:** Payment criado no banco + resposta do MercadoPago

### Etapa 6: Webhook MercadoPago (Fluxo Legado)

```
MercadoPago → API mercadopago-webhook → PaymentService
```

- **Entrada:** Notificação de pagamento do MercadoPago
- **Identificação:** `isNewFlow === false` (ou undefined)
- **Processamento:** Busca payment por mercadoPagoId
- **Atualização:** Status do payment + profile
- **⚠️ PROBLEMA:** Race condition - webhook pode chegar antes do profile existir

### Etapa 7: Geração do QR Code

```
Webhook → QRCodeService → ProfileRepository.update
```

- **Entrada:** Profile aprovado
- **Processamento:** Geração do QR Code médico
- **Saída:** qrCodeUrl salva no profile

---

## 🆕 FLUXO NOVO - PASSO A PASSO DETALHADO

### Etapas 1-2: Idênticas ao Fluxo Legado

```
Usuário → MedicalForm.tsx → CheckoutPage.tsx
```

- **Mesmo processo:** Formulário + checkout

### Etapa 3: Payment Brick (Novo Fluxo)

```
CheckoutPage → PaymentBrick.tsx
```

- **Diferença:** Dados do profile enviados via metadata
- **Metadata:** `profileData` como JSON string + `isNewFlow: 'true'`
- **⚠️ PROBLEMA:** Profile NÃO é criado antecipadamente

### Etapa 4: Processamento do Pagamento (Novo Fluxo)

```
PaymentBrick → API process-payment → MercadoPago
```

- **Entrada:** Dados do profile inline + payment data
- **Metadata enviada:**
  ```typescript
  metadata: {
    isNewFlow: 'true',
    profileData: JSON.stringify(profileData)
  }
  ```
- **⚠️ PROBLEMA:** Payment criado SEM profileId válido

### Etapa 5: Webhook MercadoPago (Novo Fluxo)

```
MercadoPago → API mercadopago-webhook
```

- **Identificação:** `isNewFlow === 'true'`
- **Processamento especial:**
  1. Extrai `profileDataJson` da metadata
  2. **CRIA** o profile médico no webhook
  3. **CRIA** o payment referenciando o novo profile
  4. Atualiza status se aprovado
- **⚠️ PROBLEMA CRÍTICO:** Criação de dados em webhook é arriscado

---

## 🚨 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. INCONSISTÊNCIA DE PREÇOS

- **Localização 1:** `lib/shared/constants/prices.ts`
  - Basic: R$ 5,00
  - Premium: R$ 10,00
- **Localização 2:** `lib/domain/entities/Subscription.ts`
  - Basic: R$ 19,90
  - Premium: R$ 199,90
- **Impacto:** Pagamentos processados com valores divergentes

### 2. RACE CONDITIONS NO WEBHOOK

- **Problema:** Webhook pode processar pagamento antes do profile existir (fluxo legado)
- **Localização:** `api/mercadopago-webhook.ts:154-281`
- **Comportamento:** Sistema cria profile no webhook se não encontrar
- **Risco:** Dados duplicados ou inconsistentes

### 3. TRANSAÇÕES NÃO ATÔMICAS

- **Fluxo Legado:** Profile criado → Payment processado → Webhook atualiza
- **Fluxo Novo:** Payment criado → Webhook cria profile → Atualiza status
- **Problema:** Se qualquer etapa falhar, dados ficam órfãos
- **Exemplo:** Profile criado mas pagamento falha = profile órfão

### 4. REFERÊNCIAS ÓRFÃS

- **Payments** podem referenciar profileId inexistente
- **Users** podem ter profileId inválido
- **Subscriptions** podem ter paymentId inválido
- **Causa:** Falta de integridade referencial

### 5. SOFT DELETE INCONSISTENTE

- **Localização:** `FirestoreClient.ts:214-220`
- **Problema:** Tentativa de filtrar `deletedAt == null` pode falhar silenciosamente
- **Risco:** Dados "deletados" aparecerem em queries

---

## 🔗 RELAÇÕES ENTRE OS FLUXOS

### Pontos Comuns

1. **Formulário médico** idêntico em ambos
2. **PaymentBrick** detecta automaticamente o fluxo
3. **Webhook** processa ambos os fluxos
4. **QR Code** gerado da mesma forma
5. **StatusScreenBrick** funciona para ambos

### Diferenças Críticas

1. **Timing de criação do profile:**

   - Legado: Profile criado ANTES do pagamento
   - Novo: Profile criado DEPOIS (no webhook)

2. **Referências:**

   - Legado: Payment referencia profileId existente
   - Novo: Payment criado sem profileId válido inicialmente

3. **Metadata:**

   - Legado: Apenas dados de pagamento
   - Novo: Dados completos do profile em JSON

4. **Recuperação de erros:**
   - Legado: Profile já existe, apenas atualiza status
   - Novo: Precisa criar tudo no webhook

---

## 📋 ESTRUTURA DE DADOS AFETADA

### medical_profiles

```typescript
{
  id: "profile_<timestamp>_<random>",
  paymentStatus: "pending" | "approved" | "rejected",
  subscriptionPlan: "basic" | "premium",
  // ... outros campos
}
```

### payments

```typescript
{
  id: "payment_<timestamp>_<random>",
  profileId: string, // ⚠️ Pode ser inválido no fluxo novo
  amount: number,    // ⚠️ Valores inconsistentes
  status: string,
  mercadoPagoId?: string,
  // ... outros campos
}
```

### subscriptions

```typescript
{
  id: "subscription_<timestamp>_<random>",
  profileId: string, // ⚠️ Pode referenciar profile inexistente
  paymentId?: string, // ⚠️ Pode referenciar payment inválido
  // ... outros campos
}
```

---

## 🎯 PONTOS DE FALHA IDENTIFICADOS

### No Fluxo Legado

1. **Profile órfão:** Profile criado mas pagamento falha
2. **Race condition:** Webhook chega antes do profile ser salvo
3. **Referência inválida:** Payment aponta para profile que não existe ainda

### No Fluxo Novo

1. **Metadata corrompida:** JSON do profile pode estar malformado
2. **Webhook falha:** Se webhook falhar, nenhum dado é salvo
3. **Duplicação:** Webhook pode ser chamado múltiplas vezes

### Em Ambos os Fluxos

1. **Preços divergentes:** Sistema cobra valor errado
2. **Falta de integridade:** Referências órfãs não são verificadas
3. **Soft delete falha:** Dados "deletados" podem aparecer
4. **N+1 queries:** Performance degradada em consultas relacionadas

---

## 🔍 DETECÇÃO DOS FLUXOS NO CÓDIGO

### No Webhook (`mercadopago-webhook.ts`)

```typescript
const isNewFlow = paymentDetails.metadata?.isNewFlow === "true";
const profileDataJson = paymentDetails.metadata?.profileData as string;

if (isNewFlow && profileDataJson) {
  // FLUXO NOVO: Criar profile a partir da metadata
} else {
  // FLUXO LEGADO: Buscar profile existente
}
```

### Na Geração de QR Code

```typescript
// Ambos os fluxos convergem aqui
// Profile deve existir neste ponto
const qrCodeUrl = await generateMedicalQRCode(profile);
```

Este resumo mostra que os dois fluxos criam uma complexidade desnecessária e múltiplos pontos de falha que comprometem a integridade dos dados do sistema.
