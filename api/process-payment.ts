import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeServices, validateEnvironment } from './_utils/serviceFactory.js';
import { createCorsResponse, handleCorsPreFlight, validateCorsOrigin } from './_utils/cors.js';
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMIT_CONFIGS } from './_utils/rateLimit.js';
import { logger } from '../lib/shared/utils/logger.js';
import { ValidationError, PaymentError, ProfileError } from '../lib/domain/errors.js';

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
    if (req.method !== 'POST') {
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
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMIT_CONFIGS.payment);
    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for payment', {
        identifier,
        limit: rateLimitResult.limit,
        retryAfter: rateLimitResult.retryAfter
      });

      createCorsResponse({
        success: false,
        error: 'Rate limit exceeded',
        message: rateLimitResult.message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: rateLimitResult.retryAfter
      }, 429, req, res);

      // Adicionar headers de rate limit
      res.setHeader('X-RateLimit-Limit', rateLimitResult.limit.toString());
      res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      res.setHeader('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());
      if (rateLimitResult.retryAfter) {
        res.setHeader('Retry-After', rateLimitResult.retryAfter.toString());
      }

      return;
    }

    // Parsear body da requisição
    let body: unknown;
    try {
      body = req.body;
    } catch (error) {
      logger.warn('Invalid JSON in request body', { error: error instanceof Error ? error.message : 'Unknown' });
      return createCorsResponse({
        success: false,
        error: 'Invalid JSON',
        message: 'Request body must be valid JSON',
        code: 'INVALID_JSON'
      }, 400, req, res);
    }

    // Type guard para body
    function isValidPaymentBody(data: unknown): data is { paymentMethod?: string; profileId?: string } {
      return typeof data === 'object' && data !== null;
    }

    const paymentData = isValidPaymentBody(body) ? body : {};
    
    logger.info('Process payment request received', {
      identifier,
      paymentMethod: paymentData.paymentMethod,
      profileId: paymentData.profileId
    });

    // Inicializar serviços
    const services = initializeServices();

    // Executar caso de uso
    const result = await services.processPaymentUseCase.execute(body);

    const duration = Date.now() - startTime;
    logger.performance('process-payment-success', duration);
    logger.paymentLog('processed', result.payment.getId(), {
      profileId: result.profile.getId(),
      amount: result.payment.getAmount(),
      status: result.payment.getStatus().getValue(),
      paymentMethod: result.payment.getPaymentMethod(),
      qrCodeGenerated: result.qrCodeGenerated
    });

    // Adicionar headers de rate limit ANTES de enviar resposta
    res.setHeader('X-RateLimit-Limit', rateLimitResult.limit.toString());
    res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());
    
    // Criar resposta de sucesso
    createCorsResponse({
      success: true,
      message: result.paymentResult.message,
      data: {
        payment: {
          id: result.payment.getId(),
          status: result.payment.getStatus().getValue(),
          amount: result.payment.getAmount(),
          paymentMethod: result.payment.getPaymentMethod(),
          externalId: result.payment.getExternalId(),
          createdAt: result.payment.getCreatedAt()
        },
        profile: {
          id: result.profile.getId(),
          fullName: result.profile.getFullName(),
          paymentStatus: result.profile.getPaymentStatus().getValue(),
          subscriptionPlan: result.profile.getSubscriptionPlan()
        },
        qrCode: {
          generated: result.qrCodeGenerated,
          url: result.qrCodeUrl
        },
        mercadopago: {
          success: result.paymentResult.success,
          message: result.paymentResult.message,
          paymentId: result.paymentResult.paymentId,
          status: result.paymentResult.status,
          // Incluir dados do PIX se disponíveis
          pixData: result.paymentResult.pixQrCode ? {
            qrCode: result.paymentResult.pixQrCode,
            qrCodeBase64: result.paymentResult.pixQrCodeBase64
          } : undefined
        }
      }
    }, result.paymentResult.success ? 200 : 402, req, res);

    return;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.performance('process-payment-error', duration);
    logger.error('Process payment failed', error as Error, { identifier });

    // Tratamento específico de erros
    if (error instanceof ValidationError) {
      return createCorsResponse({
        success: false,
        error: 'Validation error',
        message: error.message,
        code: error.code,
        context: error.context,
        details: 'Verifique os dados enviados e tente novamente'
      }, 400, req, res);
    }

    if (error instanceof PaymentError) {
      let statusCode = 422;
      
      // Determinar código de status baseado no tipo de erro de pagamento
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('já processado')) {
        statusCode = 409;
      } else if (error.message.includes('recusado') || error.message.includes('rejeitado')) {
        statusCode = 402;
      }

      return createCorsResponse({
        success: false,
        error: 'Payment error',
        message: error.message,
        code: error.code,
        context: error.context,
        details: 'Erro no processamento do pagamento'
      }, statusCode, req, res);
    }

    if (error instanceof ProfileError) {
      return createCorsResponse({
        success: false,
        error: 'Profile error',
        message: error.message,
        code: error.code,
        context: error.context,
        details: 'Erro relacionado ao perfil médico'
      }, 404, req, res);
    }

    // Erro genérico
    return createCorsResponse({
      success: false,
      error: 'Internal server error',
      message: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR',
      details: 'Ocorreu um erro inesperado. Tente novamente em alguns instantes.'
    }, 500, req, res);
  }
}