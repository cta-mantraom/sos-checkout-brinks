import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeServices, validateEnvironment } from './_utils/serviceFactory.js';
import { createCorsResponse, handleCorsPreFlight, validateCorsOrigin } from './_utils/cors.js';
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMIT_CONFIGS } from './_utils/rateLimit.js';
import { logger } from '../lib/shared/utils/logger.js';
import { ValidationError, ProfileError } from '../lib/domain/errors.js';

interface ProfileResponseData {
  id: string;
  fullName: string;
  cpf?: string;
  email?: string;
  phone?: string;
  bloodType: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalInfo?: {
    allergies?: string[];
    medications?: string[];
    conditions?: string[];
    observations?: string;
  };
  subscriptionPlan: string;
  paymentStatus?: string;
  qrCodeUrl?: string;
  
  // Status e capacidades
  hasValidSubscription: boolean;
  canGenerateQRCode: boolean;
  canAccessPremiumFeatures?: boolean;
  
  // Datas
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  
  // Dados opcionais
  qrData?: unknown;
  qrError?: string;
  qrCodeValid?: boolean;
  payments?: Array<{
    id: string;
    amount: number;
    status: string;
    paymentMethod: string;
    externalId?: string;
    createdAt: Date;
    updatedAt: Date;
    isPending: boolean;
    isSuccessful: boolean;
    isFailed: boolean;
  }>;
  paymentError?: string;
}

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
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMIT_CONFIGS.profile);
    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for profile retrieval', {
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

    // Obter parâmetros da URL
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const profileId = url.searchParams.get('id') || url.searchParams.get('profileId') || '';
    const includeQR = url.searchParams.get('includeQR') === 'true';
    const includePayments = url.searchParams.get('includePayments') === 'true';
    const format = url.searchParams.get('format') || 'full'; // full | basic | qr-only

    // Validar profileId
    if (!profileId) {
      return createCorsResponse({
        success: false,
        error: 'Missing profile ID',
        message: 'Parâmetro "id" ou "profileId" é obrigatório',
        code: 'MISSING_PROFILE_ID'
      }, 400, req, res);
    }

    if (!/^profile_\d+_[a-z0-9]+$/.test(profileId)) {
      return createCorsResponse({
        success: false,
        error: 'Invalid profile ID format',
        message: 'Formato de profileId inválido',
        code: 'INVALID_PROFILE_ID'
      }, 400, req, res);
    }

    logger.profileLog('get_requested', profileId, { 
      identifier,
      format,
      includeQR,
      includePayments
    });

    // Inicializar serviços
    const services = initializeServices();

    // Buscar perfil
    const profile = await services.profileService.getProfileById(profileId);
    
    if (!profile) {
      logger.profileLog('not_found', profileId, { identifier });
      return createCorsResponse({
        success: false,
        error: 'Profile not found',
        message: 'Perfil não encontrado',
        code: 'PROFILE_NOT_FOUND'
      }, 404, req, res);
    }

    // Preparar dados de resposta baseado no formato
    let responseData: Partial<ProfileResponseData> = {};

    if (format === 'qr-only') {
      // Apenas dados essenciais para QR Code
      responseData = {
        id: profile.getId(),
        fullName: profile.getFullName(),
        bloodType: profile.getBloodType().getValue(),
        emergencyContact: profile.getEmergencyContact(),
        medicalInfo: profile.getMedicalInfo(),
        subscriptionPlan: profile.getSubscriptionPlan(),
        hasValidSubscription: profile.hasValidSubscription(),
        canGenerateQRCode: profile.canGenerateQRCode(),
        qrCodeUrl: profile.getQRCodeUrl()
      };
    } else if (format === 'basic') {
      // Dados básicos do perfil
      responseData = {
        id: profile.getId(),
        fullName: profile.getFullName(),
        email: profile.getEmail().getValue(),
        phone: profile.getPhone().getValue(),
        subscriptionPlan: profile.getSubscriptionPlan(),
        paymentStatus: profile.getPaymentStatus().getValue(),
        hasValidSubscription: profile.hasValidSubscription(),
        canAccessPremiumFeatures: profile.canAccessPremiumFeatures(),
        createdAt: profile.getCreatedAt(),
        updatedAt: profile.getUpdatedAt()
      };
    } else {
      // Formato completo
      responseData = {
        id: profile.getId(),
        fullName: profile.getFullName(),
        cpf: profile.getCPF().getValue(),
        email: profile.getEmail().getValue(),
        phone: profile.getPhone().getValue(),
        bloodType: profile.getBloodType().getValue(),
        emergencyContact: profile.getEmergencyContact(),
        medicalInfo: profile.getMedicalInfo(),
        subscriptionPlan: profile.getSubscriptionPlan(),
        paymentStatus: profile.getPaymentStatus().getValue(),
        qrCodeUrl: profile.getQRCodeUrl(),
        
        // Status e capacidades
        hasValidSubscription: profile.hasValidSubscription(),
        canGenerateQRCode: profile.canGenerateQRCode(),
        canAccessPremiumFeatures: profile.canAccessPremiumFeatures(),
        
        // Datas
        createdAt: profile.getCreatedAt(),
        updatedAt: profile.getUpdatedAt(),
        expiresAt: profile.getExpiresAt()
      };
    }

    // Incluir informações de QR Code se solicitado
    if (includeQR && format !== 'basic') {
      try {
        const qrCodeGenerator = require('./_utils/qrGenerator').createQRCodeGenerator();
        const { QRCodeService } = require('../lib/domain/services/QRCodeService');
        const qrCodeService = new QRCodeService(
          services.profileRepository,
          qrCodeGenerator
        );

        const qrData = await qrCodeService.getQRCodeData(profileId);
        responseData.qrData = qrData;
        
        // Validar QR Code se existir
        if (profile.getQRCodeUrl()) {
          const qrValid = await qrCodeService.validateQRCode(JSON.stringify(qrData));
          responseData.qrCodeValid = qrValid;
        }
      } catch (qrError) {
        logger.warn('Failed to include QR data', { 
          profileId,
          error: qrError instanceof Error ? qrError.message : 'Unknown'
        });
        
        responseData.qrData = null;
        responseData.qrError = 'Não foi possível obter dados do QR Code';
      }
    }

    // Incluir histórico de pagamentos se solicitado e autorizado
    if (includePayments && format === 'full') {
      try {
        const payments = await services.paymentRepository.findByProfileId(profileId);
        responseData.payments = payments.map(payment => ({
          id: payment.getId(),
          amount: payment.getAmount(),
          status: payment.getStatus().getValue(),
          paymentMethod: payment.getPaymentMethod(),
          externalId: payment.getExternalId(),
          createdAt: payment.getCreatedAt(),
          updatedAt: payment.getUpdatedAt(),
          isPending: payment.isPending(),
          isSuccessful: payment.isSuccessful(),
          isFailed: payment.isFailed()
        }));
      } catch (paymentError) {
        logger.warn('Failed to include payment history', { 
          profileId,
          error: paymentError instanceof Error ? paymentError.message : 'Unknown'
        });
        
        responseData.payments = [];
        responseData.paymentError = 'Não foi possível obter histórico de pagamentos';
      }
    }

    const duration = Date.now() - startTime;
    logger.performance('get-profile-success', duration);
    logger.profileLog('retrieved', profileId, {
      identifier,
      format,
      subscriptionPlan: profile.getSubscriptionPlan(),
      paymentStatus: profile.getPaymentStatus().getValue()
    });

    // Criar resposta de sucesso
    createCorsResponse({
      success: true,
      message: 'Perfil recuperado com sucesso',
      data: responseData,
      meta: {
        format,
        includeQR,
        includePayments,
        retrievedAt: new Date().toISOString()
      }
    }, 200, req, res);

    // Adicionar headers de rate limit
    res.setHeader('X-RateLimit-Limit', rateLimitResult.limit.toString());
    res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());

    // Adicionar cache headers para perfis (cache curto para dados médicos)
    res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minutos
    res.setHeader('ETag', `"${profile.getId()}-${profile.getUpdatedAt()?.getTime()}"`);

    return;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.performance('get-profile-error', duration);
    logger.error('Get profile failed', error as Error, { identifier });

    // Tratamento específico de erros
    if (error instanceof ValidationError) {
      return createCorsResponse({
        success: false,
        error: 'Validation error',
        message: error.message,
        code: error.code,
        context: error.context
      }, 400, req, res);
    }

    if (error instanceof ProfileError) {
      let statusCode = 404;
      
      if (error.message.includes('acesso negado') || error.message.includes('não autorizado')) {
        statusCode = 403;
      }

      return createCorsResponse({
        success: false,
        error: 'Profile error',
        message: error.message,
        code: error.code,
        context: error.context
      }, statusCode, req, res);
    }

    // Erro genérico
    return createCorsResponse({
      success: false,
      error: 'Internal server error',
      message: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR',
      details: 'Ocorreu um erro inesperado ao buscar o perfil.'
    }, 500, req, res);
  }
}