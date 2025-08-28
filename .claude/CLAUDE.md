# SOS Checkout Brinks - Sistema de QR Code para Emergências Médicas

## ⚠️ REGRAS UNIVERSAIS OBRIGATÓRIAS
**TODOS OS AGENTES DEVEM LER**: 
1. `.claude/UNIVERSAL_AGENT_RULES.md` - Regras fundamentais
2. `.claude/CONFIG_ARCHITECTURE.md` - Arquitetura de configuração desacoplada

### Regras Inegociáveis:
- ❌ **NUNCA** usar `any` - PROIBIDO SEMPRE (não existe "any com validação")
- ❌ **`unknown` APENAS** para dados externos - validar IMEDIATAMENTE com Zod
- ❌ **NUNCA** criar testes em nenhuma parte do código
- ❌ **NUNCA** implementar checkout customizado
- ❌ **NUNCA** acessar `process.env` diretamente - usar configs desacopladas
- ✅ **SEMPRE** usar Payment Brick do MercadoPago
- ✅ **SEMPRE** validar tudo com Zod primeiro
- ✅ **SEMPRE** usar lazy loading para configurações
- 🧠 **THINKING BUDGETS** - "Pensar mais ao fundo", "ultra think"

## 🎯 MISSÃO CRÍTICA
Desenvolver um sistema de checkout robusto para venda de QR Codes de emergência médica para motociclistas. Cada código pode salvar uma vida, portanto QUALIDADE e CONFIABILIDADE são inegociáveis.

## 🏗️ ARQUITETURA DO PROJETO

### Stack Principal
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Vercel Functions (Serverless)
- **Pagamentos**: MercadoPago (Payment Brick + PIX)
- **Database**: Firebase Firestore
- **QR Code**: QRCode.js + Download automático

### Estrutura de Preços
- **Plano Básico**: R$ 5,00 - QR Code com dados essenciais
- **Plano Premium**: R$ 10,00 - QR Code com funcionalidades avançadas

## 🤖 SISTEMA DE AGENTES ESPECIALIZADOS

### Agentes Disponíveis
1. **payment-checkout-specialist**: Checkout, pagamentos, MercadoPago
2. **medical-form-specialist**: Formulários médicos, validações, QR Codes

### WORKFLOW OBRIGATÓRIO DO PARENT AGENT

#### 1. Análise Inicial
```bash
# SEMPRE começar analisando o contexto atual
ls -la src/ api/ lib/
grep -r "TODO\|FIXME\|BUG" .
npm run type-check
```

#### 2. Consulta aos Agentes
```markdown
# Para funcionalidades de pagamento
> Consultar payment-checkout-specialist para [descrição da tarefa]

# Para formulários e dados médicos
> Consultar medical-form-specialist para [descrição da tarefa]
```

#### 3. Planejamento Antes da Implementação
**NUNCA** implementar diretamente. **SEMPRE**:
1. Criar plano detalhado em `.claude/plans/[feature].md`
2. Listar arquivos que serão modificados
3. Definir ordem de implementação
4. Identificar pontos de teste

#### 4. Implementação Estruturada
```typescript
// SEMPRE seguir este padrão
// 1. Validação de entrada
// 2. Processamento principal
// 3. Tratamento de erros
// 4. Logging estruturado
// 5. Retorno padronizado
```

#### 5. Validação Pós-Implementação
```bash
# Obrigatório após cada mudança
npm run type-check
npm run lint
npm run test
npm run build
```

## 🔒 REGRAS CRÍTICAS DE SEGURANÇA

### NUNCA
- ❌ Armazenar dados de cartão de crédito
- ❌ Logar informações sensíveis (CPF completo, dados médicos)
- ❌ Processar pagamentos sem Device ID
- ❌ Aceitar webhooks sem validação HMAC
- ❌ Usar `any` no TypeScript

### SEMPRE
- ✅ Validar todos os inputs com Zod
- ✅ Sanitizar dados médicos com DOMPurify
- ✅ Implementar rate limiting
- ✅ Usar HTTPS em produção
- ✅ Ter fallback offline para dados críticos

## 📋 CHECKLIST DE QUALIDADE

### Antes de Qualquer Commit
- [ ] TypeScript sem erros
- [ ] Sem uso de `any`
- [ ] Validação Zod implementada
- [ ] Testes passando
- [ ] Build funcionando
- [ ] Console.log removidos

### Para Funcionalidades de Pagamento
- [ ] Device ID implementado
- [ ] HMAC validation no webhook
- [ ] Idempotency key presente
- [ ] Valores corretos (R$ 5 e R$ 10)
- [ ] PIX habilitado
- [ ] Retry logic implementado

### Para Formulários Médicos
- [ ] CPF validado corretamente
- [ ] Campos obrigatórios marcados
- [ ] Sanitização implementada
- [ ] Dados em localStorage
- [ ] QR Code gerando
- [ ] Mensagens de erro em português

