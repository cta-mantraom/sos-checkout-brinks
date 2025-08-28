import { NextRequest } from 'next/server';
import { initializeServices, validateEnvironment } from './_utils/serviceFactory.js';
import { createCorsResponse, handleCorsPreFlight, validateCorsOrigin } from './_utils/cors.js';
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMIT_CONFIGS } from './_utils/rateLimit.js';
import { createQRCodeGenerator } from './_utils/qrGenerator.js';
import { logger } from '../lib/shared/utils/logger.js';
import { QRCodeService } from '../lib/domain/services/QRCodeService.js';
import { ValidationError, ProfileError } from '../lib/domain/errors.js';

export default async function handler(req: NextRequest) {
  const startTime = Date.now();
  const identifier = getRateLimitIdentifier(req);

  try {
    // Validar CORS
    if (!validateCorsOrigin(req)) {
      return createCorsResponse({
        success: false,
        error: 'Origin not allowed',
        code: 'CORS_ERROR'
      }, 403, req);
    }

    // Tratar OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      return handleCorsPreFlight(req);
    }

    // Validar método HTTP
    if (!['GET', 'POST'].includes(req.method || '')) {
      return createCorsResponse({
        success: false,
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      }, 405, req);
    }

    // Validar environment
    const missingEnvVars = validateEnvironment();
    if (missingEnvVars.length > 0) {
      logger.error('Missing environment variables', new Error(`Missing: ${missingEnvVars.join(', ')}`));
      return createCorsResponse({
        success: false,
        error: 'Server configuration error',
        code: 'CONFIG_ERROR'
      }, 500, req);
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMIT_CONFIGS.qrcode);
    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for QR code generation', {
        identifier,
        limit: rateLimitResult.limit,
        retryAfter: rateLimitResult.retryAfter
      });

      const response = createCorsResponse({
        success: false,
        error: 'Rate limit exceeded',
        message: rateLimitResult.message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: rateLimitResult.retryAfter
      }, 429, req);

      // Adicionar headers de rate limit
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());
      if (rateLimitResult.retryAfter) {
        response.headers.set('Retry-After', rateLimitResult.retryAfter.toString());
      }

      return response;
    }

    // Obter profileId da URL ou body
    let profileId: string;
    let regenerate = false;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      profileId = url.searchParams.get('profileId') || '';
      regenerate = url.searchParams.get('regenerate') === 'true';
    } else {
      // POST
      let body: any;
      try {
        body = await req.json();
      } catch (error) {
        logger.warn('Invalid JSON in request body', { error: error instanceof Error ? error.message : 'Unknown' });
        return createCorsResponse({
          success: false,
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON',
          code: 'INVALID_JSON'
        }, 400, req);
      }

      profileId = body.profileId || '';
      regenerate = body.regenerate === true;
    }

    // Validar profileId
    if (!profileId) {
      return createCorsResponse({
        success: false,
        error: 'Missing profile ID',
        message: 'profileId é obrigatório',
        code: 'MISSING_PROFILE_ID'
      }, 400, req);
    }

    if (!/^profile_\d+_[a-z0-9]+$/.test(profileId)) {
      return createCorsResponse({
        success: false,
        error: 'Invalid profile ID format',
        message: 'Formato de profileId inválido',
        code: 'INVALID_PROFILE_ID'
      }, 400, req);
    }

    logger.qrCodeLog(regenerate ? 'regenerate_requested' : 'generate_requested', profileId, { 
      identifier,
      method: req.method
    });

    // Inicializar serviços
    const services = initializeServices();
    
    // Criar instância do QRCodeService com gerador
    const qrCodeGenerator = createQRCodeGenerator();
    const qrCodeService = new QRCodeService(
      services.profileRepository,
      qrCodeGenerator
    );

    try {
      let qrCodeUrl: string;
      let action: string;

      if (regenerate) {
        // Regenerar QR Code
        qrCodeUrl = await qrCodeService.regenerateQRCode(profileId);
        action = 'regenerated';
      } else {
        // Verificar se já existe QR Code
        const profile = await services.profileService.getProfileById(profileId);
        if (!profile) {
          throw ProfileError.notFound(profileId);
        }

        const existingQR = profile.getQRCodeUrl();
        if (existingQR && profile.hasValidSubscription()) {
          qrCodeUrl = existingQR;
          action = 'existing';
        } else {
          // Gerar novo QR Code
          qrCodeUrl = await qrCodeService.generateQRCode(profileId);
          action = 'generated';
        }
      }

      // Obter dados do QR Code para retornar informações adicionais
      const qrData = await qrCodeService.getQRCodeData(profileId);

      const duration = Date.now() - startTime;
      logger.performance('qr-code-success', duration);
      logger.qrCodeLog(action, profileId, {
        identifier,
        subscriptionPlan: qrData.subscriptionPlan
      });

      // Criar resposta de sucesso
      const response = createCorsResponse({
        success: true,
        message: `QR Code ${action === 'existing' ? 'recuperado' : action === 'regenerated' ? 'regenerado' : 'gerado'} com sucesso`,
        data: {
          qrCodeUrl,
          action,
          profile: {
            id: qrData.profileId,
            fullName: qrData.fullName,
            bloodType: qrData.bloodType,
            subscriptionPlan: qrData.subscriptionPlan
          },
          emergencyContact: qrData.emergencyContact,
          medicalInfo: qrData.medicalInfo,
          generatedAt: qrData.generatedAt
        }
      }, 200, req);

      // Adicionar headers de rate limit
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());

      return response;

    } catch (serviceError) {
      if (serviceError instanceof ProfileError) {
        let statusCode = 404;
        let message = serviceError.message;

        // Casos específicos de ProfileError
        if (serviceError.message.includes('pagamento pendente')) {
          statusCode = 402;
          message = 'Pagamento pendente. Complete o pagamento para gerar o QR Code.';
        } else if (serviceError.message.includes('assinatura expirada')) {
          statusCode = 402;
          message = 'Assinatura expirada. Renove sua assinatura para gerar o QR Code.';
        }

        return createCorsResponse({
          success: false,
          error: 'Profile error',
          message,
          code: serviceError.code,
          context: serviceError.context
        }, statusCode, req);
      }

      throw serviceError; // Re-lançar para tratamento genérico
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.performance('qr-code-error', duration);
    logger.error('QR Code generation failed', error as Error, { identifier });

    // Tratamento específico de erros
    if (error instanceof ValidationError) {
      return createCorsResponse({
        success: false,
        error: 'Validation error',
        message: error.message,
        code: error.code,
        context: error.context
      }, 400, req);
    }

    if (error instanceof ProfileError) {
      return createCorsResponse({
        success: false,
        error: 'Profile error',
        message: error.message,
        code: error.code,
        context: error.context
      }, 404, req);
    }

    // Erro genérico
    return createCorsResponse({
      success: false,
      error: 'Internal server error',
      message: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR',
      details: 'Ocorreu um erro inesperado ao gerar o QR Code.'
    }, 500, req);
  }
}