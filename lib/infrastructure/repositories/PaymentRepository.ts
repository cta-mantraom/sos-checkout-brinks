import { FirebasePaymentRepository } from './FirebasePaymentRepository.js';
import { FirestoreClient } from '../firebase/FirestoreClient.js';

// Alias para o PaymentRepository padrão - usando Firebase como implementação
export class PaymentRepository extends FirebasePaymentRepository {
  constructor() {
    super(new FirestoreClient());
  }
}

// Re-export da interface para compatibilidade
export type { IPaymentRepository } from './IPaymentRepository.js';