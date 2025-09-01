# 🚫 MAPEAMENTO COMPLETO: CÓDIGO DO CHECKOUT TRANSPARENTE A REMOVER

**Data: 31/08/2025**  
**Status: 🔴 CRÍTICO - Código Legado Perigoso**

## 📚 CONTEXTUALIZAÇÃO IMPORTANTE

### Entendendo os Nomes:
- **"SOS Checkout Brinks"** = Nome do PROJETO (sistema de QR Code médico de emergência)
- **"Payment Brick"** = Solução CORRETA do MercadoPago que devemos usar ✅
- **"Checkout Transparente"** = Solução ANTIGA/ERRADA do MercadoPago que devemos REMOVER ❌

### Por que isso é crítico?

O **Checkout Transparente** exige que nós (aplicação) lidemos com:
- Tokenização manual de cartões
- Responsabilidade PCI-DSS
- Armazenamento de tokens
- Maior risco de segurança

O **Payment Brick** (correto) faz tudo automaticamente:
- MercadoPago cuida da tokenização
- PCI-DSS é responsabilidade deles
- Não precisamos armazenar tokens
- Maior segurança e aprovação

---

## 🔴 ARQUIVOS E CÓDIGO DO CHECKOUT TRANSPARENTE A REMOVER

### 1. ENTIDADES COM CAMPOS DE TOKEN (Checkout Transparente)

#### 📁 `lib/domain/entities/Payment.ts`

**REMOVER:**
```typescript
// Linha 7 - Remover token do construtor
token?: string;

// Linha 54 - Remover parâmetro token
private token?: string,

// Linhas 217-219 - Remover getter
getToken(): string | undefined {
  return this.token;
}

// Linhas 276-281 - Remover setter
setToken(token: string): void {
  this.token = token;
  this.updatedAt = new Date();
}
```

**MANTER:** Todo o resto da entidade Payment

---

### 2. DTOs COM PROCESSAMENTO DE TOKEN

#### 📁 `lib/application/dto/PaymentDTO.ts`

**REMOVER:**
```typescript
// Linha 24
token: z.string().optional(),

// Linha 88
token: z.string().optional(),
```

#### 📁 `lib/application/dto/PaymentWithProfileDTO.ts`

**REMOVER:**
```typescript
// Linha 34
token: z.string().optional(),
```

---

### 3. PROCESSAMENTO DIRETO DE TOKEN

#### 📁 `lib/infrastructure/mercadopago/MercadoPagoClient.ts`

**REMOVER/MODIFICAR:**
```typescript
// Linha 83 - NÃO enviar token
token: payment.getToken(),  // ❌ REMOVER ESTA LINHA

// Modificar para:
// Não incluir campo token na requisição
```

**IMPORTANTE:** O Payment Brick já envia o token automaticamente, não precisamos processar.

---

### 4. USE CASES PROCESSANDO TOKEN

#### 📁 `lib/application/use-cases/ProcessPaymentUseCase.ts`

**REMOVER:**
```typescript
// Linhas 108-110 - Remover processamento de token
const token = isNewFlow ? 
  (validatedData as PaymentWithProfileData).token : 
  (validatedData as CreatePaymentData).token;

// Linha 125 - Remover token da criação
token: token,
```

---

### 5. COMPONENTE FRONTEND PROCESSANDO TOKEN

#### 📁 `src/components/payment/PaymentBrick.tsx`

**REMOVER/MODIFICAR:**
```typescript
// Linhas 233 e 249 - REMOVER processamento manual de token
token: brickData.token || brickData.formData?.token,

// Linhas 258-260 - REMOVER validação de token
if ((paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && !transformedData.token) {
  console.warn('Token ausente para pagamento com cartão');
}
```

**IMPORTANTE:** O Payment Brick gerencia tokens internamente!

---

### 6. INTERFACES E TIPOS COM TOKEN

#### 📁 `src/components/payment/PaymentBrick.tsx`

**REMOVER das interfaces:**
```typescript
// Linha 22
token?: string;

// Linha 34
token?: string;
```

---

### 7. HOOKS COM CONFIGURAÇÃO INCORRETA

