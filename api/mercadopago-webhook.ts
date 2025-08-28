import { NextRequest } from 'next/server';
import { initializeServices, validateEnvironment } from './_utils/serviceFactory.js';
import { createCorsResponse, handleCorsPreFlight, validateCorsOrigin } from './_utils/cors.js';
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMIT_CONFIGS } from './_utils/rateLimit.js';
import { logger } from '../lib/shared/utils/logger.js';
import { PaymentDTO, WebhookData } from '../lib/application/dto/PaymentDTO.js';
import { PaymentStatus } from '../lib/domain/value-objects/PaymentStatus.js';
import { ValidationError, PaymentError } from '../lib/domain/errors.js';

export default async function handler(req: NextRequest) {
  const startTime = Date.now();
  const identifier = getRateLimitIdentifier(req);

  try {
    // Validar CORS (permitir apenas MercadoPago)
    const corsOptions = {
      allowedOrigins: [
        'https://api.mercadopago.com',
        'https://www.mercadopago.com.br',
        'https://*.mercadopago.com'
      ],
      allowedMethods: ['POST', 'OPTIONS'],
      allowCredentials: false
    };

    if (!validateCorsOrigin(req, corsOptions)) {
      logger.warn('Webhook from unauthorized origin', {
        origin: req.headers.get('origin'),
        userAgent: req.headers.get('user-agent')
      });
      
      return createCorsResponse({
        success: false,
        error: 'Origin not allowed',
        code: 'CORS_ERROR'
      }, 403, req, corsOptions);
    }

    // Tratar OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      return handleCorsPreFlight(req, corsOptions);
    }

    // Validar método HTTP
    if (req.method !== 'POST') {
      return createCorsResponse({
        success: false,
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      }, 405, req, corsOptions);
    }

    // Validar environment
    const missingEnvVars = validateEnvironment();
    if (missingEnvVars.length > 0) {
      logger.error('Missing environment variables for webhook', new Error(`Missing: ${missingEnvVars.join(', ')}`));
      return createCorsResponse({
        success: false,
        error: 'Server configuration error',
        code: 'CONFIG_ERROR'
      }, 500, req, corsOptions);
    }

    // Rate limiting específico para webhooks
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMIT_CONFIGS.webhook);
    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for webhook', {
        identifier,
        limit: rateLimitResult.limit
      });

      return createCorsResponse({
        success: false,
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED'
      }, 429, req, corsOptions);
    }

    // Parsear body da requisição
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      logger.warn('Invalid JSON in webhook body', { error: error instanceof Error ? error.message : 'Unknown' });
      return createCorsResponse({
        success: false,
        error: 'Invalid JSON',
        code: 'INVALID_JSON'
      }, 400, req, corsOptions);
    }

    // Validar estrutura do webhook
    let webhookData: WebhookData;
    try {
      webhookData = PaymentDTO.validateWebhook(body);
    } catch (error) {
      logger.warn('Invalid webhook data structure', { 
        body,
        error: error instanceof Error ? error.message : 'Unknown'
      });
      
      return createCorsResponse({
        success: false,
        error: 'Invalid webhook format',
        message: error instanceof Error ? error.message : 'Invalid webhook structure',
        code: 'INVALID_WEBHOOK'
      }, 400, req, corsOptions);
    }

    logger.webhookLog('received', 'mercadopago', {
      webhookId: webhookData.id,
      type: webhookData.type,
      action: webhookData.action,
      paymentId: webhookData.data.id,
      liveMode: webhookData.live_mode
    });

    // Processar apenas webhooks de pagamento
    if (webhookData.type !== 'payment') {
      logger.info('Webhook ignored - not a payment', {
        type: webhookData.type,
        action: webhookData.action
      });
      
      return createCorsResponse({
        success: true,
        message: 'Webhook received but ignored - not a payment type',
        code: 'IGNORED'
      }, 200, req, corsOptions);
    }

    // Inicializar serviços
    const services = initializeServices();

    try {
      // Buscar detalhes do pagamento no MercadoPago
      const paymentDetails = await services.mercadoPagoClient.getPayment(webhookData.data.id);
      
      if (!paymentDetails) {
        logger.warn('Payment not found in MercadoPago', { paymentId: webhookData.data.id });
        return createCorsResponse({
          success: false,
          error: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND'
        }, 404, req, corsOptions);
      }

      // Buscar pagamento no banco de dados usando external_id
      const payment = await services.paymentService.getPaymentByExternalId(webhookData.data.id);
      
      if (!payment) {
        logger.warn('Payment not found in database', { 
          externalId: webhookData.data.id,
          mercadoPagoStatus: paymentDetails.status
        });
        
        return createCorsResponse({
          success: false,
          error: 'Payment not found in database',
          code: 'PAYMENT_NOT_IN_DB'
        }, 404, req, corsOptions);
      }

      // Mapear status do MercadoPago para nosso PaymentStatus
      let newStatus: PaymentStatus;
      
      switch (paymentDetails.status) {
        case 'approved':
          newStatus = PaymentStatus.APPROVED;
          break;
        case 'pending':
        case 'in_process':
          newStatus = PaymentStatus.PENDING;
          break;
        case 'rejected':
        case 'cancelled':
          newStatus = PaymentStatus.FAILED;
          break;
        case 'refunded':
        case 'charged_back':
          newStatus = PaymentStatus.REFUNDED;
          break;
        default:
          logger.warn('Unknown MercadoPago status', { 
            status: paymentDetails.status,
            paymentId: payment.getId()
          });
          newStatus = PaymentStatus.PENDING;
      }

      // Verificar se o status realmente mudou
      if (payment.getStatus().getValue() === newStatus.getValue()) {
        logger.info('Payment status unchanged', {
          paymentId: payment.getId(),
          currentStatus: payment.getStatus().getValue(),
          mercadoPagoStatus: paymentDetails.status
        });
        
        return createCorsResponse({
          success: true,
          message: 'Status unchanged',
          code: 'NO_CHANGE'
        }, 200, req, corsOptions);
      }

      // Atualizar status do pagamento
      payment.updateStatus(newStatus);
      await services.paymentRepository.update(payment);

      // Se aprovado, atualizar o perfil médico também
      if (newStatus.isSuccessful()) {
        const profile = await services.profileService.getProfileById(payment.getProfileId());
        
        if (profile) {
          profile.updatePaymentStatus(PaymentStatus.APPROVED);
          await services.profileRepository.update(profile);
          
          // Tentar gerar QR Code se ainda não foi gerado
          try {
            await services.qrCodeService.generateQRCode(profile.getId());
            logger.qrCodeLog('generated', profile.getId(), { 
              reason: 'webhook_payment_approved' 
            });
          } catch (qrError) {
            logger.error('Failed to generate QR Code on webhook', qrError as Error, {
              profileId: profile.getId(),
              paymentId: payment.getId()
            });
          }
        }
      }

      const duration = Date.now() - startTime;
      logger.performance('webhook-processed', duration);
      logger.webhookLog('processed', 'mercadopago', {
        webhookId: webhookData.id,
        paymentId: payment.getId(),
        oldStatus: payment.getStatus().getValue(),
        newStatus: newStatus.getValue(),
        mercadoPagoStatus: paymentDetails.status
      });

      // Retornar sucesso
      return createCorsResponse({
        success: true,
        message: 'Webhook processed successfully',
        data: {
          paymentId: payment.getId(),
          oldStatus: payment.getStatus().getValue(),
          newStatus: newStatus.getValue(),
          mercadoPagoData: {
            id: paymentDetails.id,
            status: paymentDetails.status,
            status_detail: paymentDetails.status_detail
          }
        }
      }, 200, req, corsOptions);

    } catch (serviceError) {
      logger.error('Error processing webhook', serviceError as Error, {
        webhookId: webhookData.id,
        paymentId: webhookData.data.id
      });

      return createCorsResponse({
        success: false,
        error: 'Error processing webhook',
        message: serviceError instanceof Error ? serviceError.message : 'Unknown service error',
        code: 'PROCESSING_ERROR'
      }, 500, req, corsOptions);
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.performance('webhook-error', duration);
    logger.error('Webhook handler failed', error as Error, { identifier });

    // Tratamento específico de erros
    if (error instanceof ValidationError) {
      return createCorsResponse({
        success: false,
        error: 'Validation error',
        message: error.message,
        code: error.code
      }, 400, req);
    }

    if (error instanceof PaymentError) {
      return createCorsResponse({
        success: false,
        error: 'Payment error',
        message: error.message,
        code: error.code
      }, 422, req);
    }

    // Erro genérico
    return createCorsResponse({
      success: false,
      error: 'Internal server error',
      message: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    }, 500, req);
  }
}