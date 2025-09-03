# Process Payment Endpoint - Guia de Uso

## Endpoint
`POST /api/process-payment`

## Headers Obrigatórios
```http
Content-Type: application/json
X-Device-Session-Id: <device-id-from-mercadopago-script>
X-Idempotency-Key: <unique-key> (opcional)
```

## Exemplo 1: Pagamento com Cartão de Crédito

### Request
```json
{
  "payment": {
    "paymentType": "credit_card",
    "selectedPaymentMethod": "credit_card",
    "formData": {
      "token": "e372d243b4ca365250a6391d4c91e31f",
      "issuer_id": "24",
      "payment_method_id": "master",
      "transaction_amount": 5,
      "installments": 1,
      "payer": {
        "email": "appparaty@gmail.com",
        "identification": {
          "type": "CPF",
          "number": "39746571850"
        }
      }
    }
  },
  "profile": {
    "fullName": "João Silva",
    "cpf": "39746571850",
    "phone": "11999999999",
    "bloodType": "O+",
    "emergencyContact": "Maria Silva",
    "medicalInfo": "Diabético",
    "subscriptionPlan": "basic"
  },
  "metadata": {
    "deviceId": "MP_DEVICE_SESSION_ID_VALUE"
  }
}
```

### Response (Sucesso)
```json
{
  "success": true,
  "payment": {
    "id": "1234567890",
    "status": "approved",
    "status_detail": "accredited",
    "amount": 5,
    "payment_method_id": "master"
  },
  "profile": {
    "id": "profile-uuid"
  }
}
```

## Exemplo 2: Pagamento PIX

### Request
```json
{
  "payment": {
    "paymentType": "bank_transfer",
    "selectedPaymentMethod": "bank_transfer",
    "formData": {
      "payment_method_id": "pix",
      "transaction_amount": 10,
      "payer": {
        "email": "appparaty@gmail.com"
      }
    }
  },
  "profile": {
    "fullName": "João Silva",
    "subscriptionPlan": "premium"
  }
}
```

### Response (Sucesso - PIX)
```json
{
  "success": true,
  "payment": {
    "id": "1234567890",
    "status": "pending",
    "status_detail": "pending_waiting_payment",
    "amount": 10,
    "payment_method_id": "pix"
  },
  "profile": {
    "id": "profile-uuid"
  },
  "pix": {
    "qr_code": "00020126580014br.gov.bcb.pix...",
    "qr_code_base64": "iVBORw0KGgoAAAANSUhEUgAAA...",
    "expiration_time": 1800
  }
}
```

## Exemplo de Erro: Dados Inválidos

### Response (400)
```json
{
  "success": false,
  "error": "Dados inválidos",
  "details": [
    {
      "field": "payment.formData.transaction_amount",
      "message": "Valor deve ser R$ 5,00 ou R$ 10,00"
    }
  ],
  "code": "VALIDATION_ERROR"
}
```

## Exemplo de Erro: Device ID Ausente

### Response (400)
```json
{
  "success": false,
  "error": "Device ID é obrigatório para segurança. Verifique se o script do MercadoPago foi carregado.",
  "code": "DEVICE_ID_REQUIRED"
}
```

## Implementação Frontend

### 1. Carregar Script do MercadoPago
```html
<script src="https://www.mercadopago.com/v2/security.js" view="checkout"></script>
```

### 2. Aguardar Device ID
```javascript
// Aguardar até que o Device ID seja gerado
const waitForDeviceId = () => {
  return new Promise((resolve) => {
    const checkDeviceId = () => {
      if (window.MP_DEVICE_SESSION_ID) {
        resolve(window.MP_DEVICE_SESSION_ID);
      } else {
        setTimeout(checkDeviceId, 100);
      }
    };
    checkDeviceId();
  });
};
```

### 3. Enviar Pagamento
```javascript
const processPayment = async (paymentData, profileData) => {
  const deviceId = await waitForDeviceId();
  
  const response = await fetch('/api/process-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Session-Id': deviceId
    },
    body: JSON.stringify({
      payment: paymentData,
      profile: profileData
    })
  });
  
  return await response.json();
};
```

## Códigos de Status

| Código | Descrição | Ação |
|--------|-----------|------|
| 200 | Sucesso | Processar resultado |
| 400 | Dados inválidos | Corrigir dados e tentar novamente |
| 405 | Método não permitido | Use POST |
| 500 | Erro interno | Tentar novamente ou contatar suporte |
| 503 | Serviço indisponível | Aguardar e tentar novamente |

## Status de Pagamento

| Status MercadoPago | Significado | Próxima Ação |
|------------------|-------------|--------------|
| approved | Pagamento aprovado | Gerar QR Code |
| pending | Aguardando pagamento (PIX) | Monitorar status |
| rejected | Pagamento rejeitado | Tentar outro método |
| cancelled | Pagamento cancelado | Iniciar novo pagamento |

## Validações Implementadas

1. **Device ID**: Obrigatório para segurança
2. **Valores**: Apenas R$ 5,00 (básico) ou R$ 10,00 (premium)
3. **Email**: Formato válido obrigatório
4. **CPF**: 11 dígitos quando presente
5. **Token**: Obrigatório para cartão de crédito
6. **Payment Method**: Validação de métodos suportados

## Logs Estruturados

O endpoint gera logs detalhados para monitoramento:

```json
{
  "timestamp": "2024-01-01T10:00:00Z",
  "level": "info",
  "action": "payment_processed",
  "payment_id": "1234567890",
  "status": "approved",
  "amount": 5,
  "method": "credit_card"
}
```

## Troubleshooting

### Device ID não é gerado
- Verificar se o script do MercadoPago foi carregado
- Aguardar alguns segundos após carregar a página
- Verificar console do browser por erros

### Pagamento rejeitado
- Verificar dados do cartão
- Confirmar se o valor está correto
- Tentar outro método de pagamento

### Erro 503 (Serviço indisponível)
- Aguardar 30 segundos
- Tentar novamente
- Se persistir, contatar suporte