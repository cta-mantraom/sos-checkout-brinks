import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeServices, validateEnvironment } from './_utils/serviceFactory.js';
import { createCorsResponse, handleCorsPreFlight, validateCorsOrigin } from './_utils/cors.js';
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMIT_CONFIGS } from './_utils/rateLimit.js';
import { logger } from '../lib/shared/utils/logger.js';
import { z } from 'zod';

// Schema para validação da query - aceita id OU mercadoPagoId
const QuerySchema = z.object({
  id: z.string().min(1).optional(),
  mercadoPagoId: z.string().min(1).optional()
}).refine(
  (data) => data.id || data.mercadoPagoId,
  { message: 'É necessário fornecer id ou mercadoPagoId' }
);

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

    const { id: paymentId, mercadoPagoId } = validatedQuery;

    logger.info('Payment status request', {
      identifier,
      paymentId,
      mercadoPagoId
    });

    // Inicializar serviços
    const services = initializeServices();
    
    let payment = null;
    let externalId = mercadoPagoId;
    
    // Se foi fornecido mercadoPagoId, buscar direto no MercadoPago (sem tocar no banco)
    if (mercadoPagoId) {
      // NÃO buscar no banco, consultar direto no MercadoPago
      externalId = mercadoPagoId;
    } else if (paymentId) {
      // Se foi fornecido id interno, buscar no banco
      payment = await services.paymentService.getPaymentById(paymentId);
      
      if (!payment) {
        logger.warn('Payment not found for status', { paymentId });
        
        return createCorsResponse({
          success: false,
          error: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND'
        }, 404, req, res);
      }
      
      externalId = payment.getMercadoPagoId();
    }

    // Buscar dados do MercadoPago
    let pixData = null;
    let mpPayment = null;
    
    if (externalId) {
      try {
        // Buscar detalhes do pagamento no MercadoPago
        mpPayment = await services.mercadoPagoClient.getPaymentById(externalId);
        
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
        
        // Se foi fornecido apenas mercadoPagoId e falhou, retornar erro
        if (mercadoPagoId && !payment) {
          return createCorsResponse({
            success: false,
            error: 'Payment not found in MercadoPago',
            code: 'PAYMENT_NOT_FOUND'
          }, 404, req, res);
        }
      }
    }

    // Montar resposta - usar dados do banco se disponível, senão usar dados do MercadoPago
    const response = payment ? {
      // Resposta quando temos o payment do banco
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
    } : {
      // Resposta quando só temos dados do MercadoPago (sem banco)
      id: mercadoPagoId || '',
      status: mpPayment?.status || 'unknown',
      externalId: mercadoPagoId || '',
      amount: mpPayment?.transaction_amount || 0,
      installments: 1,
      paymentMethod: mpPayment?.payment_method_id || '',
      qrCodeData: pixData?.qrCode || '',
      qrCodeBase64: pixData?.qrCodeBase64 || '',
      paymentUrl: pixData?.ticketUrl || '',
      boletoUrl: '',
      createdAt: new Date().toISOString(),
      expiresAt: undefined
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