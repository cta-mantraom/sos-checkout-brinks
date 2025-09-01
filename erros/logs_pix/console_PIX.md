### logs no console do navegador apos pagamemnto com pix

Dados brutos do MercadoPago Brick: {
"paymentType": "bank_transfer",
"selectedPaymentMethod": "bank_transfer",
"formData": {
"payment_method_id": "pix",
"transaction_amount": 19.9,
"payer": {
"email": "appparaty@gmail.com"
}
}
}
index-0B6MqveJ.js:302 Método de pagamento identificado: {paymentMethodId: 'pix', paymentMethod: 'pix', hasToken: false, isPix: true}hasToken: falseisPix: truepaymentMethod: "pix"paymentMethodId: "pix"[[Prototype]]: Object
index-0B6MqveJ.js:302 Dados transformados para envio: {amount: 19.9, paymentMethodId: 'pix', paymentMethod: 'pix', token: undefined, installments: 1, …}amount: 19.9installments: 1payer: email: "appparaty@gmail.com"identification: undefined[[Prototype]]: ObjectpaymentMethod: "pix"paymentMethodId: "pix"profileData: bloodType: "O+"cpf: "39746571850"email: "appparaty@gmail.com"emergencyContact: name: "William freitas rondon"phone: "24992684832"relationship: "Williams Team"[[Prototype]]: ObjectfullName: "William freitas rondon"medicalInfo: additionalNotes: ""allergies: []medicalConditions: []medications: [][Prototype]]: Objectphone: "24992684832"subscriptionPlan: "basic"[[Prototype]]: Objecttoken: undefined[[Prototype]]: Object
index-0B6MqveJ.js:302 Resposta do backend: {success: true, data: {…}}data: mercadopago: {success: true, paymentId: 'payment_1756672485857_wr1gfgngz', externalId: 123831325141, status: 'pending', pixData: {…}}payment: {id: 'payment_1756672485857_wr1gfgngz', status: 'pending', amount: 19.9, paymentMethod: 'pix', externalId: 123831325141, …}profile: {id: 'profile_1756672485856_fqbutet30', fullName: 'William freitas rondon', paymentStatus: 'pending', subscriptionPlan: 'basic'}qrCode: {generated: false}[[Prototype]]: Objectsuccess: true[[Prototype]]: Object
index-0B6MqveJ.js:302 [PaymentBrick] DEBUG - payment.externalId: 123831325141
index-0B6MqveJ.js:302 [PaymentBrick] DEBUG - payment.id: payment_1756672485857_wr1gfgngz
index-0B6MqveJ.js:302 [PaymentBrick] DEBUG - mercadopago.paymentId: payment_1756672485857_wr1gfgngz
index-0B6MqveJ.js:302 PIX QR Code recebido: {qrCode: '00020126360014br.gov.bcb.pix0114+55249926848325204…E.6006Parati62250521mpqrinter1238313251416304133F', qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUgAABRQAAAUUAQAAAACGnaNFAAAOOE…E45lgPBOMZ4LxTL6F8T+2h71L2i/JegAAAABJRU5ErkJggg=='}qrCode: "00020126360014br.gov.bcb.pix0114+5524992684832520400005303986540519.905802BR5908VIBRANE.6006Parati62250521mpqrinter1238313251416304133F"qrCodeBase64: "AQUI ESTA O CODIGO DO QR CODE APAGUEI POIS É MUITO GRADE"[[Prototype]]: Object
index-0B6MqveJ.js:302 [PaymentBrick] Status do pagamento: {paymentStatus: 'pending', mercadoPagoId: '123831325141', externalId: 123831325141, paymentId: 'payment_1756672485857_wr1gfgngz', isPixPayment: true, …}externalId: 123831325141hasPixData: trueisPixPayment: truemercadoPagoId: "123831325141"paymentId: "payment_1756672485857_wr1gfgngz"paymentStatus: "pending"[[Prototype]]: Object
index-0B6MqveJ.js:302 [PaymentBrick] PIX detectado - Mostrando Status Screen
index-0B6MqveJ.js:302 [PaymentBrick] ID do MercadoPago para Status Screen: 123831325141
index-0B6MqveJ.js:302 [PaymentBrick] Tipo do ID: string
index-0B6MqveJ.js:302 [PaymentBrick] DEBUG - payment.externalId original: 123831325141
index-0B6MqveJ.js:302 [PaymentBrick] DEBUG - mercadopago.paymentId: payment_1756672485857_wr1gfgngz
index-0B6MqveJ.js:302 [PaymentBrick] StatusScreen deve ser renderizado agora
index-0B6MqveJ.js:302 [StatusScreenBrick] Componente montado com paymentId: 123831325141
index-0B6MqveJ.js:302 [StatusScreenBrick] DEBUG - Tipo do paymentId: string Valor: 123831325141
index-0B6MqveJ.js:302 [StatusScreenBrick] DEBUG - ID deve ser o externalId do MercadoPago (número), não nosso ID interno
index-0B6MqveJ.js:302 [StatusScreenBrick] Inicializando Status Screen para paymentId: 123831325141
index-0B6MqveJ.js:302 Status Screen Brick está pronto
index-0B6MqveJ.js:302 [StatusScreenBrick] Iniciando polling para paymentId: 123831325141
index-0B6MqveJ.js:302 [StatusScreenBrick] Componente montado com paymentId: 123831325141
index-0B6MqveJ.js:302 [StatusScreenBrick] DEBUG - Tipo do paymentId: string Valor: 123831325141
index-0B6MqveJ.js:302 [StatusScreenBrick] DEBUG - ID deve ser o externalId do MercadoPago (número), não nosso ID interno
index-0B6MqveJ.js:302 [StatusScreenBrick] Fazendo polling: /api/payment-status?mercadoPagoId=123831325141
index-0B6MqveJ.js:302 [StatusScreenBrick] Status recebido: pending
index-0B6MqveJ.js:302 [StatusScreenBrick] Fazendo polling: /api/payment-status?mercadoPagoId=123831325141
index-0B6MqveJ.js:302 [StatusScreenBrick] Status recebido: pending
index-0B6MqveJ.js:302 [StatusScreenBrick] Fazendo polling: /api/payment-status?mercadoPagoId=123831325141
index-0B6MqveJ.js:302 [StatusScreenBrick] Status recebido: pending
index-0B6MqveJ.js:302 [StatusScreenBrick] Fazendo polling: /api/payment-status?mercadoPagoId=123831325141
index-0B6MqveJ.js:302 [StatusScreenBrick] Status recebido: pending
index-0B6MqveJ.js:302 [StatusScreenBrick] Fazendo polling: /api/payment-status?mercadoPagoId=123831325141
index-0B6MqveJ.js:302 [StatusScreenBrick] Status recebido: pending
index-0B6MqveJ.js:302 [StatusScreenBrick] Fazendo polling: /api/payment-status?mercadoPagoId=123831325141
index-0B6MqveJ.js:302 [StatusScreenBrick] Status recebido: pending
index-0B6MqveJ.js:302 [StatusScreenBrick] Fazendo polling: /api/payment-status?mercadoPagoId=123831325141
index-0B6MqveJ.js:302 [StatusScreenBrick] Status recebido: pending
index-0B6MqveJ.js:302 [StatusScreenBrick] Fazendo polling: /api/payment-status?mercadoPagoId=123831325141
index-0B6MqveJ.js:302 [StatusScreenBrick] Status recebido: pending
index-0B6MqveJ.js:302 [StatusScreenBrick] Fazendo polling: /api/payment-status?mercadoPagoId=123831325141
index-0B6MqveJ.js:302 [StatusScreenBrick] Status recebido: approved
index-0B6MqveJ.js:302 Pagamento PIX aprovado: {id: '123831325141', status: 'approved', externalId: '123831325141', amount: 19.9, installments: 1, …}amount: 19.9boletoUrl: ""createdAt: "2025-08-31T20:35:34.270Z"externalId: "123831325141"id: "123831325141"installments: 1paymentMethod: "pix"paymentUrl: "https://www.mercadopago.com.br/payments/123831325141/ticket?caller_id=2177054274&hash=babebd2f-ea5d-4272-a6e9-95d3a53f2788"qrCodeBase64: "AQUI ESTA O CODIGO DO QR CODE APAGUEI POIS É MUITO GRADE"qrCodeData: "00020126360014br.gov.bcb.pix0114+5524992684832520400005303986540519.905802BR5908VIBRANE.6006Parati62250521mpqrinter1238313251416304133F"status: "approved"[[Prototype]]: Object
index-0B6MqveJ.js:302 GET https://memoryys.com/api/payment-status?id=123831325141 404 (Not Found)
