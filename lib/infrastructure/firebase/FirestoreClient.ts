import { Firestore, CollectionReference, DocumentData, Query, WriteResult, FieldValue } from 'firebase-admin/firestore';
import { FirebaseConfig } from './FirebaseConfig.js';

export interface FirestoreQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  where?: { field: string; operator: FirebaseFirestore.WhereFilterOp; value: unknown }[];
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export class FirestoreClient {
  private firestore: Firestore;

  constructor(firebaseConfig?: FirebaseConfig) {
    const config = firebaseConfig || FirebaseConfig.getInstance();
    this.firestore = config.getFirestore();
  }

  // Métodos básicos CRUD
  async create<T extends DocumentData>(collection: string, data: T, id?: string): Promise<string> {
    try {
      const docRef = id 
        ? this.firestore.collection(collection).doc(id)
        : this.firestore.collection(collection).doc();
      
      await docRef.set({
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error(`Erro ao criar documento em ${collection}:`, error);
      throw new Error(`Falha ao criar documento: ${error}`);
    }
  }

  async findById<T>(collection: string, id: string): Promise<T | null> {
    try {
      const doc = await this.firestore.collection(collection).doc(id).get();
      
      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data()
      } as T;
    } catch (error) {
      console.error(`Erro ao buscar documento por ID em ${collection}:`, error);
      throw new Error(`Falha ao buscar documento: ${error}`);
    }
  }

  async update<T extends DocumentData>(collection: string, id: string, data: Partial<T>): Promise<WriteResult> {
    try {
      return await this.firestore.collection(collection).doc(id).update({
        ...data,
        updatedAt: FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error(`Erro ao atualizar documento em ${collection}:`, error);
      throw new Error(`Falha ao atualizar documento: ${error}`);
    }
  }

  async delete(collection: string, id: string, softDelete: boolean = true): Promise<WriteResult | void> {
    try {
      if (softDelete) {
        return await this.firestore.collection(collection).doc(id).update({
          deletedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
      } else {
        return await this.firestore.collection(collection).doc(id).delete();
      }
    } catch (error) {
      console.error(`Erro ao deletar documento em ${collection}:`, error);
      throw new Error(`Falha ao deletar documento: ${error}`);
    }
  }

  // Métodos de consulta
  async findOne<T>(collection: string, field: string, value: unknown): Promise<T | null> {
    try {
      const snapshot = await this.firestore
        .collection(collection)
        .where(field, '==', value)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as T;
    } catch (error) {
      console.error(`Erro ao buscar documento em ${collection}:`, error);
      throw new Error(`Falha ao buscar documento: ${error}`);
    }
  }

  async findMany<T>(collection: string, options: FirestoreQueryOptions = {}): Promise<T[]> {
    try {
      let query: Query = this.firestore.collection(collection);

      // Aplicar filtros
      if (options.where) {
        for (const condition of options.where) {
          query = query.where(condition.field, condition.operator, condition.value);
        }
      }

      // Filtrar documentos não deletados (opcional)
      if (options.where && !options.where.some(w => w.field === 'deletedAt')) {
        // Só adicionar se não foi especificado nas condições where
        try {
          query = query.where('deletedAt', '==', null);
        } catch {
          // Se falhar (campo não existe), continuar sem o filtro
        }
      }

      // Aplicar ordenação
      if (options.orderBy) {
        for (const order of options.orderBy) {
          query = query.orderBy(order.field, order.direction);
        }
      }

      // Aplicar paginação
      if (options.offset) {
        query = query.offset(options.offset);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const snapshot = await query.get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
    } catch (error) {
      console.error(`Erro ao buscar documentos em ${collection}:`, error);
      throw new Error(`Falha ao buscar documentos: ${error}`);
    }
  }

  async findManyPaginated<T>(
    collection: string, 
    page: number = 1, 
    limit: number = 10, 
    options: Omit<FirestoreQueryOptions, 'limit' | 'offset'> = {}
  ): Promise<PaginatedResult<T>> {
    try {
      const offset = (page - 1) * limit;
      
      // Buscar dados com paginação
      const data = await this.findMany<T>(collection, {
        ...options,
        limit,
        offset
      });

      // Contar total de documentos
      const total = await this.count(collection, options.where);
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        data,
        total,
        page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      };
    } catch (error) {
      console.error(`Erro ao buscar documentos paginados em ${collection}:`, error);
      throw new Error(`Falha ao buscar documentos paginados: ${error}`);
    }
  }

  async count(collection: string, where?: { field: string; operator: FirebaseFirestore.WhereFilterOp; value: unknown }[]): Promise<number> {
    try {
      let query: Query = this.firestore.collection(collection);

      // Aplicar filtros
      if (where) {
        for (const condition of where) {
          query = query.where(condition.field, condition.operator, condition.value);
        }
      }

      // Filtrar documentos não deletados (opcional)
      if (!where || !where.some(w => w.field === 'deletedAt')) {
        try {
          query = query.where('deletedAt', '==', null);
        } catch {
          // Se falhar (campo não existe), continuar sem o filtro
        }
      }

      const snapshot = await query.count().get();
      return snapshot.data().count;
    } catch (error) {
      console.error(`Erro ao contar documentos em ${collection}:`, error);
      throw new Error(`Falha ao contar documentos: ${error}`);
    }
  }

  async exists(collection: string, id: string): Promise<boolean> {
    try {
      const doc = await this.firestore.collection(collection).doc(id).get();
      return doc.exists && !doc.data()?.deletedAt;
    } catch (error) {
      console.error(`Erro ao verificar existência do documento em ${collection}:`, error);
      throw new Error(`Falha ao verificar documento: ${error}`);
    }
  }

  // Métodos de transação e batch
  async runTransaction<T>(updateFunction: (transaction: FirebaseFirestore.Transaction) => Promise<T>): Promise<T> {
    try {
      return await this.firestore.runTransaction(updateFunction);
    } catch (error) {
      console.error('Erro ao executar transação:', error);
      throw new Error(`Falha na transação: ${error}`);
    }
  }

  createBatch(): FirebaseFirestore.WriteBatch {
    return this.firestore.batch();
  }

  async commitBatch(batch: FirebaseFirestore.WriteBatch): Promise<WriteResult[]> {
    try {
      return await batch.commit();
    } catch (error) {
      console.error('Erro ao executar batch:', error);
      throw new Error(`Falha no batch: ${error}`);
    }
  }

  // Métodos utilitários
  getFirestore(): Firestore {
    return this.firestore;
  }

  collection(path: string): CollectionReference {
    return this.firestore.collection(path);
  }

  serverTimestamp(): FieldValue {
    return FieldValue.serverTimestamp();
  }

  arrayUnion(...elements: unknown[]): FieldValue {
    return FieldValue.arrayUnion(...elements);
  }

  arrayRemove(...elements: unknown[]): FieldValue {
    return FieldValue.arrayRemove(...elements);
  }

  increment(n: number): FieldValue {
    return FieldValue.increment(n);
  }
}