import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeServices, validateEnvironment } from './_utils/serviceFactory.js';
import { createCorsResponse, handleCorsPreFlight, validateCorsOrigin } from './_utils/cors.js';
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMIT_CONFIGS } from './_utils/rateLimit.js';
import { logger } from '../lib/shared/utils/logger.js';
import { PaymentDTO, WebhookData } from '../lib/application/dto/PaymentDTO.js';
import { PaymentStatus } from '../lib/domain/value-objects/PaymentStatus.js';
import { ValidationError, PaymentError } from '../lib/domain/errors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
        origin: req.headers['origin'],
        userAgent: req.headers['user-agent']
      });
      
      return createCorsResponse({
        success: false,
        error: 'Origin not allowed',
        code: 'CORS_ERROR'
      }, 403, req, res, corsOptions);
    }

    // Tratar OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      return handleCorsPreFlight(req, res, corsOptions);
    }

    // Validar método HTTP
    if (req.method !== 'POST') {
      return createCorsResponse({
        success: false,
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      }, 405, req, res, corsOptions);
    }

    // Validar environment
    const missingEnvVars = validateEnvironment();
    if (missingEnvVars.length > 0) {
      logger.error('Missing environment variables for webhook', new Error(`Missing: ${missingEnvVars.join(', ')}`));
      return createCorsResponse({
        success: false,
        error: 'Server configuration error',
        code: 'CONFIG_ERROR'
      }, 500, req, res, corsOptions);
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
      }, 429, req, res, corsOptions);
    }

    // Parsear body da requisição
    let body: unknown;
    try {
      body = req.body;
    } catch (error) {
      logger.warn('Invalid JSON in webhook body', { error: error instanceof Error ? error.message : 'Unknown' });
      return createCorsResponse({
        success: false,
        error: 'Invalid JSON',
        code: 'INVALID_JSON'
      }, 400, req, res, corsOptions);
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
      }, 400, req, res, corsOptions);
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
      }, 200, req, res, corsOptions);
    }

    // Inicializar serviços
    const services = initializeServices();

    try {
      // Buscar detalhes do pagamento no MercadoPago
      const paymentDetails = await services.mercadoPagoClient.getPaymentById(webhookData.data.id);
      
      if (!paymentDetails) {
        logger.warn('Payment not found in MercadoPago', { paymentId: webhookData.data.id });
        return createCorsResponse({
          success: false,
          error: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND'
        }, 404, req, res, corsOptions);
      }

      // Buscar pagamento no banco de dados usando external_id
      let payment = await services.paymentService.getPaymentByExternalId(webhookData.data.id);
      
      // IMPORTANTE: Se não existe no banco e está aprovado, devemos criar
      if (!payment && paymentDetails.status === 'approved') {
        logger.info('Creating payment from webhook (approved)', {
          externalId: webhookData.data.id,
          status: paymentDetails.status,
          amount: paymentDetails.transaction_amount
        });
        
        // Verificar se é novo fluxo (tem profileData) ou fluxo antigo (tem profileId)
        const isNewFlow = paymentDetails.metadata?.isNewFlow === 'true';
        const profileDataJson = paymentDetails.metadata?.profileData as string;
        const temporaryProfileId = paymentDetails.metadata?.temporaryProfileId as string;
        const profileId = paymentDetails.metadata?.profile_id || 
                         paymentDetails.external_reference ||
                         temporaryProfileId;
        
        if (!profileId && !profileDataJson) {
          logger.error('Neither profileId nor profileData found in MercadoPago payment', undefined, {
            externalId: webhookData.data.id,
            metadata: paymentDetails.metadata
          });
          
          return createCorsResponse({
            success: false,
            error: 'Profile information not found in payment metadata',
            code: 'PROFILE_INFO_MISSING'
          }, 400, req, res, corsOptions);
        }
        
        // Se é novo fluxo, criar perfil agora
        let actualProfileId = profileId;
        if (isNewFlow && profileDataJson) {
          try {
            const profileData = JSON.parse(profileDataJson);
            logger.info('Creating profile from webhook (new flow)', {
              temporaryId: temporaryProfileId,
              email: profileData.email
            });
            
            // Criar perfil usando o serviço
            const createdProfile = await services.profileService.createProfile({
              fullName: profileData.fullName,
              cpf: profileData.cpf,
              phone: profileData.phone,
              email: profileData.email,
              bloodType: profileData.bloodType || 'O+',
              emergencyContact: profileData.emergencyContact,
              medicalInfo: profileData.medicalInfo || {
                allergies: [],
                medications: [],
                medicalConditions: [],
                additionalNotes: ''
              },
              subscriptionPlan: profileData.subscriptionPlan
            });
            
            actualProfileId = createdProfile.getId();
            
            // Criar subscription
            const { Subscription } = await import('../lib/domain/entities/Subscription.js');
            const subscription = Subscription.create({
              profileId: actualProfileId,
              plan: profileData.subscriptionPlan
            });
            await services.subscriptionRepository.save(subscription);
            
            logger.info('Profile and subscription created from webhook', {
              profileId: actualProfileId,
              subscriptionId: subscription.getId(),
              plan: profileData.subscriptionPlan
            });
            
          } catch (error) {
            logger.error('Failed to create profile from webhook', error as Error, {
              externalId: webhookData.data.id,
              temporaryProfileId
            });
            
            return createCorsResponse({
              success: false,
              error: 'Failed to create profile',
              message: error instanceof Error ? error.message : 'Unknown error',
              code: 'PROFILE_CREATION_FAILED'
            }, 500, req, res, corsOptions);
          }
        }
        
        // Criar e salvar payment
        const { Payment } = await import('../lib/domain/entities/Payment.js');
        
        // Mapear método de pagamento do MercadoPago para nosso tipo
        let paymentMethod: 'credit_card' | 'debit_card' | 'pix' | 'boleto' = 'pix';
        const mpMethodType = paymentDetails.payment_method?.type || '';
        
        if (mpMethodType === 'credit_card' || paymentDetails.payment_method_id?.includes('credit')) {
          paymentMethod = 'credit_card';
        } else if (mpMethodType === 'debit_card' || paymentDetails.payment_method_id?.includes('debit')) {
          paymentMethod = 'debit_card';
        } else if (paymentDetails.payment_method_id === 'pix') {
          paymentMethod = 'pix';
        } else if (paymentDetails.payment_method_id?.includes('boleto')) {
          paymentMethod = 'boleto';
        }
        
        payment = Payment.create({
          profileId: actualProfileId || profileId as string,
          amount: paymentDetails.transaction_amount,
          paymentMethodId: paymentDetails.payment_method_id,
          paymentMethod: paymentMethod,
          externalId: webhookData.data.id
        });
        
        await services.paymentRepository.save(payment);
        
      } else if (!payment) {
        // Se não é approved e não existe, ignorar
        logger.info('Ignoring webhook for non-approved payment', {
          externalId: webhookData.data.id,
          status: paymentDetails.status
        });
        
        return createCorsResponse({
          success: true,
          message: 'Webhook ignored - payment not yet approved',
          code: 'IGNORED'
        }, 200, req, res, corsOptions);
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
          newStatus = PaymentStatus.REJECTED;
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
        }, 200, req, res, corsOptions);
      }

      // Atualizar status do pagamento
      payment.updateStatus(newStatus);
      await services.paymentRepository.update(payment);

      // Se aprovado, atualizar o perfil médico também
      if (newStatus.isSuccessful()) {
        const profile = await services.profileService.getProfileById(payment.getProfileId());
        
        if (profile) {
          // Atualizar status do perfil para aprovado
          profile.updatePaymentStatus(PaymentStatus.APPROVED);
          await services.profileRepository.update(profile);
          
          // Tentar gerar QR Code se ainda não foi gerado
          try {
            const qrCodeUrl = await services.qrCodeService.generateQRCode(profile.getId());
            
            // Atualizar perfil com URL do QR Code
            profile.setQRCodeUrl(qrCodeUrl);
            await services.profileRepository.update(profile);
            
            logger.qrCodeLog('generated', profile.getId(), { 
              reason: 'webhook_payment_approved',
              qrCodeUrl 
            });
          } catch (qrError) {
            logger.error('Failed to generate QR Code on webhook', qrError as Error, {
              profileId: profile.getId(),
              paymentId: payment.getId()
            });
          }
        } else {
          logger.warn('Profile not found for approved payment', {
            profileId: payment.getProfileId(),
            paymentId: payment.getId()
          });
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
      }, 200, req, res, corsOptions);

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
      }, 500, req, res, corsOptions);
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
      }, 400, req, res);
    }

    if (error instanceof PaymentError) {
      return createCorsResponse({
        success: false,
        error: 'Payment error',
        message: error.message,
        code: error.code
      }, 422, req, res);
    }

    // Erro genérico
    return createCorsResponse({
      success: false,
      error: 'Internal server error',
      message: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    }, 500, req, res);
  }
}