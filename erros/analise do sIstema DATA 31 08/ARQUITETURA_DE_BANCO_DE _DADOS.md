# ANÁLISE ULTRA DETALHADA DA ARQUITETURA DE BANCO DE DADOS - SOS CHECKOUT BRINKS

---

## 📊 RESUMO EXECUTIVO

Após uma análise profunda e completa do sistema, identifiquei uma arquitetura bem estruturada mas com **PROBLEMAS CRÍTICOS** que precisam ser corrigidos urgentemente. O sistema apresenta inconsistências de dados, possíveis race conditions e preços desalinhados.

---

## 🗃️ 1. MAPEAMENTO COMPLETO DO BANCO DE DADOS

### Coleções do Firestore

```
├── medical_profiles (Perfis Médicos)
├── payments (Pagamentos)
├── subscriptions (Assinaturas)
└── users (Usuários)
```

### Estrutura Detalhada das Coleções

#### 🏥 medical_profiles

```typescript
{
  id: string                    // profile_<timestamp>_<random>
  fullName: string             // Nome completo
  cpf: string                  // CPF (único)
  phone: string                // Telefone
  email: string                // Email (único)
  bloodType: string            // Tipo sanguíneo
  emergencyContact: {          // Contato de emergência
    name: string,
    phone: string,
    relationship: string
  },
  medicalInfo?: {              // Informações médicas opcionais
    allergies?: string[],
    medications?: string[],
    conditions?: string[],
    observations?: string
  },
  qrCodeUrl?: string          // URL do QR Code gerado
  subscriptionPlan: 'basic'|'premium'  // Plano de assinatura
  paymentStatus: string       // Status do pagamento
  isActive: boolean          // Se o perfil está ativo
  createdAt: Date           // Data de criação
  updatedAt: Date           // Última atualização
  expiresAt?: Date          // Data de expiração
}
```

#### 💳 payments

```typescript
{
  id: string                    // payment_<timestamp>_<random>
  profileId: string            // Referência ao perfil médico
  amount: number              // Valor do pagamento
  paymentMethodId: string     // ID do método no MercadoPago
  paymentMethod: 'credit_card'|'debit_card'|'pix'|'boleto'
  status: string              // Status do pagamento
  mercadoPagoId?: string      // ID externo do MercadoPago
  token?: string              // Token de segurança
  installments: number        // Número de parcelas
  description?: string        // Descrição
  pixQrCode?: string         // QR Code PIX
  pixQrCodeBase64?: string   // QR Code PIX em base64
  boletoUrl?: string         // URL do boleto
  failureReason?: string     // Motivo da falha
  processedAt?: Date         // Data de processamento
  expiresAt?: Date          // Data de expiração
  createdAt: Date           // Data de criação
  updatedAt: Date           // Última atualização
}
```

#### 📋 subscriptions

```typescript
{
  id: string                    // subscription_<timestamp>_<random>
  profileId: string            // Referência ao perfil médico
  plan: 'basic'|'premium'      // Tipo do plano
  status: 'active'|'expired'|'cancelled'|'suspended'
  paymentId?: string          // Referência ao pagamento
  startDate: Date             // Data de início
  endDate: Date               // Data de término
  renewalDate?: Date          // Data de renovação
  cancelledAt?: Date          // Data de cancelamento
  suspendedAt?: Date          // Data de suspensão
  createdAt: Date             // Data de criação
  updatedAt: Date             // Última atualização
}
```

#### 👤 users

```typescript
{
  id: string                    // user_<timestamp>_<random>
  email: string                // Email (único)
  passwordHash: string         // Hash da senha
  role: 'user'|'admin'|'support' // Papel do usuário
  status: 'active'|'inactive'|'pending_verification'|'blocked'
  profileId?: string          // Referência ao perfil médico
  lastLoginAt?: Date          // Último login
  emailVerifiedAt?: Date      // Data de verificação do email
  createdAt: Date             // Data de criação
  updatedAt: Date             // Última atualização
}
```

---

## 🔄 2. FLUXO DE DADOS NO PAGAMENTO

### Etapa 1: Criação do Profile Médico

```
User → Frontend → API create-profile → ProfileService → FirebaseProfileRepository
```

- **Problema:** Profile é criado ANTES do pagamento ser processado
- **Risco:** Perfis órfãos se pagamento falhar

### Etapa 2: Processamento do Pagamento

```
Frontend → API process-payment → MercadoPago → PaymentRepository
```

- **Problema:** Payment pode referenciar profileId inexistente

### Etapa 3: Webhook do MercadoPago

```
MercadoPago → API webhook → PaymentService → ProfileService → QRCodeService
```

- **CRÍTICO:** Dois fluxos diferentes (novo/antigo) causam inconsistências

### Etapa 4: Geração do QR Code

```
Webhook → QRCodeService → ProfileRepository.update
```

---

## ❌ 3. PROBLEMAS CRÍTICOS IDENTIFICADOS

### 🔴 SEVERIDADE CRÍTICA

#### 3.1 Inconsistência de Preços

**Localização:** `lib/shared/constants/prices.ts` vs `lib/domain/entities/Subscription.ts`

- **Prices.ts:** Basic R$ 5,00 / Premium R$ 10,00
- **Subscription.ts:** Basic R$ 19,90 / Premium R$ 199,90
- **Impacto:** Pagamentos com valores incorretos, perda de receita

#### 3.2 Race Condition no Webhook

**Localização:** `api/mercadopago-webhook.ts:154-281`

- **Problema:** Webhook pode processar pagamento antes do profile existir
- **Código:** Cria profile no webhook se não existir (linha 183-239)
- **Risco:** Dados duplicados, inconsistências

