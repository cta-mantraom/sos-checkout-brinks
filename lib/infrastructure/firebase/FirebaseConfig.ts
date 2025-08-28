import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

export interface FirebaseConfigOptions {
  projectId: string;
  clientEmail?: string;
  privateKey?: string;
  storageBucket?: string;
}

export class FirebaseConfig {
  private static instance: FirebaseConfig;
  private app: any;
  private firestore: any;
  private storage: any;

  private constructor(options: FirebaseConfigOptions) {
    this.initializeFirebase(options);
  }

  static getInstance(options?: FirebaseConfigOptions): FirebaseConfig {
    if (!FirebaseConfig.instance) {
      if (!options) {
        throw new Error('FirebaseConfig options são necessárias na primeira inicialização');
      }
      FirebaseConfig.instance = new FirebaseConfig(options);
    }
    return FirebaseConfig.instance;
  }

  private initializeFirebase(options: FirebaseConfigOptions): void {
    try {
      // Verifica se já existe uma instância do app
      if (getApps().length === 0) {
        // Configuração para produção com service account
        if (options.clientEmail && options.privateKey) {
          this.app = initializeApp({
            credential: cert({
              projectId: options.projectId,
              clientEmail: options.clientEmail,
              privateKey: options.privateKey.replace(/\\n/g, '\n')
            }),
            storageBucket: options.storageBucket
          });
        } else {
          // Configuração para desenvolvimento local
          this.app = initializeApp({
            projectId: options.projectId,
            storageBucket: options.storageBucket
          });
        }
      } else {
        this.app = getApp();
      }

      this.firestore = getFirestore(this.app);
      this.storage = getStorage(this.app);

      // Configurações do Firestore
      this.firestore.settings({
        ignoreUndefinedProperties: true
      });

    } catch (error) {
      console.error('Erro ao inicializar Firebase:', error);
      throw new Error('Falha na inicialização do Firebase');
    }
  }

  getFirestore() {
    return this.firestore;
  }

  getStorage() {
    return this.storage;
  }

  getApp() {
    return this.app;
  }

  // Método para testar a conexão
  async testConnection(): Promise<boolean> {
    try {
      await this.firestore.collection('_health_check').limit(1).get();
      return true;
    } catch (error) {
      console.error('Erro ao testar conexão Firebase:', error);
      return false;
    }
  }
}

// Função helper para inicializar com variáveis de ambiente
export function initializeFirebaseFromEnv(): FirebaseConfig {
  const config: FirebaseConfigOptions = {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  };

  if (!config.projectId) {
    throw new Error('FIREBASE_PROJECT_ID é obrigatório');
  }

  return FirebaseConfig.getInstance(config);
}