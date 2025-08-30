import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeServices, validateEnvironment } from './_utils/serviceFactory.js';
import { createCorsResponse, handleCorsPreFlight, validateCorsOrigin } from './_utils/cors.js';
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMIT_CONFIGS } from './_utils/rateLimit.js';
import { logger } from '../lib/shared/utils/logger.js';
import { z } from 'zod';

// Schema para validação da query
const QuerySchema = z.object({
  id: z.string().min(1, 'Payment ID é obrigatório')
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  const identifier = getRateLimitIdentifier(req);

  try {
    // Validar CORS
    if (!validateCorsOrigin(req)) {
      return createCorsResponse({
        success: false,
        error: 'Origin not allowed',
        code: 'CORS_ERROR'
      }, 403, req, res);
    }

    // Tratar OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      return handleCorsPreFlight(req, res);
    }

    // Validar método HTTP
    if (req.method !== 'GET') {
      return createCorsResponse({
        success: false,
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      }, 405, req, res);
    }

    // Validar environment
    const missingEnvVars = validateEnvironment();
    if (missingEnvVars.length > 0) {
      logger.error('Missing environment variables', new Error(`Missing: ${missingEnvVars.join(', ')}`));
      return createCorsResponse({
        success: false,
        error: 'Server configuration error',
        code: 'CONFIG_ERROR'
      }, 500, req, res);
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMIT_CONFIGS.default);
    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for payment status', {
        identifier,
        limit: rateLimitResult.limit
      });

      return createCorsResponse({
        success: false,
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED'
      }, 429, req, res);
    }

    // Validar query parameters
    let validatedQuery;
    try {
      validatedQuery = QuerySchema.parse(req.query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createCorsResponse({
          success: false,
          error: 'Invalid parameters',
          message: error.errors[0].message,
          code: 'VALIDATION_ERROR'
        }, 400, req, res);
      }
      throw error;
    }

    const { id: paymentId } = validatedQuery;

    logger.info('Payment status request', {
      identifier,
      paymentId
    });

    // Inicializar serviços
    const services = initializeServices();
    
    // Buscar pagamento no banco
    const payment = await services.paymentService.getPaymentById(paymentId);
    
    if (!payment) {
      logger.warn('Payment not found for status', { paymentId });
      
      return createCorsResponse({
        success: false,
        error: 'Payment not found',
        code: 'PAYMENT_NOT_FOUND'
      }, 404, req, res);
    }

    // Buscar dados do MercadoPago se tiver external ID
    let pixData = null;
    const externalId = payment.getMercadoPagoId();
    
    if (externalId && payment.getPaymentMethod() === 'pix') {
      try {
        // Buscar detalhes do pagamento no MercadoPago
        const mpPayment = await services.mercadoPagoClient.getPaymentById(externalId);
        
        if (mpPayment?.point_of_interaction?.transaction_data) {
          pixData = {
            qrCode: mpPayment.point_of_interaction.transaction_data.qr_code || '',
            qrCodeBase64: mpPayment.point_of_interaction.transaction_data.qr_code_base64 || '',
            ticketUrl: mpPayment.point_of_interaction.transaction_data.ticket_url || ''
          };
        }
      } catch (error) {
        logger.error('Error fetching MercadoPago payment details', error as Error, {
          paymentId,
          externalId
        });
        // Não falhar se não conseguir buscar dados do MP
      }
    }

    // Montar resposta
    const response = {
      id: payment.getId(),
      status: payment.getStatus().getValue(),
      externalId: payment.getMercadoPagoId() || '',
      amount: payment.getAmount(),
      installments: payment.getInstallments(),
      paymentMethod: payment.getPaymentMethod(),
      qrCodeData: pixData?.qrCode || payment.getPixQrCode() || '',
      qrCodeBase64: pixData?.qrCodeBase64 || payment.getPixQrCodeBase64() || '',
      paymentUrl: pixData?.ticketUrl || '',
      boletoUrl: payment.getBoletoUrl() || '',
      createdAt: payment.getCreatedAt().toISOString(),
      expiresAt: payment.getExpiresAt()?.toISOString()
    };

    const duration = Date.now() - startTime;
    logger.performance('payment-status-success', duration);

    return createCorsResponse(response, 200, req, res);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.performance('payment-status-error', duration);
    logger.error('Payment status failed', error as Error, { identifier });

    return createCorsResponse({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR'
    }, 500, req, res);
  }
}