## 🚨 FLUXO DE EMERGÊNCIA

### Quando Encontrar um BUG Crítico
1. **PARAR** tudo imediatamente
2. Documentar em `.claude/bugs/[timestamp].md`
3. Consultar agente especializado
4. Implementar fix com testes
5. Validar em ambiente staging

### Problemas Comuns e Soluções

#### "Taxa de aprovação baixa no MercadoPago"
```bash
# Verificar implementação
grep -r "MP_DEVICE_SESSION_ID" src/
# Se não encontrar, implementar Device ID urgentemente
```

#### "Formulário não valida"
```bash
# Verificar schemas Zod
grep -r "z.object" lib/schemas/
# Confirmar que todos os campos têm validação
```

#### "QR Code não gera"
```bash
# Verificar dados do profile
grep -r "generateQRCode" src/
# Confirmar que dados estão completos e válidos
```

## 📊 MÉTRICAS DE SUCESSO

### KPIs Críticos
- **Taxa de Conversão**: > 60%
- **Taxa de Aprovação (MercadoPago)**: > 85%
- **Tempo de Checkout**: < 2 minutos
- **Tempo de Carregamento QR**: < 2 segundos
- **Uptime**: > 99.9%

### Monitoramento Obrigatório
```typescript
// Em cada ação crítica
console.log(JSON.stringify({
  action: 'checkout_completed',
  timestamp: new Date().toISOString(),
  data: { /* dados não sensíveis */ }
}));
```

## 🔄 WORKFLOW DE DESENVOLVIMENTO

### Para Nova Feature
1. Consultar agente especializado
2. Criar plano em `.claude/plans/`
3. Implementar incrementalmente
4. Testar cada incremento
5. Validar com `npm run check-all`
6. Documentar mudanças

### Para Bug Fix
1. Reproduzir o bug
2. Criar teste que falha
3. Implementar correção
4. Verificar teste passando
5. Testar regressões
6. Deploy em staging primeiro

## 🎯 PRIORIDADES DO PROJETO

### P0 - Crítico (Bloqueia lançamento)
- Checkout funcional com MercadoPago
- Geração de QR Code
- Validação de dados médicos

### P1 - Importante (Primeira semana)
- PIX payment
- Download do QR Code
- Email de confirmação

### P2 - Desejável (Futuro próximo)
- Dashboard administrativo
- Estatísticas de uso
- Múltiplos perfis médicos

## 📝 PADRÕES DE CÓDIGO

### Nomenclatura
```typescript
// Componentes: PascalCase
MedicalFormComponent.tsx

// Funções: camelCase
validateCPF()

// Constantes: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;

// Tipos/Interfaces: PascalCase com prefixo
interface IMedicalProfile {}
type TPaymentStatus = 'pending' | 'approved' | 'rejected';
```

### Estrutura de Arquivos
```
src/
├── components/     # Componentes React
├── hooks/         # Custom hooks
├── lib/           # Lógica de negócio
│   ├── schemas/   # Validações Zod
│   ├── services/  # Serviços externos
│   └── utils/     # Funções auxiliares
├── pages/         # Páginas da aplicação
└── styles/        # Estilos globais
```

## 🛠️ COMANDOS ESSENCIAIS

### Desenvolvimento
```bash
npm run dev          # Servidor local
npm run type-check   # Verificar tipos
npm run lint         # Verificar código
npm run test         # Rodar testes
npm run build        # Build produção
```

### Debugging
```bash
# Ver logs de pagamento
grep -r "payment\|checkout" logs/

# Verificar erros
grep -r "error\|Error\|ERROR" logs/

# Status da aplicação
npm run status
```

## 🚀 DEPLOY

### Checklist Pré-Deploy
- [ ] Todos os testes passando
- [ ] Build sem erros
- [ ] Variáveis de ambiente configuradas
- [ ] Webhook URL atualizada no MercadoPago
- [ ] Device fingerprinting ativo
- [ ] Rate limiting configurado

### Processo de Deploy
```bash
# 1. Validar localmente
npm run check-all

# 2. Deploy staging
vercel --env preview

# 3. Testar staging
npm run test:e2e

# 4. Deploy produção
vercel --prod
```

## ⚠️ NOTAS IMPORTANTES

1. **Device ID é OBRIGATÓRIO** - Sem ele, aprovação cai 40%
2. **HMAC validation é CRÍTICO** - Segurança de webhooks
3. **Dados médicos são SENSÍVEIS** - LGPD compliance obrigatório
4. **QR Code deve ser IMUTÁVEL** - Uma vez gerado, não muda
5. **Performance é VITAL** - Segundos podem salvar vidas

---

**LEMBRE-SE**: Este sistema pode ser a diferença entre a vida e a morte em uma emergência. Cada linha de código importa. Qualidade não é negociável.