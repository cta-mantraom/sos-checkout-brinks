import { FirebaseProfileRepository } from './FirebaseProfileRepository.js';
import { FirestoreClient } from '../firebase/FirestoreClient.js';

// Alias para o ProfileRepository padrão - usando Firebase como implementação
export class ProfileRepository extends FirebaseProfileRepository {
  constructor() {
    super(new FirestoreClient());
  }
}

// Re-export da interface para compatibilidade
export type { IProfileRepository } from './IProfileRepository.js';