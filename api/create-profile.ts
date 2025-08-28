import { NextRequest, NextResponse } from 'next/server';
import { CreateProfileUseCase } from '../lib/application/use-cases/CreateProfileUseCase.js';
import { ProfileService } from '../lib/domain/services/ProfileService.js';
import { FirebaseProfileRepository } from '../lib/infrastructure/repositories/FirebaseProfileRepository.js';
import { FirebaseUserRepository } from '../lib/infrastructure/repositories/FirebaseUserRepository.js';
import { FirebaseSubscriptionRepository } from '../lib/infrastructure/repositories/FirebaseSubscriptionRepository.js';
import { FirestoreClient } from '../lib/infrastructure/firebase/FirestoreClient.js';
import { initializeFirebaseFromEnv } from '../lib/infrastructure/firebase/FirebaseConfig.js';
import { logger } from '../lib/shared/utils/logger.js';
import { ValidationError, ProfileError } from '../lib/domain/errors.js';

export default async function handler(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Validar método HTTP
    if (req.method !== 'POST') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED'
        },
        { status: 405 }
      );
    }

    // Parsear body da requisição
    const body = await req.json();
    logger.info('Create profile request received', { body });

    // Inicializar dependências
    const firebaseConfig = initializeFirebaseFromEnv();
    const firestoreClient = new FirestoreClient(firebaseConfig);
    
    // Repositórios
    const profileRepository = new FirebaseProfileRepository(firestoreClient);
    const userRepository = new FirebaseUserRepository(firestoreClient);
    const subscriptionRepository = new FirebaseSubscriptionRepository(firestoreClient);
    
    // Serviços
    const profileService = new ProfileService(
      profileRepository,
      userRepository,
      subscriptionRepository
    );
    
    // Caso de uso
    const createProfileUseCase = new CreateProfileUseCase(profileService);
    
    // Executar caso de uso
    const result = await createProfileUseCase.execute(body);
    
    const duration = Date.now() - startTime;
    logger.performance('create-profile', duration);
    logger.profileLog('created', result.profile.getId(), {
      plan: result.profile.getSubscriptionPlan(),
      email: result.profile.getEmail().getValue()
    });

    // Retornar sucesso
    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        profile: {
          id: result.profile.getId(),
          fullName: result.profile.getFullName(),
          email: result.profile.getEmail().getValue(),
          subscriptionPlan: result.profile.getSubscriptionPlan(),
          paymentStatus: result.profile.getPaymentStatus().getValue(),
          createdAt: result.profile.getCreatedAt()
        }
      }
    }, { status: 201 });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.performance('create-profile-error', duration);
    logger.error('Create profile failed', error as Error);

    // Tratar erros específicos
    if (error instanceof ValidationError) {
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        message: error.message,
        code: error.code,
        context: error.context
      }, { status: 400 });
    }

    if (error instanceof ProfileError) {
      return NextResponse.json({
        success: false,
        error: 'Erro no perfil',
        message: error.message,
        code: error.code,
        context: error.context
      }, { status: 409 });
    }

    // Erro genérico
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    }, { status: 500 });
  }
}