#### 📁 `src/hooks/usePayment.ts`

**MODIFICAR configuração (linha 184-190):**
```typescript
// ATUAL (MISTURADO):
customization: {
  paymentMethods: {
    creditCard: 'all',
    debitCard: 'all',
    ticket: 'all',        // ❌ REMOVER
    bankTransfer: 'all',
  },

// CORRETO (APENAS PAYMENT BRICK):
customization: {
  paymentMethods: {
    creditCard: 'all',
    debitCard: 'all',
    ticket: 'none',       // ✅ Desabilitar boleto
    bankTransfer: 'all',  // PIX
    mercadoPago: 'none',  // ✅ Desabilitar wallet
  },
```

---

## 📊 RESUMO DO IMPACTO

### Arquivos a Modificar:

| Arquivo | Linhas a Remover/Modificar | Tipo de Mudança |
|---------|---------------------------|-----------------|
| `lib/domain/entities/Payment.ts` | 7, 54, 217-219, 276-281 | Remover campos token |
| `lib/application/dto/PaymentDTO.ts` | 24, 88 | Remover validação token |
| `lib/application/dto/PaymentWithProfileDTO.ts` | 34 | Remover validação token |
| `lib/infrastructure/mercadopago/MercadoPagoClient.ts` | 83 | Não enviar token |
| `lib/application/use-cases/ProcessPaymentUseCase.ts` | 108-110, 125 | Remover processamento |
| `src/components/payment/PaymentBrick.tsx` | 22, 34, 233, 249, 258-260 | Remover token manual |
| `src/hooks/usePayment.ts` | 184-190 | Corrigir configuração |

### Total de Mudanças:
- **7 arquivos** a modificar
- **~30 linhas** a remover/modificar
- **0 arquivos** a deletar completamente

---

## ✅ CÓDIGO CORRETO DO PAYMENT BRICK (MANTER)

### O que DEVE permanecer:

```typescript
// src/hooks/usePayment.ts - CORRETO
const brick = await bricksBuilder.create('payment', containerId, {
  initialization: options.initialization,
  customization: {
    // Configuração correta do Payment Brick
  },
  callbacks: {
    onSubmit: async (data) => {
      // Payment Brick gerencia tudo internamente
      // Apenas processar resposta
    }
  }
});
```

---

## 🎯 PLANO DE MIGRAÇÃO

### Fase 1: Remover Token (URGENTE)
1. Remover todos os campos `token` das entidades
2. Remover processamento de token dos DTOs
3. Parar de enviar token para MercadoPago

### Fase 2: Configurar Payment Brick Corretamente
1. Ajustar configuração em `usePayment.ts`
2. Remover lógica de tokenização manual
3. Deixar Payment Brick gerenciar tudo

### Fase 3: Testes
1. Testar pagamento com cartão crédito
2. Testar pagamento com cartão débito
3. Testar pagamento com PIX
4. Verificar que não há mais referências a token

---

## ⚠️ AVISOS IMPORTANTES

### NÃO CONFUNDIR:
- ✅ **Payment Brick** = Solução moderna do MercadoPago (MANTER)
- ❌ **Checkout Transparente** = Solução antiga (REMOVER)
- 📦 **SOS Checkout Brinks** = Nome do projeto

### APÓS REMOÇÃO:
- Taxa de aprovação deve aumentar ~40%
- Conformidade PCI-DSS garantida
- Menor risco de segurança
- Código mais simples e mantível

---

## 🔍 COMANDO PARA BUSCAR RESQUÍCIOS

Após fazer as mudanças, execute para garantir que não sobrou nada:

```bash
# Buscar por referências a token em pagamento
grep -r "token" --include="*.ts" --include="*.tsx" | grep -i "payment\|checkout"

# Buscar por checkout transparente
grep -r "transparente\|transparent" --include="*.ts" --include="*.tsx"
```

---

**Documento criado por**: Claude (AI Assistant)  
**Objetivo**: Remover completamente código do Checkout Transparente  
**Manter apenas**: Payment Brick do MercadoPago  
**Urgência**: MÁXIMA - Sistema híbrido é perigoso