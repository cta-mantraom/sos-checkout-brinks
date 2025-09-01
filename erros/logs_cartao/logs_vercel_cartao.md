### logs da vercel apos pagamento cartão

Aug 31 17:58:43.87
POST
200
memoryys.com
/api/process-payment
2025-08-31T20:58:45.077Z [info] {"timestamp":"2025-08-31T20:58:45.074Z","level":"INFO","message":"Process payment request received","context":{"identifier":"177.129.177.143:","paymentMethod":"pix"}}
2025-08-31T20:58:46.117Z [info] Criando pagamento no MercadoPago: {
amount: 19.9,
method: 'pix',
email: 'appparaty@gmail.com',
cpf: '39746571850',
profileId: 'profile_1756673925187_gwda5vwkr'
}
2025-08-31T20:58:46.910Z [info] Resposta PIX do MercadoPago: {
id: 124374681622,
status: 'pending',
status_detail: 'pending_waiting_transfer',
hasPointOfInteraction: true,
hasTransactionData: true,
hasQrCode: true,
hasQrCodeBase64: true
}
2025-08-31T20:58:46.910Z [info] PIX Transaction Data: {
qrCodeLength: 135,
qrCodeBase64Length: 4628,
ticketUrl: 'https://www.mercadopago.com.br/payments/124374681622/ticket?caller_id=2177054274&hash=f99f1b60-aafc-48ad-be46-84c2e623670a'
}
2025-08-31T20:58:46.910Z [info] {"timestamp":"2025-08-31T20:58:46.909Z","level":"INFO","message":"Performance: process-payment-success","context":{"domain":"performance","duration":"1838ms"}}
2025-08-31T20:58:46.910Z [info] {"timestamp":"2025-08-31T20:58:46.909Z","level":"INFO","message":"Payment processed","context":{"domain":"payment","paymentId":"payment_1756673925188_ocxvgq9se","profileId":"profile_1756673925187_gwda5vwkr","amount":19.9,"status":"pending","paymentMethod":"pix","qrCodeGenerated":false}}

Aug 31 17:58:46.94
POST
200
memoryys.com
/api/mercadopago-webhook 2025-08-31T20:58:47.901Z [info] {"timestamp":"2025-08-31T20:58:47.898Z","level":"INFO","message":"Webhook received","context":{"domain":"webhook","source":"mercadopago","webhookId":124228612017,"type":"payment","action":"payment.created","paymentId":"124374681622","liveMode":true}}
2025-08-31T20:58:49.131Z [info] {"timestamp":"2025-08-31T20:58:49.130Z","level":"INFO","message":"Ignoring webhook for non-approved payment","context":{"externalId":"124374681622","status":"pending"}}

Aug 31 17:58:53.48
GET
200
memoryys.com
/api/payment-status 2025-08-31T20:58:54.470Z [info] {"timestamp":"2025-08-31T20:58:54.467Z","level":"INFO","message":"Payment status request","context":{"identifier":"177.129.177.143:","mercadoPagoId":"124374681622"}}
2025-08-31T20:58:54.763Z [info] {"timestamp":"2025-08-31T20:58:54.762Z","level":"INFO","message":"Performance: payment-status-success","context":{"domain":"performance","duration":"297ms"}}
