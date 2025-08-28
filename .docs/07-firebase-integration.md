# 07. Integração Firebase - SOS Checkout Brinks

## 📋 Visão Geral

O Firebase é o backend principal do SOS Checkout Brinks, fornecendo:
- **Firestore**: Banco de dados NoSQL para perfis médicos e pagamentos
- **Storage**: Armazenamento de QR Codes e imagens
- **Functions**: Processamento serverless de webhooks e lógica sensível
- **Auth**: Autenticação de usuários (futuro)

## 🚨 REGRA FUNDAMENTAL: ZERO ANY

```typescript
// ❌ PROIBIDO - NUNCA FAZER ISSO
const data: any = snapshot.data();
const profile = data as MedicalProfile;

// ✅ CORRETO - SEMPRE FAZER ASSIM
import { z } from 'zod';

const MedicalProfileSchema = z.object({
  fullName: z.string(),
  cpf: z.string().regex(/^\d{11}$/),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
});

const data = snapshot.data();
const profile = MedicalProfileSchema.parse(data);
```

## 🏗️ Estrutura de Collections

### 1. medical_profiles
```typescript
interface IMedicalProfile {
  // Identificação
  userId: string;              // ID único do usuário
  fullName: string;            // Nome completo
  cpf: string;                 // CPF criptografado
  dateOfBirth: Timestamp;      // Data de nascimento
  
  // Dados Médicos
  bloodType: TBloodType;       // Tipo sanguíneo
  allergies: string[];         // Lista de alergias
  medications: string[];       // Medicamentos em uso
  medicalConditions: string[]; // Condições médicas
  
  // Emergência
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  
  // Metadados
  qrCodeId: string;           // Referência ao QR Code
  planType: 'basic' | 'premium';
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2. payments
```typescript
interface IPayment {
  // Identificação
  paymentId: string;          // ID único do pagamento
  userId: string;             // Referência ao usuário
  profileId: string;          // Referência ao perfil médico
  
  // Dados do Pagamento
  amount: number;             // Valor (5.00 ou 10.00)
  currency: 'BRL';
  planType: 'basic' | 'premium';
  paymentMethod: 'credit' | 'debit' | 'pix';
  
  // MercadoPago
  mercadoPagoId: string;      // ID da transação MP
  deviceId: string;           // Device fingerprint (OBRIGATÓRIO)
  status: 'pending' | 'approved' | 'rejected' | 'refunded';
  statusDetail: string;
  
  // Auditoria
  ipAddress: string;
  userAgent: string;
  createdAt: Timestamp;
  processedAt: Timestamp | null;
}
```

### 3. qr_codes
```typescript
interface IQRCode {
  // Identificação
  qrCodeId: string;           // ID único do QR
  profileId: string;          // Referência ao perfil
  
  // Dados do QR
  code: string;               // Código único
  url: string;                // URL pública de acesso
  imageUrl: string;           // URL da imagem no Storage
  
  // Configuração
  planType: 'basic' | 'premium';
  expiresAt: Timestamp | null; // null = não expira
  
  // Analytics
  accessCount: number;
  lastAccessedAt: Timestamp | null;
  accessHistory: Array<{
    timestamp: Timestamp;
    location?: string;
    device?: string;
  }>;
  