#### 3.3 Fluxo Duplo de Criação

**Localização:** `api/mercadopago-webhook.ts:163-169`

```typescript
const isNewFlow = paymentDetails.metadata?.isNewFlow === "true";
const profileDataJson = paymentDetails.metadata?.profileData as string;
```

- **Problema:** Dois caminhos diferentes para criar perfis
- **Risco:** Lógica complexa, bugs difíceis de reproduzir

### 🟡 SEVERIDADE ALTA

#### 3.4 Falta de Transações Atômicas

**Localização:** Todos os repositories

- **Problema:** Operações relacionadas não são atômicas
- **Exemplo:** Profile + Subscription + Payment criados separadamente
- **Risco:** Dados inconsistentes em caso de falha

#### 3.5 Soft Delete Inconsistente

**Localização:** `lib/infrastructure/firebase/FirestoreClient.ts:214-220`

```typescript
if (!where || !where.some((w) => w.field === "deletedAt")) {
  try {
    query = query.where("deletedAt", "==", null);
  } catch {
    // Se falhar (campo não existe), continuar sem o filtro
  }
}
```

- **Problema:** Soft delete pode falhar silenciosamente
- **Risco:** Dados "deletados" aparecerem em queries

### 🟠 SEVERIDADE MÉDIA

#### 3.6 Validação de Dados Duplicada

**Localização:** `FirebaseProfileRepository.ts:11-83` vs Entities

- **Problema:** Validação tanto no repository quanto na entidade
- **Impacto:** Manutenção complexa, possíveis inconsistências

#### 3.7 Queries N+1

**Localização:** Repositories que fazem findMany

- **Problema:** Não há carregamento eager de relacionamentos
- **Exemplo:** Buscar profile + payment + subscription = 3 queries

---

## 🔧 4. ANÁLISE DE SEGURANÇA

### ✅ Pontos Positivos

- Validação com Zod nos repositories
- CORS configurado no webhook
- Rate limiting implementado
- Soft delete por padrão

### ❌ Problemas de Segurança

#### 4.1 Password Hash Simulado

**Localização:** `lib/domain/entities/User.ts:103-106`

```typescript
private static hashPassword(password: string): string {
  // Em um ambiente real, usaríamos bcrypt ou similar
  return `hashed_${password}_${Date.now()}`;
}
```

**RISCO CRÍTICO:** Senhas não são realmente criptografadas

#### 4.2 Dados Sensíveis em Logs

**Localização:** `api/create-profile.ts:27`

```typescript
logger.info("Create profile request received", { body });
```

**RISCO:** CPF, email, dados médicos podem vazar

---

## 📈 5. ANÁLISE DE PERFORMANCE

### 🐌 Gargalos Identificados

#### 5.1 Falta de Índices Compostos

Coleções sem índices otimizados:

- **medical_profiles:** paymentStatus + subscriptionPlan
- **payments:** profileId + status
- **subscriptions:** profileId + status

#### 5.2 Queries Sequenciais

**Localização:** `FirebasePaymentRepository.ts:232-233`

```typescript
const approvedPayments = await this.findByStatus("approved");
const totalRevenue = approvedPayments.reduce(
  (total, payment) => total + payment.getAmount(),
  0
);
```

**Problema:** Busca todos os pagamentos para calcular receita

#### 5.3 Sem Paginação Padrão

- **Problema:** Queries podem retornar milhares de registros
- **Impacto:** Timeout, consumo excessivo de memória

---

## 🔄 6. RELACIONAMENTOS E INTEGRIDADE

### Diagrama de Relacionamentos

```
User (1:0..1) ←→ MedicalProfile
MedicalProfile (1:1) ←→ Subscription
MedicalProfile (1:n) ←→ Payment
```

### Problemas de Integridade

#### 6.1 Referências Órfãs

- Payments podem referenciar profiles inexistentes
- Users podem ter profileId inválido
- Subscriptions podem ter paymentId inválido

#### 6.2 Cascading Deletes

- Não há lógica para deletar dados relacionados
- Soft delete pode deixar referências "mortas"

---

## 💡 7. RECOMENDAÇÕES URGENTES

### 🔥 Ação Imediata (Esta Semana)

1. **Alinhar Preços:** Decidir valores corretos e atualizar todas as referências
2. **Simplificar Webhook:** Remover fluxo duplo, usar apenas um caminho
3. **Implementar bcrypt:** Corrigir hash de senhas URGENTEMENTE
4. **Remover Logs Sensíveis:** Filtrar dados pessoais dos logs

### 📋 Médio Prazo (Próximo Mês)

1. **Transações Atômicas:** Implementar usando Firestore transactions
2. **Índices Compostos:** Criar índices para queries frequentes
3. **Limpeza de Órfãos:** Script para identificar e limpar dados órfãos
4. **Monitoring:** Implementar alertas para inconsistências

### 🚀 Longo Prazo (Próximos 3 Meses)

1. **Normalização:** Considerar separar dados médicos sensíveis
2. **Cache Layer:** Implementar Redis para queries frequentes
3. **Event Sourcing:** Para auditoria completa de mudanças
4. **Analytics:** Dashboard para métricas de negócio

---

## 📊 8. MÉTRICAS E MONITORAMENTO

### KPIs Recomendados

- **Integridade:** % de referências válidas
- **Performance:** Tempo médio de queries
- **Negócio:** Taxa de conversão, receita por plano
- **Segurança:** Tentativas de acesso não autorizado

---

## 🟩 CONCLUSÃO

Esta análise revela que o sistema tem uma **base sólida** mas precisa de **correções urgentes** antes de ser considerado production-ready. As inconsistências de preços e os problemas de segurança devem ser tratados imediatamente.
