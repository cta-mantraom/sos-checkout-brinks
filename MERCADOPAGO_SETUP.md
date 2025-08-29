# Configuração do MercadoPago

## ⚠️ IMPORTANTE: Configurar antes de usar

Para o Payment Brick funcionar corretamente, você precisa configurar sua chave pública do MercadoPago.

## Passos para Configuração:

### 1. Obter Chave Pública do MercadoPago

1. Acesse o [Painel de Desenvolvedores do MercadoPago](https://www.mercadopago.com.br/developers/panel)
2. Faça login com sua conta MercadoPago
3. Crie uma nova aplicação ou selecione uma existente
4. Vá em **"Credenciais de teste"** (para desenvolvimento) ou **"Credenciais de produção"** (para produção)
5. Copie a **"Public Key"** (Chave Pública)

### 2. Configurar no Projeto

1. Crie um arquivo `.env` na raiz do projeto (se não existir)
2. Adicione a seguinte linha com sua chave:

```env
VITE_MERCADOPAGO_PUBLIC_KEY=TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 3. Reiniciar o Servidor de Desenvolvimento

```bash
npm run dev
```

## Exemplo de Arquivo .env Completo

```env
# MercadoPago
VITE_MERCADOPAGO_PUBLIC_KEY=TEST-sua-chave-publica-aqui

# Firebase (opcional para desenvolvimento local)
VITE_FIREBASE_API_KEY=sua-api-key
VITE_FIREBASE_AUTH_DOMAIN=seu-dominio
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=seu-sender-id
VITE_FIREBASE_APP_ID=seu-app-id

# API
VITE_API_URL=http://localhost:3000
```

## Verificação

Para verificar se está configurado corretamente:

1. Abra o console do navegador (F12)
2. Vá até a página de checkout
3. Você deve ver a mensagem: "Inicializando MercadoPago Brick com containerId: payment-brick-container"
4. Se houver erro sobre chave não configurada, verifique o arquivo .env

## Problemas Comuns

### Erro: "MercadoPago Public Key não configurada"
- **Solução:** Verifique se o arquivo `.env` existe e contém a chave correta

### Erro: "Could not find the Brick container ID"
- **Solução:** Este erro foi corrigido nas últimas atualizações. Faça pull das últimas mudanças.

### Erro: "Invalid public_key"
- **Solução:** Verifique se você copiou a chave completa e correta do painel do MercadoPago

## Ambientes

### Desenvolvimento (Teste)
Use as credenciais de teste do MercadoPago. Estas permitem testar sem processar pagamentos reais.

### Produção
Use as credenciais de produção apenas quando estiver pronto para aceitar pagamentos reais.

## Suporte

Para mais informações sobre o MercadoPago Checkout Bricks:
- [Documentação Oficial](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/landing)
- [Payment Brick](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/payment-brick/introduction)