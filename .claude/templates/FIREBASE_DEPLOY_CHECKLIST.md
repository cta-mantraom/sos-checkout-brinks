# 🚀 Firebase Deploy Checklist - SOS Checkout Brinks

## 📋 PRÉ-DEPLOY (OBRIGATÓRIO)

### 1. Validação TypeScript
```bash
# ZERO any/unknown permitidos
npm run type-check

# Se falhar, corrigir TODOS os erros antes de continuar
grep -r "any\|unknown" src/ lib/ api/ --include="*.ts" --include="*.tsx"
```

### 2. Validação de Schemas Zod
```bash
# Verificar se todos os schemas estão criados
ls -la lib/schemas/

# Schemas obrigatórios:
# - medical-profile.schema.ts
# - payment.schema.ts  
# - qrcode.schema.ts
# - webhook.schema.ts
```

### 3. Variáveis de Ambiente
```bash
# Verificar .env.local (desenvolvimento)
cat .env.local | grep FIREBASE

# Variáveis obrigatórias:
FIREBASE_PROJECT_ID=
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

### 4. Teste Local com Emuladores
```bash
# Iniciar emuladores
firebase emulators:start

# Em outra aba, rodar testes
npm run test:firebase

# Verificar console em http://localhost:4000
```

## 🔐 SEGURANÇA PRÉ-DEPLOY

### 1. Firestore Rules
- [ ] CPF nunca exposto sem criptografia
- [ ] Dados médicos protegidos (owner only)
- [ ] QR Codes públicos para emergência
- [ ] Pagamentos backend-only
- [ ] LGPD compliance implementado

### 2. Validação de Rules
```bash
# Testar rules localmente
firebase emulators:start --only firestore

# Em outra aba
npm run test:rules

# Verificar cobertura
firebase firestore:rules-coverage
```

### 3. Índices Necessários
```bash
# Verificar índices configurados
cat firestore.indexes.json

# Deploy dry-run de índices
firebase deploy --only firestore:indexes --dry-run
```

## 📦 DEPLOY DESENVOLVIMENTO

### 1. Configurar Projeto Dev
```bash
# Usar projeto de desenvolvimento
firebase use default

# Verificar projeto ativo
firebase projects:list
```

### 2. Deploy Rules (Primeiro)
```bash
# Dry run primeiro
firebase deploy --only firestore:rules --dry-run

# Se OK, deploy real
firebase deploy --only firestore:rules

# Verificar no console
open https://console.firebase.google.com/project/sos-checkout-dev/firestore/rules
```

### 3. Deploy Índices
```bash
# Dry run
firebase deploy --only firestore:indexes --dry-run

# Deploy real (pode demorar até 10 min)
firebase deploy --only firestore:indexes

# Monitorar criação
open https://console.firebase.google.com/project/sos-checkout-dev/firestore/indexes
```

### 4. Deploy Storage Rules
```bash
# Se usar Storage
firebase deploy --only storage --dry-run
firebase deploy --only storage
```

### 5. Deploy Functions
```bash
# Build functions primeiro
cd api && npm run build && cd ..

# Deploy
firebase deploy --only functions

# Verificar logs
firebase functions:log
```

### 6. Deploy Hosting
```bash
# Build frontend
npm run build

# Deploy hosting
firebase deploy --only hosting

# Verificar site
open https://sos-checkout-dev.web.app
```

## 🌟 DEPLOY STAGING

### 1. Trocar para Staging
```bash
firebase use staging

# Confirmar
firebase projects:list
```

### 2. Checklist Staging
- [ ] Todos os testes passando
- [ ] Device ID implementado
- [ ] HMAC validation funcionando
- [ ] CPF com validação completa
- [ ] QR Code gerando corretamente

### 3. Deploy Completo Staging
```bash
# Validação completa
npm run type-check && npm run lint && npm run test

# Deploy tudo com dry-run
firebase deploy --dry-run

# Se OK, deploy real
firebase deploy

