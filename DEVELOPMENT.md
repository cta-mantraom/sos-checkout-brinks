# Guia de Desenvolvimento - SOS Checkout

## Como Rodar o Projeto

### Desenvolvimento Local

Para rodar o projeto em desenvolvimento local com as Vercel Functions:

1. **Instalar dependências:**
```bash
npm install
```

2. **Rodar o backend (Vercel Functions) - IMPORTANTE:**
```bash
# Em um terminal separado
vercel dev
# Isso rodará as funções da API na porta 3000
```

3. **Rodar o frontend (Vite):**
```bash
# Em outro terminal
npm run dev
# Isso rodará o frontend na porta 8080
```

O Vite está configurado para fazer proxy das requisições `/api/*` para `http://localhost:3000` onde as Vercel Functions estão rodando.

## Correções Implementadas

### 1. Vercel.json - Rotas da API
- **Problema:** Todas as rotas estavam sendo redirecionadas para index.html, incluindo `/api/*`
- **Solução:** Adicionado padrão regex para excluir rotas `/api/*` do rewrite

### 2. Vite Proxy - Desenvolvimento Local
- **Problema:** Em desenvolvimento, as requisições para `/api/*` não chegavam ao backend
- **Solução:** Configurado proxy no vite.config.ts para redirecionar `/api/*` para `localhost:3000`

## Fluxo de Pagamento PIX

### Fluxo Esperado:
1. Usuário seleciona PIX como método de pagamento
2. PaymentBrick processa o pagamento via `/api/process-payment`
3. Backend retorna status `pending` com QR Code
4. PaymentBrick detecta PIX e mostra StatusScreenBrick
5. StatusScreenBrick exibe QR Code e faz polling para `/api/payment-status`
6. Quando pagamento é confirmado, redireciona para `/success`

### Problema Atual:
- O fluxo está funcionando mas o endpoint `/api/payment-status` precisa estar rodando corretamente
- Certifique-se de que `vercel dev` está rodando para as APIs funcionarem

## Variáveis de Ambiente Necessárias

Crie um arquivo `.env.local` na raiz do projeto:

```env
# MercadoPago
VITE_MERCADOPAGO_PUBLIC_KEY=YOUR_PUBLIC_KEY
MERCADOPAGO_ACCESS_TOKEN=YOUR_ACCESS_TOKEN

# Firebase (backend)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# App Config
VITE_API_URL=http://localhost:3000
```

## Testando Pagamento PIX

1. Preencha o formulário médico
2. Vá para checkout
3. Selecione PIX como método de pagamento
4. O sistema deve:
   - Mostrar o QR Code do PIX
   - Fazer polling automático do status
   - Redirecionar quando pagamento for confirmado

## Debug

Para debugar o fluxo:
1. Abra o console do navegador (F12)
2. Observe os logs que começam com "Dados brutos do MercadoPago Brick"
3. Verifique se o ID do pagamento está sendo recebido
4. Confirme que o StatusScreenBrick está sendo renderizado

## Estrutura das APIs

- `/api/process-payment` - Processa pagamento (não salva no banco até confirmação)
- `/api/payment-status` - Verifica status do pagamento
- `/api/mercadopago-webhook` - Recebe notificações do MercadoPago
- `/api/create-profile` - Cria perfil médico
- `/api/get-profile` - Busca perfil médico
- `/api/generate-qr` - Gera QR Code médico

## Notas Importantes

- **NUNCA** use `any` no TypeScript
- **SEMPRE** valide dados com Zod
- **SEMPRE** use o Payment Brick do MercadoPago para processar pagamentos
- Dados só são salvos no banco após confirmação via webhook
- O StatusScreenBrick do MercadoPago deve ser usado para PIX

## Troubleshooting

### Erro 404 em /api/payment-status
- Verifique se `vercel dev` está rodando
- Confirme que o proxy do Vite está configurado corretamente
- Verifique se o vercel.json não está reescrevendo rotas `/api/*`

### PIX não mostra QR Code
- Verifique se o MercadoPago Public Key está configurada
- Confirme que o backend está retornando o pixData
- Verifique os logs do console para erros

### Redirecionamento prematuro
- O sistema não deve redirecionar imediatamente quando for PIX
- Deve mostrar o StatusScreenBrick primeiro
- Só redireciona após confirmação do pagamento