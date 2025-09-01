import { ConfigSingleton, ConfigMask } from '../utils';
import { EnvValidator } from '../validators';
import {
  FirebaseConfigSchema,
  FirebaseEnvSchema,
  type FirebaseConfig as FirebaseConfigType,
  type FirebaseEnv,
} from '../schemas';

/**
 * Configuração do Firebase com singleton + lazy loading
 * ISOLADO - uma responsabilidade: configuração do Firebase
 */
export class FirebaseConfigService extends ConfigSingleton<FirebaseConfigType> {
  private static readonly CONFIG_KEY = 'firebase';

  private constructor() {
    super(FirebaseConfigService.CONFIG_KEY);
  }

  /**
   * Obtém instância singleton
   */
  public static getInstance(): FirebaseConfigService {
    return super.getInstance(FirebaseConfigService, FirebaseConfigService.CONFIG_KEY);
  }

  /**
   * Implementação do carregamento e validação
   */
  protected loadAndValidate(): FirebaseConfigType {
    try {
      // 1. Validar variáveis de ambiente primeiro
      const envData = this.loadEnvironmentData();
      
      // 2. Construir configuração completa
      const config: FirebaseConfigType = {
        credentials: {
          projectId: envData.FIREBASE_PROJECT_ID,
          clientEmail: envData.FIREBASE_CLIENT_EMAIL,
          privateKey: envData.FIREBASE_PRIVATE_KEY,
          storageBucket: envData.FIREBASE_STORAGE_BUCKET,
        },
        settings: {
          ignoreUndefinedProperties: true,
          timestampsInSnapshots: true,
        },
        collections: {
          users: 'users',
          profiles: 'medical_profiles',
          payments: 'payments',
          subscriptions: 'subscriptions',
          qr_codes: 'qr_codes',
        },
        limits: {
          maxDocuments: 1000,
          maxBatchSize: 500,
          queryTimeout: 10000,
        },
      };

      // 3. Validar configuração final
      const validatedConfig = EnvValidator.validate(
        FirebaseConfigSchema,
        config,
        'FirebaseConfig'
      );

      // 4. Log com mascaramento
      this.logConfigLoaded(validatedConfig);

      return validatedConfig;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      ConfigMask.logError(
        new Error(`Falha ao carregar configuração do Firebase: ${errorMessage}`),
        'FirebaseConfig'
      );
      throw error;
    }
  }

  /**
   * Carrega e valida dados do ambiente
   */
  private loadEnvironmentData(): FirebaseEnv {
    // FIREBASE_PROJECT_ID é obrigatório
    const requiredVars = ['FIREBASE_PROJECT_ID'];
    
    const missingVars = EnvValidator.validateRequiredEnvVars(requiredVars);
    if (missingVars.length > 0) {
      throw new Error(`Variáveis de ambiente obrigatórias ausentes: ${missingVars.join(', ')}`);
    }

    // Criar objeto de environment data
    const envData = {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID!,
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    };

    // Validar com schema
    return EnvValidator.validate(
      FirebaseEnvSchema,
      envData,
      'FirebaseEnv'
    );
  }

  /**
   * Log de configuração carregada com mascaramento
   */
  private logConfigLoaded(config: FirebaseConfigType): void {
    ConfigMask.logConfig(
      {
        credentials: {
          projectId: config.credentials.projectId,
          clientEmail: config.credentials.clientEmail,
          privateKey: config.credentials.privateKey, // Será mascarado automaticamente
          storageBucket: config.credentials.storageBucket,
        },
        settings: config.settings,
        collections: config.collections,
        limits: config.limits,
      },
      'FirebaseConfig'
    );
  }

  /**
   * Obtém apenas credenciais do Firebase
   */
  public getCredentials() {
    return this.getConfig().credentials;
  }

  /**
   * Obtém configurações das coleções
   */
  public getCollections() {
    return this.getConfig().collections;
  }

  /**
   * Obtém configurações de limites
   */
  public getLimits() {
    return this.getConfig().limits;
  }

  /**
   * Obtém configurações do Firestore
   */
  public getFirestoreSettings() {
    return this.getConfig().settings;
  }

  /**
   * Verifica se tem credenciais de service account
   */
  public hasServiceAccountCredentials(): boolean {
    const credentials = this.getCredentials();
    return !!(credentials.clientEmail && credentials.privateKey);
  }

  /**
   * Obtém configuração para inicialização do Firebase Admin
   */
  public getFirebaseInitConfig() {
    const { credentials } = this.getConfig();
    
    if (this.hasServiceAccountCredentials()) {
      return {
        projectId: credentials.projectId,
        clientEmail: credentials.clientEmail!,
        privateKey: credentials.privateKey!.replace(/\\n/g, '\n'),
        storageBucket: credentials.storageBucket,
      };
    }
    
    // Configuração para desenvolvimento local (sem service account)
    return {
      projectId: credentials.projectId,
      storageBucket: credentials.storageBucket,
    };
  }

  /**
   * Obtém nome de uma coleção específica
   */
  public getCollectionName(collectionType: keyof FirebaseConfigType['collections']): string {
    return this.getConfig().collections[collectionType];
  }
}

/**
 * Função helper para uso simplificado
 * Padrão de função para manter compatibilidade
 */
export const getFirebaseConfig = (): FirebaseConfigType => {
  return FirebaseConfigService.getInstance().getConfig();
};

/**
 * Função helper para credenciais Firebase
 */
export const getFirebaseCredentials = () => {
  return FirebaseConfigService.getInstance().getCredentials();
};

/**
 * Função helper para configuração de inicialização
 * Substitui a função initializeFirebaseFromEnv()
 */
export const getFirebaseInitConfig = () => {
  return FirebaseConfigService.getInstance().getFirebaseInitConfig();
};