# 📋 INSTRUÇÕES PARA O AGENT: REFATORAÇÃO COMPLETA DO SISTEMA

**Agent Responsável: payment-checkout-specialist**  
**Data: 31/08/2025**  
**Prioridade: 🔴 MÁXIMA - CRÍTICA**

---

## ⚠️ REGRAS INEGOCIÁVEIS DO PROJETO

### PROIBIÇÕES ABSOLUTAS:
- ❌ **NUNCA** usar `any` - PROIBIDO SEMPRE
- ❌ **`unknown` APENAS** para dados externos - validar IMEDIATAMENTE com Zod
- ❌ **NUNCA** criar testes em nenhuma parte do código
- ❌ **NUNCA** implementar checkout customizado
- ❌ **NUNCA** acessar `process.env` diretamente - usar configs desacopladas

### OBRIGAÇÕES:
- ✅ **SEMPRE** usar Payment Brick do MercadoPago
- ✅ **SEMPRE** validar tudo com Zod primeiro
- ✅ **SEMPRE** usar lazy loading para configurações
- 🧠 **THINKING BUDGETS** - "Pensar mais ao fundo", "ultra think"

---

## 📚 DOCUMENTOS OBRIGATÓRIOS PARA ANÁLISE

### 1. Análises do Sistema (LER TODOS):
- `@erros/analise do sIstema DATA 31 08/ANÁLISE_DO_DIAGRAMA_VS_IMPLEMENTAÇÃO_ATUAL.md`
- `@erros/analise do sIstema DATA 31 08/ARQUITETURA_DE_BANCO_DE _DADOS.md`
- `@erros/analise do sIstema DATA 31 08/DETALHADA_DO_FLUXO_DE_PAGAMENTO.md`
- `@erros/analise do sIstema DATA 31 08/resumo.md`

### 2. Documentos de Refatoração (LER TODOS):
- `@erros/refatorar/ANALISE_COMPLETA_SISTEMA_31_08_2025.md`
- `@erros/refatorar/ANALISE_COMPLEMENTAR_PROBLEMAS_CRITICOS_31_08_2025.md`
- `@erros/refatorar/MAPEAMENTO_CHECKOUT_TRANSPARENTE_REMOVER.md`
- `@erros/refatorar/DECISAO_MIGRACAO_PAYMENT_BRICK.md`

---

## 🎯 TAREFAS EM ORDEM DE EXECUÇÃO

### FASE 1: REMOÇÃO TOTAL DO CHECKOUT TRANSPARENTE ❌

#### 1.1 Remover campos token das entidades:
```
ARQUIVOS A MODIFICAR:
- lib/domain/entities/Payment.ts → Remover linhas 7, 54, 217-219, 276-281
- lib/application/dto/PaymentDTO.ts → Remover linhas 24, 88
- lib/application/dto/PaymentWithProfileDTO.ts → Remover linha 34
- lib/infrastructure/repositories/FirebasePaymentRepository.ts → Remover campo token
```

#### 1.2 Parar processamento de tokens:
```
ARQUIVOS A MODIFICAR:
- lib/infrastructure/mercadopago/MercadoPagoClient.ts → Remover linha 83
- lib/application/use-cases/ProcessPaymentUseCase.ts → Remover linhas 108-110, 125
- src/components/payment/PaymentBrick.tsx → Remover linhas 22, 34, 233, 249, 258-260
```

### FASE 2: CORREÇÕES CRÍTICAS DE VALORES 💰

#### 2.1 Corrigir valores URGENTE (estão 20x maiores):
```
VALORES CORRETOS:
- Plano Basic: R$ 5,00 (está 19,90)
- Plano Premium: R$ 10,00 (está 199,90)

ARQUIVOS A CORRIGIR:
- lib/shared/constants/prices.ts
- lib/domain/entities/Subscription.ts
- src/lib/constants/prices.ts
- Qualquer outro arquivo com 19.9 ou 199.9
```

### FASE 3: IMPLEMENTAR PAYMENT BRICK CORRETAMENTE ✅

#### 3.1 Configuração unificada:
```typescript
// src/hooks/usePayment.ts - linhas 184-190
paymentMethods: {
  creditCard: 'all',
  debitCard: 'all',
  ticket: 'none',       // SEM boleto
  bankTransfer: 'all',  // PIX
  mercadoPago: 'none',  // SEM wallet
}
```

#### 3.2 Device Fingerprinting (CRÍTICO):
```html
<!-- index.html -->
<script src="https://www.mercadopago.com/v2/security.js" view="checkout"></script>
```