# URL staging
open https://sos-checkout-staging.web.app
```

### 4. Testes em Staging
- [ ] Criar perfil médico
- [ ] Processar pagamento teste
- [ ] Gerar QR Code
- [ ] Acessar página emergência
- [ ] Verificar webhook MercadoPago

## 🎯 DEPLOY PRODUÇÃO

### ⚠️ CHECKLIST CRÍTICO PRODUÇÃO

#### Segurança
- [ ] Device ID MercadoPago configurado
- [ ] HMAC validation ativa
- [ ] Sem console.log em código
- [ ] Sem 'any' no TypeScript
- [ ] CPF criptografado

#### Compliance
- [ ] LGPD terms aceitos
- [ ] Direito exclusão implementado
- [ ] Logs de auditoria ativos
- [ ] Dados sensíveis protegidos

#### Performance
- [ ] Build otimizado (<2MB)
- [ ] Índices criados
- [ ] Cache headers configurados
- [ ] CDN ativo

### 1. Backup Antes do Deploy
```bash
# Backup das rules atuais
firebase firestore:rules:get > backup/firestore.rules.backup

# Export dados (se necessário)
firebase emulators:export ./backup/prod-backup
```

### 2. Trocar para Produção
```bash
firebase use production

# CONFIRMAR 3 VEZES
firebase projects:list
```

### 3. Deploy em Produção
```bash
# Validação final
npm run check-all

# Deploy rules primeiro (mais seguro)
firebase deploy --only firestore:rules --dry-run
firebase deploy --only firestore:rules

# Deploy índices
firebase deploy --only firestore:indexes

# Deploy functions
firebase deploy --only functions

# Deploy hosting (último)
firebase deploy --only hosting
```

### 4. Verificação Pós-Deploy
```bash
# Verificar logs
firebase functions:log --only production

# Testar endpoints
curl https://api.sos-checkout.com/health
curl https://api.sos-checkout.com/api/status

# Verificar site
open https://sos-checkout.com
```

### 5. Monitoramento
- [ ] Firebase Console: https://console.firebase.google.com
- [ ] Verificar métricas Firestore
- [ ] Monitorar Functions logs
- [ ] Checar alertas de quota
- [ ] Analytics de QR Codes

## 🔄 ROLLBACK (EMERGÊNCIA)

### Se algo der errado:
```bash
# 1. Voltar rules anteriores
firebase deploy --only firestore:rules --project production < backup/firestore.rules.backup

# 2. Reverter hosting para versão anterior
firebase hosting:versions:list
firebase hosting:clone VERSION_ID

# 3. Desabilitar functions com problema
firebase functions:delete functionName --force
```

## 📊 PÓS-DEPLOY

### Métricas para Monitorar
- **Taxa de Aprovação Pagamentos**: > 85%
- **Tempo Geração QR Code**: < 2s
- **Erros em Functions**: < 0.1%
- **Latência Firestore**: < 100ms
- **Uptime**: > 99.9%

### Logs Importantes
```bash
# Pagamentos
firebase functions:log --only paymentProcessor

# Webhooks
firebase functions:log --only webhookHandler

# QR Codes
firebase functions:log --only qrcodeGenerator
```

## 🚨 CONTATOS EMERGÊNCIA

### Se precisar de ajuda:
1. Consultar `firebase-config-agent`
2. Verificar docs/07-firebase-integration.md
3. Firebase Support: https://firebase.google.com/support

## ✅ DEPLOY CONCLUÍDO

Após deploy bem-sucedido:
1. Atualizar status em .claude/deploys/[data].md
2. Notificar equipe
3. Monitorar métricas por 24h
4. Backup de configurações

---

**LEMBRE-SE**: 
- **NUNCA** fazer deploy direto em produção sem staging
- **SEMPRE** fazer dry-run antes do deploy real
- **NUNCA** deployar com 'any' no código
- **SEMPRE** verificar Device ID do MercadoPago
- **NUNCA** expor dados médicos sem autorização

Este sistema salva vidas. Cada deploy deve ser perfeito.