  // Metadados
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4. webhooks (Auditoria)
```typescript
interface IWebhookLog {
  // Identificação
  webhookId: string;
  eventType: string;
  
  // Dados do Webhook
  payload: Record<string, unknown>; // Validado com Zod
  headers: Record<string, string>;
  signature: string;
  
  // Processamento
  processed: boolean;
  processedAt: Timestamp | null;
  error: string | null;
  retryCount: number;
  
  // Metadados
  receivedAt: Timestamp;
}
```

## 🔒 Regras de Segurança (firestore.rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Funções auxiliares
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             request.auth.token.role == 'admin';
    }
    
    function hasValidQRCode(qrCode) {
      return isAuthenticated() && 
             request.auth.token.qrCode == qrCode;
    }
    
    // Medical Profiles - LGPD Compliance
    match /medical_profiles/{profileId} {
      // Leitura: Owner ou acesso emergência com QR válido
      allow read: if isOwner(resource.data.userId) ||
                     hasValidQRCode(resource.data.qrCodeId) ||
                     isAdmin();
      
      // Criação: Apenas autenticado
      allow create: if isAuthenticated() && 
                       request.auth.uid == request.resource.data.userId;
      
      // Atualização: Apenas owner
      allow update: if isOwner(resource.data.userId);
      
      // Exclusão: Owner ou admin (LGPD)
      allow delete: if isOwner(resource.data.userId) || isAdmin();
    }
    
    // Payments - Somente leitura para owner
    match /payments/{paymentId} {
      // Leitura: Apenas owner
      allow read: if isOwner(resource.data.userId) || isAdmin();
      
      // Escrita: Apenas backend (Functions)
      allow write: if false;
    }
    
    // QR Codes - Público para emergências
    match /qr_codes/{qrCodeId} {
      // Leitura: Pública (emergência médica)
      allow read: if true;
      
      // Escrita: Apenas backend
      allow write: if false;
    }
    
    // Webhooks - Apenas admin
    match /webhooks/{webhookId} {
      allow read: if isAdmin();
      allow write: if false; // Backend only
    }
  }
}
```

## 📊 Índices Compostos (firestore.indexes.json)

```json
{
  "indexes": [
    {
      "collectionGroup": "medical_profiles",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "active", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "payments",
      "queryScope": "COLLECTION", 
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "payments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "profileId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "qr_codes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "profileId", "order": "ASCENDING" },
        { "fieldPath": "active", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "qr_codes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "code", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "webhooks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "processed", "order": "ASCENDING" },
        { "fieldPath": "receivedAt", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## 🔧 Configuração do Projeto

### 1. firebase.json
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "api",
    "runtime": "nodejs18",
    "ignore": [
      "node_modules",
      ".git",
      "**/*.test.ts",
      "**/*.spec.ts"
    ]
  },
  "storage": {
    "rules": "storage.rules"
  },
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "storage": {
      "port": 9199
    },
    "hosting": {
      "port": 5000
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

### 2. .firebaserc
```json
{
  "projects": {
    "default": "sos-checkout-brinks-dev",
    "staging": "sos-checkout-brinks-staging", 
    "production": "sos-checkout-brinks"
  }
}
```

### 3. storage.rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // QR Codes - Leitura pública
    match /qr-codes/{qrCodeId} {
      allow read: if true; // Público para emergências
      allow write: if false; // Backend only
    }
    
    // Profile Images - Privado
    match /profiles/{userId}/{allPaths=**} {
      allow read: if request.auth != null && 
                     request.auth.uid == userId;
      allow write: if request.auth != null && 
                      request.auth.uid == userId &&
                      request.resource.size < 5 * 1024 * 1024; // Max 5MB
    }
  }
}
```

## 💻 Implementação com Type Safety

### 1. Configuração Firebase (lib/firebase/config.ts)
```typescript
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { z } from 'zod';

// Schema para validar config
const FirebaseConfigSchema = z.object({
  apiKey: z.string().min(1),
  authDomain: z.string().min(1),
  projectId: z.string().min(1),
  storageBucket: z.string().min(1),
  messagingSenderId: z.string().min(1),
  appId: z.string().min(1)
});

// Validar config do ambiente
const firebaseConfig = FirebaseConfigSchema.parse({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
});

// Inicializar com tipos corretos
export const app: FirebaseApp = initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
```

### 2. Repository Pattern (lib/firebase/repositories/medical-profile.repo.ts)
```typescript
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  deleteDoc,
  serverTimestamp,
  DocumentReference,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config';
import { z } from 'zod';
import DOMPurify from 'dompurify';

// Schema de validação
const MedicalProfileSchema = z.object({
  fullName: z.string().min(1).max(100),
  cpf: z.string().regex(/^\d{11}$/),
  dateOfBirth: z.date(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  allergies: z.array(z.string()).max(10),
  medications: z.array(z.string()).max(10),
  medicalConditions: z.array(z.string()).max(10),
  emergencyContact: z.object({
    name: z.string().min(1),
    phone: z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/),
    relationship: z.string().min(1)
  })
});

type TMedicalProfileInput = z.infer<typeof MedicalProfileSchema>;

export class MedicalProfileRepository {
  private collection = 'medical_profiles';
  
  // Criar perfil com validação completa
  async create(userId: string, data: unknown): Promise<string> {
    // 1. Validar com Zod
    const validated = MedicalProfileSchema.parse(data);
    
    // 2. Sanitizar dados sensíveis
    const sanitized = this.sanitizeData(validated);
    
    // 3. Criptografar CPF
    const encrypted = await this.encryptSensitiveData(sanitized);
    
    // 4. Criar documento
    const docRef: DocumentReference = doc(collection(db, this.collection));
    
    await setDoc(docRef, {
      ...encrypted,
      userId,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  }
  
  // Buscar com validação de tipos
  async findById(profileId: string): Promise<IMedicalProfile | null> {
    const docRef = doc(db, this.collection, profileId);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    // Validar dados do banco
    const data = snapshot.data();
    const validated = MedicalProfileSchema.parse(data);
    
    return {
      id: snapshot.id,
      ...validated,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp
    } as IMedicalProfile;
  }
  
  // Atualizar com validação parcial
  async update(profileId: string, data: Partial<TMedicalProfileInput>): Promise<void> {
    // Validar apenas campos enviados
    const PartialSchema = MedicalProfileSchema.partial();
    const validated = PartialSchema.parse(data);
    
    // Sanitizar
    const sanitized = this.sanitizeData(validated);
    
    // Atualizar
    const docRef = doc(db, this.collection, profileId);
    await updateDoc(docRef, {
      ...sanitized,
      updatedAt: serverTimestamp()
    });
  }
  
  // Deletar (LGPD compliance)
  async delete(profileId: string): Promise<void> {
    const docRef = doc(db, this.collection, profileId);
    await deleteDoc(docRef);
    
    // Log para auditoria LGPD
    await this.logDeletion(profileId);
  }
  
  // Helpers privados com tipos
  private sanitizeData<T extends Record<string, unknown>>(data: T): T {
    const sanitized = { ...data };
    
    // Sanitizar strings
    if (sanitized.allergies && Array.isArray(sanitized.allergies)) {
      sanitized.allergies = sanitized.allergies.map(a => 
        DOMPurify.sanitize(a as string)
      );
    }
    
    if (sanitized.medications && Array.isArray(sanitized.medications)) {
      sanitized.medications = sanitized.medications.map(m => 
        DOMPurify.sanitize(m as string)
      );
    }
    
    return sanitized;
  }
  
  private async encryptSensitiveData<T extends Record<string, unknown>>(data: T): Promise<T> {
    const encrypted = { ...data };
    
    // Criptografar CPF (implementar com crypto real)
    if (encrypted.cpf && typeof encrypted.cpf === 'string') {
      encrypted.cpf = await this.encrypt(encrypted.cpf);
    }
    
    return encrypted;
  }
  
  private async encrypt(value: string): Promise<string> {
    // TODO: Implementar criptografia real
    return Buffer.from(value).toString('base64');
  }
  
  private async logDeletion(profileId: string): Promise<void> {
    // Log LGPD compliance
    const logRef = doc(collection(db, 'lgpd_deletions'));
    await setDoc(logRef, {
      profileId,
      deletedAt: serverTimestamp(),
      reason: 'user_request'
    });
  }
}
```

### 3. Hooks React com Type Safety (hooks/useFirebase.ts)
```typescript
import { useState, useEffect } from 'react';
import { onSnapshot, DocumentData, Query } from 'firebase/firestore';
import { z } from 'zod';

// Hook genérico com validação
export function useFirestoreQuery<T>(
  query: Query<DocumentData>,
  schema: z.ZodSchema<T>
): {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        try {
          const docs = snapshot.docs.map(doc => {
            const rawData = { id: doc.id, ...doc.data() };
            // Validar cada documento
            return schema.parse(rawData);
          });
          
          setData(docs);
          setLoading(false);
        } catch (err) {
          setError(err as Error);
          setLoading(false);
        }
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [query, schema]);
  
  return { data, loading, error };
}
```

## 🚀 Comandos de Deploy

### Desenvolvimento
```bash
# Emuladores locais
firebase emulators:start

# Deploy rules apenas
firebase deploy --only firestore:rules

# Deploy índices apenas  
firebase deploy --only firestore:indexes
```

### Staging
```bash
# Trocar para staging
firebase use staging

# Deploy com dry-run
firebase deploy --dry-run

# Deploy real
firebase deploy
```

### Produção
```bash
# Trocar para produção
firebase use production

# Validações obrigatórias
npm run type-check
npm run test
npm run lint

# Deploy com confirmação
firebase deploy --only firestore:rules --dry-run
firebase deploy --only firestore:indexes --dry-run
firebase deploy
```

## 📊 Monitoramento e Analytics

### Métricas Importantes
- **Reads por dia**: Monitorar custos
- **Writes por dia**: Otimizar batching
- **Tamanho médio do documento**: < 1MB recomendado
- **Latência de queries**: < 100ms ideal
- **Taxa de cache hit**: > 80% ideal

### Queries Otimizadas
```typescript
// ❌ Query não otimizada
const allProfiles = await getDocs(collection(db, 'medical_profiles'));

// ✅ Query otimizada com índice
const activeProfiles = await getDocs(
  query(
    collection(db, 'medical_profiles'),
    where('userId', '==', userId),
    where('active', '==', true),
    orderBy('createdAt', 'desc'),
    limit(10)
  )
);
```

## 🔒 Compliance LGPD

### Requisitos Implementados
1. **Consentimento**: Termo aceito antes de criar perfil
2. **Portabilidade**: Export de dados em JSON
3. **Exclusão**: Delete completo com log de auditoria
4. **Transparência**: Dados visíveis ao usuário
5. **Segurança**: Criptografia de dados sensíveis

### Dados Criptografados
- CPF
- Detalhes médicos sensíveis
- Histórico de pagamentos

### Dados Públicos (QR Code)
- Nome
- Tipo sanguíneo
- Alergias principais
- Contato emergência

## 📝 Checklist de Implementação

### Configuração Inicial
- [ ] Criar projeto no Firebase Console
- [ ] Configurar variáveis de ambiente
- [ ] Instalar Firebase CLI
- [ ] Inicializar projeto local
- [ ] Configurar emuladores

### Segurança
- [ ] Implementar firestore.rules
- [ ] Criar índices necessários
- [ ] Configurar storage.rules
- [ ] Testar rules com emulador
- [ ] Validar LGPD compliance

### Type Safety
- [ ] Criar schemas Zod para todas collections
- [ ] Implementar repositories tipados
- [ ] Criar hooks com validação
- [ ] ZERO uso de any
- [ ] Testes de tipo

### Deploy
- [ ] Deploy rules em staging
- [ ] Deploy índices em staging
- [ ] Testar com dados reais
- [ ] Deploy em produção
- [ ] Monitorar logs

## ⚠️ Pontos de Atenção

1. **NUNCA** commitar credenciais do Firebase
2. **SEMPRE** validar dados com Zod antes de salvar
3. **NUNCA** expor dados médicos sem autorização
4. **SEMPRE** criptografar CPF e dados sensíveis
5. **NUNCA** fazer queries sem índices em produção
6. **SEMPRE** usar transações para operações múltiplas
7. **NUNCA** usar Admin SDK no frontend

---

**IMPORTANTE**: Esta integração é crítica para a segurança e compliance do sistema. Sempre consulte o `firebase-config-agent` antes de fazer mudanças estruturais.