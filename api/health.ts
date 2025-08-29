import type { VercelRequest, VercelResponse } from '@vercel/node';
import { healthCheck, validateEnvironment } from './_utils/serviceFactory.js';
import { createCorsResponse, handleCorsPreFlight, validateCorsOrigin } from './_utils/cors.js';
import { logger } from '../lib/shared/utils/logger.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();

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

    // Obter parâmetros da URL
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const detailed = url.searchParams.get('detailed') === 'true';

    // Validação básica de environment
    const missingEnvVars = validateEnvironment();

    // Health check básico
    const basicHealth = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };

    // Se não for detalhado, retornar apenas básico
    if (!detailed) {
      const duration = Date.now() - startTime;
      logger.info('Health check - basic', { duration });

      return createCorsResponse({
        success: true,
        data: basicHealth
      }, 200, req, res);
    }

    // Health check detalhado
    logger.info('Health check detailed requested');

    let servicesHealth;
    try {
      servicesHealth = await healthCheck();
    } catch (error) {
      logger.error('Health check failed', error as Error);
      servicesHealth = {
        healthy: false,
        services: {
          firebase: false,
          mercadopago: false
        },
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }

    const detailedHealth = {
      ...basicHealth,
      services: servicesHealth.services,
      healthy: servicesHealth.healthy,
      environment: {
        hasRequiredVars: missingEnvVars.length === 0,
        missingVars: missingEnvVars,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      errors: [] as string[]
    };

    // Incluir erros se houver
    if (servicesHealth.errors.length > 0) {
      detailedHealth.errors = servicesHealth.errors;
    }

    const duration = Date.now() - startTime;
    logger.info('Health check completed', {
      duration,
      healthy: servicesHealth.healthy,
      services: servicesHealth.services
    });

    const statusCode = servicesHealth.healthy ? 200 : 503;

    return createCorsResponse({
      success: servicesHealth.healthy,
      data: detailedHealth
    }, statusCode, req, res);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Health check handler failed', error as Error);

    return createCorsResponse({
      success: false,
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'HEALTH_CHECK_ERROR',
      data: {
        status: 'error',
        timestamp: new Date().toISOString(),
        duration
      }
    }, 500, req, res);
  }
}