#### 3.3 Corrigir bug cartão→PIX:
```
src/components/payment/PaymentBrick.tsx - linhas 86-88
- REMOVER default para PIX quando não identificado
- Adicionar erro em vez de defaultar
```

### FASE 4: FLUXO DE DADOS CORRETO 📊

#### 4.1 Implementar fluxo correto:
```
FLUXO OBRIGATÓRIO:
1. Formulário médico preenchido
2. Dados NÃO salvos no banco
3. Pagamento processado
4. SE aprovado → Salvar dados no banco
5. SE pendente (PIX) → Aguardar webhook
6. SE rejeitado → NÃO salvar nada
```

#### 4.2 Corrigir ProcessPaymentUseCase:
```
- NÃO salvar profile antes do pagamento
- Criar profile temporário em memória
- Salvar APENAS após aprovação via webhook
```

### FASE 5: REMOVER CÓDIGO NÃO UTILIZADO 🗑️

#### 5.1 Arquivos para análise de remoção:
```
- api/generate-qr.ts → Verificar se obsoleto
- api/get-profile.ts → Verificar se é fluxo antigo
- api/dist/* → REMOVER todos os builds
- Qualquer referência a "boleto"
- Qualquer referência a "transparente"
```

### FASE 6: SEGURANÇA E COMPLIANCE 🔒

#### 6.1 Implementar bcrypt para senhas:
```typescript
// lib/domain/entities/User.ts - linha 103-106
import bcrypt from 'bcrypt';
private static async hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
```

#### 6.2 Remover logs sensíveis:
```
api/create-profile.ts - linha 27
- NÃO logar body completo
- NÃO logar CPF, dados médicos
```

---

## 🔍 PROBLEMAS ESPECÍFICOS A RESOLVER

### 1. BUG CRÍTICO: Cartão sendo processado como PIX
- **Arquivo**: `src/components/payment/PaymentBrick.tsx`
- **Linhas**: 191-218
- **Solução**: Remover default para PIX, adicionar log de erro

### 2. Opções de pagamento incorretas no UI
- **Arquivo**: `src/hooks/usePayment.ts`
- **Solução**: Configurar apenas cartão e PIX

### 3. Race condition no webhook
- **Arquivo**: `api/mercadopago-webhook.ts`
- **Solução**: Implementar lock/mutex para evitar duplicação

### 4. Transações não atômicas
- **Solução**: Usar Firebase transactions

---

## 📈 MÉTRICAS DE SUCESSO

### Após refatoração, validar:
- [ ] Taxa de aprovação > 80%
- [ ] Zero referências a "token" no código
- [ ] Device Fingerprinting funcionando
- [ ] Valores corretos (R$ 5,00 e R$ 10,00)
- [ ] Nenhum log com dados sensíveis
- [ ] Dados salvos APENAS após aprovação
- [ ] Sem campos/métodos de boleto
- [ ] PCI-DSS compliance total

---

## ⚠️ AVISOS IMPORTANTES

### NÃO CONFUNDIR:
- **Payment Brick** = Solução CORRETA do MercadoPago ✅
- **Checkout Transparente** = REMOVER COMPLETAMENTE ❌
- **SOS Checkout Brinks** = Nome do PROJETO (não é tipo de checkout)

### ARQUITETURA A MANTER:
- DDD (Domain Driven Design)
- Clean Architecture
- Separação: domain → application → infrastructure
- Value Objects (CPF, Email, etc)
- Validação com Zod

### FLUXO DE PAGAMENTO CORRETO:
1. Payment Brick coleta dados
2. Backend processa com MercadoPago
3. Webhook confirma resultado
4. Salvar no banco APENAS se aprovado

---

## 🚀 COMANDO PARA INICIAR

**Agent: payment-checkout-specialist**

```
TAREFA: Executar refatoração completa do sistema de pagamento
PRIORIDADE: Máxima
INÍCIO: Fase 1 - Remover Checkout Transparente
VALIDAÇÃO: Usar checklist de métricas de sucesso
THINKING: "Ultra think" - analisar profundamente cada mudança
```

---

**IMPORTANTE**: 
- Analisar TODOS os documentos listados antes de começar
- Seguir ordem das fases rigorosamente
- Validar cada mudança antes de prosseguir
- NÃO criar testes
- NÃO usar any
- SEMPRE validar com Zod

**Documento criado para**: payment-checkout-specialist  
**Objetivo**: Refatoração completa para Payment Brick  
**Resultado esperado**: Sistema 100% Payment Brick, sem código legado