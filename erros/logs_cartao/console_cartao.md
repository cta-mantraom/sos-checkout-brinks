### logs no console do navegador na modalidade cartão

MercadoPago Brick inicializado com sucesso
index-0B6MqveJ.js:302 Payment Brick está pronto
index-0B6MqveJ.js:302 Dados brutos do MercadoPago Brick: {
"paymentType": "credit_card",
"selectedPaymentMethod": "credit_card",
"formData": {
"token": "8a2ac059ed14d9bf52e4b9160b325b14",
"issuer_id": "25",
"payment_method_id": "visa",
"transaction_amount": 19.9,
"installments": 1,
"payer": {
"email": "appparaty@gmail.com",
"identification": {
"type": "CPF",
"number": "39746571850"
}
}
}
}
index-0B6MqveJ.js:302 Método de pagamento identificado: {paymentMethodId: 'pix', paymentMethod: 'pix', hasToken: false, isPix: false}hasToken: falseisPix: falsepaymentMethod: "pix"paymentMethodId: "pix"[[Prototype]]: Object
index-0B6MqveJ.js:302 Dados transformados para envio: {amount: 19.9, paymentMethodId: 'pix', paymentMethod: 'pix', token: '8a2ac059ed14d9bf52e4b9160b325b14', installments: 1, …}amount: 19.9installments: 1payer: email: "appparaty@gmail.com"identification: number: "39746571850"type: "CPF"[[Prototype]]: Object[[Prototype]]: ObjectpaymentMethod: "pix"paymentMethodId: "pix"profileData: bloodType: "O+"cpf: "39746571850"email: "appparaty@gmail.com"emergencyContact: name: "William freitas rondon"phone: "24992684832"relationship: "Williams Team"[[Prototype]]: ObjectfullName: "William freitas rondon"medicalInfo: additionalNotes: ""allergies: []medicalConditions: []medications: [][Prototype]]: Objectphone: "24992684832"subscriptionPlan: "basic"[[Prototype]]: Objecttoken: "8a2ac059ed14d9bf52e4b9160b325b14"[[Prototype]]: Object
index-0B6MqveJ.js:302 Resposta do backend: {success: true, data: {…}}
index-0B6MqveJ.js:302 [PaymentBrick] DEBUG - payment.externalId: 124374681622
index-0B6MqveJ.js:302 [PaymentBrick] DEBUG - payment.id: payment_1756673925188_ocxvgq9se
index-0B6MqveJ.js:302 [PaymentBrick] DEBUG - mercadopago.paymentId: payment_1756673925188_ocxvgq9se
index-0B6MqveJ.js:302 PIX QR Code recebido: {qrCode: '00020126360014br.gov.bcb.pix0114+55249926848325204…E.6006Parati62250521mpqrinter12437468162263047BEE', qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUgAABRQAAAUUAQAAAACGnaNFAAANVk…eCcYzwXgmGM8E45l8C+P/AJNDu2yntgCtAAAAAElFTkSuQmCC'}qrCode: "00020126360014br.gov.bcb.pix0114+5524992684832520400005303986540519.905802BR5908VIBRANE.6006Parati62250521mpqrinter12437468162263047BEE"qrCodeBase64: "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"[[Prototype]]: Object
index-0B6MqveJ.js:302 [PaymentBrick] Status do pagamento: {paymentStatus: 'pending', mercadoPagoId: '124374681622', externalId: 124374681622, paymentId: 'payment_1756673925188_ocxvgq9se', isPixPayment: true, …}externalId: 124374681622hasPixData: trueisPixPayment: truemercadoPagoId: "124374681622"paymentId: "payment_1756673925188_ocxvgq9se"paymentStatus: "pending"[[Prototype]]: Object
index-0B6MqveJ.js:302 [PaymentBrick] PIX detectado - Mostrando Status Screen
index-0B6MqveJ.js:302 [PaymentBrick] ID do MercadoPago para Status Screen: 124374681622
index-0B6MqveJ.js:302 [PaymentBrick] Tipo do ID: string
index-0B6MqveJ.js:302 [PaymentBrick] DEBUG - payment.externalId original: 124374681622
index-0B6MqveJ.js:302 [PaymentBrick] DEBUG - mercadopago.paymentId: payment_1756673925188_ocxvgq9se
index-0B6MqveJ.js:302 [PaymentBrick] StatusScreen deve ser renderizado agora
index-0B6MqveJ.js:302 [StatusScreenBrick] Componente montado com paymentId: 124374681622
index-0B6MqveJ.js:302 [StatusScreenBrick] DEBUG - Tipo do paymentId: string Valor: 124374681622
index-0B6MqveJ.js:302 [StatusScreenBrick] DEBUG - ID deve ser o externalId do MercadoPago (número), não nosso ID interno
index-0B6MqveJ.js:302 [StatusScreenBrick] Inicializando Status Screen para paymentId: 124374681622
index-0B6MqveJ.js:302 Status Screen Brick está pronto
index-0B6MqveJ.js:302 [StatusScreenBrick] Iniciando polling para paymentId: 124374681622
index-0B6MqveJ.js:302 [StatusScreenBrick] Componente montado com paymentId: 124374681622
index-0B6MqveJ.js:302 [StatusScreenBrick] DEBUG - Tipo do paymentId: string Valor: 124374681622
index-0B6MqveJ.js:302 [StatusScreenBrick] DEBUG - ID deve ser o externalId do MercadoPago (número), não nosso ID interno
index-0B6MqveJ.js:302 [StatusScreenBrick] Fazendo polling: /api/payment-status?mercadoPagoId=124374681622
index-0B6MqveJ.js:302 [StatusScreenBrick] Status recebido: pending
index-0B6MqveJ.js:302 [StatusScreenBrick] Fazendo polling: /api/payment-status?mercadoPagoId=124374681622
index-0B6MqveJ.js:302 [StatusScreenBrick] Status recebido: pending
index-0B6MqveJ.js:302 [StatusScreenBrick] Fazendo polling: /api/payment-status?mercadoPagoId=124374681622
