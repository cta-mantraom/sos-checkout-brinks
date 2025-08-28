import { CreateProfileUseCase } from '../../lib/application/use-cases/CreateProfileUseCase.js';
import { ProcessPaymentUseCase } from '../../lib/application/use-cases/ProcessPaymentUseCase.js';
import { PaymentService } from '../../lib/domain/services/PaymentService.js';
import { ProfileService } from '../../lib/domain/services/ProfileService.js';
import { QRCodeService } from '../../lib/domain/services/QRCodeService.js';
import { FirebaseProfileRepository } from '../../lib/infrastructure/repositories/FirebaseProfileRepository.js';
import { FirebaseUserRepository } from '../../lib/infrastructure/repositories/FirebaseUserRepository.js';
import { FirebaseSubscriptionRepository } from '../../lib/infrastructure/repositories/FirebaseSubscriptionRepository.js';
import { FirebasePaymentRepository } from '../../lib/infrastructure/repositories/FirebasePaymentRepository.js';
import { FirestoreClient } from '../../lib/infrastructure/firebase/FirestoreClient.js';
import { initializeFirebaseFromEnv } from '../../lib/infrastructure/firebase/FirebaseConfig.js';
import { MercadoPagoClient } from '../../lib/infrastructure/mercadopago/MercadoPagoClient.js';

// Cache para evitar múltiplas inicializações
let cachedServices: ServiceContainer | null = null;

export interface ServiceContainer {
  // Repositories
  profileRepository: FirebaseProfileRepository;
  userRepository: FirebaseUserRepository;
  subscriptionRepository: FirebaseSubscriptionRepository;
  paymentRepository: FirebasePaymentRepository;
  
  // Services
  profileService: ProfileService;
  paymentService: PaymentService;
  qrCodeService: QRCodeService;
  
  // Use Cases
  createProfileUseCase: CreateProfileUseCase;
  processPaymentUseCase: ProcessPaymentUseCase;
  
  // Infrastructure
  firestoreClient: FirestoreClient;
  mercadoPagoClient: MercadoPagoClient;
}

export function initializeServices(): ServiceContainer {
  // Retornar cache se já inicializado
  if (cachedServices) {
    return cachedServices;
  }

  try {
    // Inicializar Firebase
    const firebaseConfig = initializeFirebaseFromEnv();
    const firestoreClient = new FirestoreClient(firebaseConfig);
    
    // Inicializar MercadoPago
    const mercadoPagoClient = new MercadoPagoClient();
    
    // Repositórios
    const profileRepository = new FirebaseProfileRepository(firestoreClient);
    const userRepository = new FirebaseUserRepository(firestoreClient);
    const subscriptionRepository = new FirebaseSubscriptionRepository(firestoreClient);
    const paymentRepository = new FirebasePaymentRepository(firestoreClient);
    
    // Serviços de domínio
    const profileService = new ProfileService(
      profileRepository,
      userRepository,
      subscriptionRepository
    );
    
    const paymentService = new PaymentService(
      paymentRepository,
      mercadoPagoClient
    );
    
    const qrCodeService = new QRCodeService();
    
    // Casos de uso
    const createProfileUseCase = new CreateProfileUseCase(profileService);
    const processPaymentUseCase = new ProcessPaymentUseCase(
      paymentService,
      profileService,
      qrCodeService
    );
    
    // Container de serviços
    const services: ServiceContainer = {
      // Repositories
      profileRepository,
      userRepository,
      subscriptionRepository,
      paymentRepository,
      
      // Services
      profileService,
      paymentService,
      qrCodeService,
      
      // Use Cases
      createProfileUseCase,
      processPaymentUseCase,
      
      // Infrastructure
      firestoreClient,
      mercadoPagoClient
    };
    
    // Cache para próximas requisições
    cachedServices = services;
    
    return services;
    
  } catch (error) {
    console.error('Erro ao inicializar serviços:', error);
    throw new Error(`Falha na inicialização dos serviços: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// Função para limpar o cache (útil para testes ou reinicialização)
export function clearServiceCache(): void {
  cachedServices = null;
}

// Função helper para validação de ambiente
export function validateEnvironment(): string[] {
  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'MERCADOPAGO_ACCESS_TOKEN'
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  return missing;
}

// Função para verificar se os serviços estão saudáveis
export async function healthCheck(): Promise<{
  healthy: boolean;
  services: {
    firebase: boolean;
    mercadopago: boolean;
  };
  errors: string[];
}> {
  const errors: string[] = [];
  let firebaseHealthy = false;
  let mercadopagoHealthy = false;
  
  try {
    const services = initializeServices();
    
    // Testar Firebase
    try {
      await services.firestoreClient.collection('health_check').limit(1).get();
      firebaseHealthy = true;
    } catch (error) {
      errors.push(`Firebase: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
    
    // Testar MercadoPago (verificar se o token está válido)
    try {
      // A instância do cliente já valida o token na inicialização
      mercadopagoHealthy = !!services.mercadoPagoClient;
    } catch (error) {
      errors.push(`MercadoPago: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
    
  } catch (error) {
    errors.push(`Inicialização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
  
  return {
    healthy: firebaseHealthy && mercadopagoHealthy && errors.length === 0,
    services: {
      firebase: firebaseHealthy,
      mercadopago: mercadopagoHealthy
    },
    errors
  };
}