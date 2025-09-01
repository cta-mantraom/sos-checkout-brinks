### logs da vercel apos pagamento pix

Aug 31 17:34:44.64
POST
200
memoryys.com
/api/process-payment
{"timestamp":"2025-08-31T20:34:45.740Z","level":"INFO","message":"Process payment request received","context":{"identifier":"177.129.177.188:","paymentMethod":"pix"}}

Aug 31 17:34:47.68
POST
200
memoryys.com
/api/mercadopago-webhook
2025-08-31T20:34:48.768Z [info] {"timestamp":"2025-08-31T20:34:48.765Z","level":"INFO","message":"Webhook received","context":{"domain":"webhook","source":"mercadopago","webhookId":124313566528,"type":"payment","action":"payment.created","paymentId":"123831325141","liveMode":true}}
2025-08-31T20:34:50.024Z [info] {"timestamp":"2025-08-31T20:34:50.023Z","level":"INFO","message":"Ignoring webhook for non-approved payment","context":{"externalId":"123831325141","status":"pending"}}

Aug 31 17:34:54.13
GET
200
memoryys.com
/api/payment-status
2025-08-31T20:34:55.171Z [info] {"timestamp":"2025-08-31T20:34:55.167Z","level":"INFO","message":"Payment status request","context":{"identifier":"177.129.177.188:","mercadoPagoId":"123831325141"}}
2025-08-31T20:34:55.425Z [info] {"timestamp":"2025-08-31T20:34:55.424Z","level":"INFO","message":"Performance: payment-status-success","context":{"domain":"performance","duration":"259ms"}}

Aug 31 17:35:29.58
POST
200
memoryys.com
/api/mercadopago-webhook
2025-08-31T20:35:29.683Z [info] {"timestamp":"2025-08-31T20:35:29.682Z","level":"INFO","message":"Webhook received","context":{"domain":"webhook","source":"mercadopago","webhookId":124313600726,"type":"payment","action":"payment.updated","paymentId":"123831325141","liveMode":true}}
2025-08-31T20:35:29.888Z [info] {"timestamp":"2025-08-31T20:35:29.887Z","level":"INFO","message":"Creating payment from webhook (approved)","context":{"externalId":"123831325141","status":"approved","amount":19.9}}
2025-08-31T20:35:31.215Z [warning] {"timestamp":"2025-08-31T20:35:31.214Z","level":"WARN","message":"Profile not found for approved payment","context":{"profileId":"profile_1756672485856_fqbutet30","paymentId":"payment_1756672529888_cexrbojca"}}
2025-08-31T20:35:31.215Z [info] {"timestamp":"2025-08-31T20:35:31.214Z","level":"INFO","message":"Performance: webhook-processed","context":{"domain":"performance","duration":"1532ms"}}
2025-08-31T20:35:31.215Z [info] {"timestamp":"2025-08-31T20:35:31.214Z","level":"INFO","message":"Webhook processed","context":{"domain":"webhook","source":"mercadopago","webhookId":124313600726,"paymentId":"payment_1756672529888_cexrbojca","oldStatus":"approved","newStatus":"approved","mercadoPagoStatus":"approved"}}

Aug 31 17:35:34.13
GET
200
memoryys.com
/api/payment-status
2025-08-31T20:35:34.220Z [info] {"timestamp":"2025-08-31T20:35:34.216Z","level":"INFO","message":"Payment status request","context":{"identifier":"177.129.177.188:","mercadoPagoId":"123831325141"}}
2025-08-31T20:35:34.271Z [info] {"timestamp":"2025-08-31T20:35:34.270Z","level":"INFO","message":"Performance: payment-status-success","context":{"domain":"performance","duration":"54ms"}}

Aug 31 17:35:34.37
GET
404
memoryys.com
/api/payment-status
2025-08-31T20:35:34.443Z [info] {"timestamp":"2025-08-31T20:35:34.442Z","level":"INFO","message":"Payment status request","context":{"identifier":"177.129.177.188:","paymentId":"123831325141"}}
2025-08-31T20:35:35.376Z [warning] {"timestamp":"2025-08-31T20:35:35.375Z","level":"WARN","message":"Payment not found for status","context":{"paymentId":"123831325141"}}
