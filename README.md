# 🚨 SOS CHECKOUT BRINKS - Sistema de Emergência Médica

## 📋 VISÃO GERAL

Sistema de emergência médica para motociclistas com checkout integrado MercadoPago, focado exclusivamente no fluxo de pagamento e geração de QR Code para acesso emergencial.

### 🎯 Objetivo Principal
Criar um sistema robusto e seguro que permita motociclistas cadastrarem informações médicas essenciais, realizarem pagamento via MercadoPago e receberem QR Code para emergências.

### 🏗️ Arquitetura
- **Domain-Driven Design (DDD)** - Separação clara de responsabilidades
- **TypeScript Strict Mode** - Zero uso de `any`
- **Validação Zod** - Todas entradas validadas
- **Production Ready** - Código pronto para produção desde o primeiro commit

## 📁 ESTRUTURA DO PROJETO

```
sos-checkout-brinks/
├── docs/                     # Documentação completa
│   ├── 01-implementation-plan.md
│   ├── 02-architecture-ddd.md
│   ├── 03-mercadopago-integration.md
│   ├── 04-agents-guide.md
│   ├── 05-use-cases-flows.md
│   └── 06-phase-checklist.md
├── api/                      # Vercel Functions
├── lib/                      # Domain Layer (DDD)
├── src/                      # Frontend React
└── .docMp/                   # Documentação MercadoPago
```

## ⚡ QUICK START

### Pré-requisitos
- Node.js 20+
- NPM ou Yarn
- Conta MercadoPago (Sandbox e Produção)
- Firebase Project configurado
- Vercel CLI instalado

### Instalação
```bash
# Clone o repositório
git clone https://github.com/cta-mantraom/sos-checkout-brinks.git

# Instale as dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env.local

# Execute em desenvolvimento
npm run dev
```

## 🔑 FUNCIONALIDADES CORE

### Para Motociclistas
1. **Formulário Médico** - Dados essenciais para emergência
2. **Seleção de Plano** - Básico (R$ 5,00) ou Premium (R$ 10,00)
3. **Checkout Seguro** - MercadoPago com Cartão ou PIX
4. **QR Code** - Acesso instantâneo para socorristas

### Para Socorristas
1. **Scan Rápido** - Leitura do QR Code
2. **Acesso Imediato** - Informações médicas críticas
3. **Contato Emergência** - Dados do contato de emergência

## 📚 DOCUMENTAÇÃO

### Guias de Implementação
- [📋 Plano de Implementação](./docs/01-implementation-plan.md)
- [🏗️ Arquitetura DDD](./docs/02-architecture-ddd.md)
- [💳 Integração MercadoPago](./docs/03-mercadopago-integration.md)
- [👥 Guia dos Agentes](./docs/04-agents-guide.md)
- [🔄 Casos de Uso e Fluxos](./docs/05-use-cases-flows.md)
- [✅ Checklist por Fases](./docs/06-phase-checklist.md)

### Referências MercadoPago
- [Documentação Oficial](./.docMp/)
- Payment Brick
- Webhooks com HMAC
- Status de Pagamento

## 🚀 DEPLOY

### Vercel
```bash
# Deploy para produção
vercel --prod

# Deploy para preview
vercel
```

### Variáveis de Ambiente Necessárias
```env
# MercadoPago
VITE_MP_PUBLIC_KEY=
MP_ACCESS_TOKEN=
MP_WEBHOOK_SECRET=

# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# App
VITE_APP_URL=https://memoryys.com
```

## 🔒 SEGURANÇA

- ✅ Validação HMAC em webhooks
- ✅ Sanitização de todas entradas
- ✅ Headers de segurança configurados
- ✅ Zero exposição de secrets
- ✅ Device fingerprinting ativo

## 📞 SUPORTE

Para questões técnicas ou suporte:
- Email: contatomantraom@gmail.com
- GitHub Issues: [Reportar Problema](https://github.com/cta-mantraom/sos-checkout-brinks/issues)

## 📄 LICENÇA

Copyright © 2024 CTA MantraOM. Todos os direitos reservados.

---

**IMPORTANTE**: Este sistema está focado exclusivamente no checkout, formulário médico, pagamento e QR Code. Funcionalidades adicionais estão fora do escopo.