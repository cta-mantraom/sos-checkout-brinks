# 🏗️ ARQUITETURA DDD - DOMAIN-DRIVEN DESIGN

## 📐 VISÃO GERAL DA ARQUITETURA

### Princípios Fundamentais
- **Separação de Responsabilidades** - Cada camada tem uma função específica
- **Independência de Frameworks** - Domínio não depende de tecnologias
- **Testabilidade** - Código desacoplado e testável
- **Manutenibilidade** - Estrutura clara e organizada

### Camadas da Arquitetura

```
┌─────────────────────────────────────────┐
│            PRESENTATION LAYER            │
│         (React + Vite + TypeScript)      │
├─────────────────────────────────────────┤
│             API LAYER                    │
│         (Vercel Functions)               │
├─────────────────────────────────────────┤
│          APPLICATION LAYER               │
│     (Use Cases + DTOs + Services)       │
├─────────────────────────────────────────┤
│            DOMAIN LAYER                  │
│   (Entities + Value Objects + Rules)    │
├─────────────────────────────────────────┤
│        INFRASTRUCTURE LAYER              │
│  (Firebase + MercadoPago + External)     │
└─────────────────────────────────────────┘
```

## 🎯 ESTRUTURA DE DIRETÓRIOS COMPLETA

```
/home/william/sos-checkout-brinks/
├── api/                           # API Layer - Vercel Functions
│   ├── tsconfig.json             # Config TypeScript para APIs
│   ├── mercadopago-webhook.ts    # Webhook handler
│   ├── process-payment.ts        # Processamento de pagamento
│   ├── generate-qr.ts           # Geração de QR Code
│   ├── get-profile.ts           # Buscar perfil médico
│   └── verify-payment.ts        # Verificar status pagamento
│
├── lib/                          # Core Business Logic (DDD)
│   ├── domain/                   # Domain Layer - Regras de Negócio
│   │   ├── entities/
│   │   │   ├── MedicalProfile.ts
│   │   │   ├── Payment.ts
│   │   │   ├── Subscription.ts
│   │   │   └── index.ts
│   │   ├── value-objects/
│   │   │   ├── BloodType.ts
│   │   │   ├── PhoneNumber.ts
│   │   │   ├── Email.ts
│   │   │   ├── CPF.ts
│   │   │   ├── PaymentStatus.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── PaymentService.ts
│   │   │   ├── QRCodeService.ts
│   │   │   ├── ProfileService.ts
│   │   │   └── index.ts
│   │   └── errors/
│   │       ├── DomainError.ts
│   │       ├── PaymentError.ts
│   │       └── ValidationError.ts
│   │
│   ├── infrastructure/           # Infrastructure Layer - Implementações
│   │   ├── repositories/
│   │   │   ├── FirebaseProfileRepository.ts
│   │   │   ├── FirebasePaymentRepository.ts
│   │   │   ├── IProfileRepository.ts
│   │   │   ├── IPaymentRepository.ts
│   │   │   └── index.ts
│   │   ├── mercadopago/
│   │   │   ├── MercadoPagoClient.ts
│   │   │   ├── WebhookValidator.ts
│   │   │   ├── PaymentProcessor.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── firebase/
│   │   │   ├── FirebaseConfig.ts
│   │   │   ├── FirestoreClient.ts
│   │   │   ├── StorageService.ts
│   │   │   └── index.ts
│   │   └── external/
│   │       ├── QRCodeGenerator.ts
│   │       └── DeviceFingerprint.ts
│   │
│   ├── application/              # Application Layer - Casos de Uso
│   │   ├── use-cases/
│   │   │   ├── CreateProfileUseCase.ts
│   │   │   ├── ProcessPaymentUseCase.ts
│   │   │   ├── GenerateQRCodeUseCase.ts
│   │   │   ├── GetProfileUseCase.ts
│   │   │   ├── UpdatePaymentStatusUseCase.ts
│   │   │   └── index.ts
│   │   ├── dto/
│   │   │   ├── CreateProfileDTO.ts
│   │   │   ├── PaymentDTO.ts
│   │   │   ├── WebhookDTO.ts
│   │   │   └── index.ts
│   │   └── mappers/
│   │       ├── ProfileMapper.ts
│   │       ├── PaymentMapper.ts
│   │       └── index.ts
│   │
│   └── shared/                   # Shared - Compartilhado
│       ├── types/
│       │   ├── index.ts
│       │   ├── mercadopago.ts
│       │   ├── firebase.ts
│       │   └── api.ts
│       ├── constants/
│       │   ├── prices.ts
│       │   ├── plans.ts
│       │   ├── errors.ts
│       │   └── index.ts
│       ├── validations/
│       │   ├── profileSchema.ts
│       │   ├── paymentSchema.ts
│       │   ├── webhookSchema.ts
│       │   └── index.ts
│       └── utils/
│           ├── logger.ts
│           ├── crypto.ts
│           └── formatters.ts
│
└── src/                          # Presentation Layer - Frontend
    ├── components/
    ├── pages/
    ├── hooks/
    ├── services/
    └── utils/
```

## 🔷 DOMAIN LAYER - CAMADA DE DOMÍNIO

### Entidades (Entities)

```typescript
// lib/domain/entities/MedicalProfile.ts
import { BloodType, PhoneNumber, Email } from '../value-objects';
import { PaymentStatus } from '../value-objects/PaymentStatus';

export class MedicalProfile {
  private constructor(
    private readonly id: string,
    private readonly fullName: string,
    private readonly phone: PhoneNumber,
    private readonly email: Email,
    private readonly bloodType: BloodType,
    private readonly emergencyContact: EmergencyContact,
    private qrCodeUrl?: string,
    private subscriptionPlan: SubscriptionPlan = 'basic',
    private paymentStatus: PaymentStatus = PaymentStatus.PENDING,
    private readonly createdAt: Date = new Date(),
    private updatedAt: Date = new Date()
  ) {}

  static create(props: CreateMedicalProfileProps): MedicalProfile {
    // Validações de domínio
    if (!props.fullName || props.fullName.length < 3) {
      throw new DomainError('Nome completo é obrigatório');
    }
    
    return new MedicalProfile(
      generateId(),
      props.fullName,
      PhoneNumber.create(props.phone),
      Email.create(props.email),
      BloodType.create(props.bloodType),
      props.emergencyContact,
      undefined,
      props.subscriptionPlan,
      PaymentStatus.PENDING
    );
  }

  updatePaymentStatus(status: PaymentStatus): void {
    this.paymentStatus = status;
    this.updatedAt = new Date();
  }

  setQRCodeUrl(url: string): void {
    this.qrCodeUrl = url;
    this.updatedAt = new Date();
  }

  canGenerateQRCode(): boolean {
    return this.paymentStatus === PaymentStatus.APPROVED;
  }

  toDTO(): MedicalProfileDTO {
    return {
      id: this.id,
      fullName: this.fullName,
      phone: this.phone.getValue(),
      email: this.email.getValue(),
      bloodType: this.bloodType.getValue(),
      emergencyContact: this.emergencyContact,
      qrCodeUrl: this.qrCodeUrl,
      subscriptionPlan: this.subscriptionPlan,
      paymentStatus: this.paymentStatus.getValue(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
```

### Value Objects

```typescript
// lib/domain/value-objects/BloodType.ts
export class BloodType {
  private static readonly VALID_TYPES = [
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
  ] as const;

  private constructor(private readonly value: string) {}

  static create(value: string): BloodType {
    if (!this.VALID_TYPES.includes(value as any)) {
      throw new ValidationError(`Tipo sanguíneo inválido: ${value}`);
    }
    return new BloodType(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: BloodType): boolean {
    return this.value === other.value;
  }
}
```

```typescript
// lib/domain/value-objects/PhoneNumber.ts
export class PhoneNumber {
  private static readonly REGEX = /^\(\d{2}\) \d{5}-\d{4}$/;

  private constructor(private readonly value: string) {}

  static create(value: string): PhoneNumber {
    const cleaned = value.replace(/\D/g, '');
    
    if (cleaned.length !== 11) {
      throw new ValidationError('Telefone deve ter 11 dígitos');
    }

    const formatted = this.format(cleaned);
    
    if (!this.REGEX.test(formatted)) {
      throw new ValidationError('Formato de telefone inválido');
    }

    return new PhoneNumber(formatted);
  }

  private static format(phone: string): string {
    return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
  }

  getValue(): string {
    return this.value;
  }

  getCleanValue(): string {
    return this.value.replace(/\D/g, '');
  }
}
```

### Domain Services

```typescript
// lib/domain/services/PaymentService.ts
export interface IPaymentService {
  processPayment(payment: Payment): Promise<PaymentResult>;
  validateWebhook(payload: unknown, headers: Headers): Promise<boolean>;
  updatePaymentStatus(id: string, status: PaymentStatus): Promise<void>;
  getPaymentById(id: string): Promise<Payment | null>;
}

export class PaymentService implements IPaymentService {
  constructor(
    private readonly paymentRepository: IPaymentRepository,
    private readonly mercadoPagoClient: IMercadoPagoClient
  ) {}

  async processPayment(payment: Payment): Promise<PaymentResult> {
    // Validações de domínio
    if (payment.amount < 5) {
      throw new PaymentError('Valor mínimo é R$ 5,00');
    }

    // Processar com MercadoPago
    const mpResult = await this.mercadoPagoClient.createPayment(payment);

    // Salvar no repositório
    await this.paymentRepository.save(payment);

    return {
      success: mpResult.status === 'approved',
      paymentId: mpResult.id,
      status: mpResult.status,
      detail: mpResult.status_detail
    };
  }

  async validateWebhook(
    payload: unknown, 
    headers: Headers
  ): Promise<boolean> {
    return this.mercadoPagoClient.validateWebhook(payload, headers);
  }

  async updatePaymentStatus(
    id: string, 
    status: PaymentStatus
  ): Promise<void> {
    const payment = await this.paymentRepository.findById(id);
    
    if (!payment) {
      throw new PaymentError(`Pagamento ${id} não encontrado`);
    }

    payment.updateStatus(status);
    await this.paymentRepository.update(payment);
  }
}
```

## 🔶 APPLICATION LAYER - CAMADA DE APLICAÇÃO

### Use Cases

```typescript
// lib/application/use-cases/CreateProfileUseCase.ts
import { MedicalProfile } from '../../domain/entities/MedicalProfile';
import { IProfileRepository } from '../../infrastructure/repositories/IProfileRepository';
import { CreateProfileDTO } from '../dto/CreateProfileDTO';
import { ProfileMapper } from '../mappers/ProfileMapper';

export class CreateProfileUseCase {
  constructor(
    private readonly profileRepository: IProfileRepository
  ) {}

  async execute(dto: CreateProfileDTO): Promise<MedicalProfile> {
    // Validar DTO
    const validatedDTO = CreateProfileDTO.validate(dto);

    // Criar entidade de domínio
    const profile = MedicalProfile.create(validatedDTO);

    // Salvar no repositório
    await this.profileRepository.save(profile);

    return profile;
  }
}
```

```typescript
// lib/application/use-cases/ProcessPaymentUseCase.ts
export class ProcessPaymentUseCase {
  constructor(
    private readonly paymentService: IPaymentService,
    private readonly profileRepository: IProfileRepository,
    private readonly qrCodeUseCase: GenerateQRCodeUseCase
  ) {}

  async execute(dto: PaymentDTO): Promise<PaymentResult> {
    // 1. Buscar perfil
    const profile = await this.profileRepository.findById(dto.profileId);
    if (!profile) {
      throw new ApplicationError('Perfil não encontrado');
    }

    // 2. Criar pagamento
    const payment = Payment.create({
      profileId: profile.id,
      amount: dto.amount,
      paymentMethodId: dto.paymentMethodId,
      token: dto.token
    });

    // 3. Processar pagamento
    const result = await this.paymentService.processPayment(payment);

    // 4. Atualizar status do perfil
    if (result.success) {
      profile.updatePaymentStatus(PaymentStatus.APPROVED);
      await this.profileRepository.update(profile);

      // 5. Gerar QR Code
      await this.qrCodeUseCase.execute({ profileId: profile.id });
    }

    return result;
  }
}
```

### DTOs (Data Transfer Objects)

```typescript
// lib/application/dto/CreateProfileDTO.ts
import { z } from 'zod';

const CreateProfileSchema = z.object({
  fullName: z.string().min(3).max(100),
  phone: z.string(),
  email: z.string().email(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  emergencyContact: z.object({
    name: z.string().min(3),
    phone: z.string()
  }),
  subscriptionPlan: z.enum(['basic', 'premium'])
});

export class CreateProfileDTO {
  static validate(data: unknown): CreateProfileData {
    return CreateProfileSchema.parse(data);
  }
}

export type CreateProfileData = z.infer<typeof CreateProfileSchema>;
```

## 🔸 INFRASTRUCTURE LAYER - CAMADA DE INFRAESTRUTURA

### Repositories

```typescript
// lib/infrastructure/repositories/IProfileRepository.ts
export interface IProfileRepository {
  save(profile: MedicalProfile): Promise<void>;
  findById(id: string): Promise<MedicalProfile | null>;
  findByEmail(email: string): Promise<MedicalProfile | null>;
  update(profile: MedicalProfile): Promise<void>;
  delete(id: string): Promise<void>;
}
```

```typescript
// lib/infrastructure/repositories/FirebaseProfileRepository.ts
import { Firestore } from 'firebase-admin/firestore';
import { MedicalProfile } from '../../domain/entities/MedicalProfile';
import { IProfileRepository } from './IProfileRepository';

export class FirebaseProfileRepository implements IProfileRepository {
  private readonly collection = 'medical_profiles';

  constructor(private readonly firestore: Firestore) {}

  async save(profile: MedicalProfile): Promise<void> {
    const data = profile.toDTO();
    await this.firestore
      .collection(this.collection)
      .doc(data.id)
      .set(data);
  }

  async findById(id: string): Promise<MedicalProfile | null> {
    const doc = await this.firestore
      .collection(this.collection)
      .doc(id)
      .get();

    if (!doc.exists) {
      return null;
    }

    return MedicalProfile.fromDTO(doc.data());
  }

  async update(profile: MedicalProfile): Promise<void> {
    const data = profile.toDTO();
    await this.firestore
      .collection(this.collection)
      .doc(data.id)
      .update(data);
  }
}
```

### External Services

```typescript
// lib/infrastructure/mercadopago/MercadoPagoClient.ts
import mercadopago from 'mercadopago';
import crypto from 'crypto';

export class MercadoPagoClient {
  constructor() {
    mercadopago.configure({
      access_token: process.env.MP_ACCESS_TOKEN!
    });
  }

  async createPayment(data: PaymentData): Promise<PaymentResponse> {
    const payment = await mercadopago.payment.create({
      transaction_amount: data.amount,
      payment_method_id: data.paymentMethodId,
      token: data.token,
      installments: data.installments || 1,
      payer: {
        email: data.email,
        identification: data.identification
      },
      metadata: {
        profile_id: data.profileId
      }
    });

    return {
      id: payment.body.id,
      status: payment.body.status,
      status_detail: payment.body.status_detail,
      pix_qr_code: payment.body.point_of_interaction?.transaction_data?.qr_code,
      pix_qr_code_base64: payment.body.point_of_interaction?.transaction_data?.qr_code_base64
    };
  }

  validateWebhook(payload: any, headers: any): boolean {
    const xSignature = headers['x-signature'];
    const xRequestId = headers['x-request-id'];

    if (!xSignature || !xRequestId) {
      return false;
    }

    const [ts, hash] = xSignature.split(',')
      .map((part: string) => part.split('=')[1]);

    const manifest = `id:${payload.data.id};request-id:${xRequestId};ts:${ts};`;

    const calculatedHash = crypto
      .createHmac('sha256', process.env.MP_WEBHOOK_SECRET!)
      .update(manifest)
      .digest('hex');

    return calculatedHash === hash;
  }
}
```

## 🔹 API LAYER - CAMADA DE API

### Vercel Functions

```typescript
// api/process-payment.ts
import { NextRequest, NextResponse } from 'next/server';
import { container } from '../lib/infrastructure/container';
import { ProcessPaymentUseCase } from '../lib/application/use-cases/ProcessPaymentUseCase';
import { PaymentDTO } from '../lib/application/dto/PaymentDTO';

export default async function handler(req: NextRequest) {
  try {
    // Validar método
    if (req.method !== 'POST') {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      );
    }

    // Parsear body
    const body = await req.json();

    // Validar DTO
    const dto = PaymentDTO.validate(body);

    // Executar caso de uso
    const useCase = container.get<ProcessPaymentUseCase>(
      ProcessPaymentUseCase
    );
    const result = await useCase.execute(dto);

    // Retornar resposta
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    // Log do erro
    console.error('Payment processing error:', error);

    // Retornar erro apropriado
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (error instanceof PaymentError) {
      return NextResponse.json(
        { error: error.message },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 🔥 DEPENDENCY INJECTION

```typescript
// lib/infrastructure/container.ts
import { Container } from 'inversify';

// Domain Services
import { PaymentService } from '../domain/services/PaymentService';
import { QRCodeService } from '../domain/services/QRCodeService';

// Infrastructure
import { FirebaseProfileRepository } from './repositories/FirebaseProfileRepository';
import { MercadoPagoClient } from './mercadopago/MercadoPagoClient';
import { FirestoreClient } from './firebase/FirestoreClient';

// Application
import { CreateProfileUseCase } from '../application/use-cases/CreateProfileUseCase';
import { ProcessPaymentUseCase } from '../application/use-cases/ProcessPaymentUseCase';

const container = new Container();

// Bind Infrastructure
container.bind(FirestoreClient).toSelf().inSingletonScope();
container.bind(MercadoPagoClient).toSelf().inSingletonScope();
container.bind(FirebaseProfileRepository).toSelf();

// Bind Domain Services
container.bind(PaymentService).toSelf();
container.bind(QRCodeService).toSelf();

// Bind Use Cases
container.bind(CreateProfileUseCase).toSelf();
container.bind(ProcessPaymentUseCase).toSelf();

export { container };
```

## 📋 REGRAS E CONVENÇÕES

### Naming Conventions
- **Entities:** PascalCase singular (MedicalProfile, Payment)
- **Value Objects:** PascalCase (BloodType, PhoneNumber)
- **Use Cases:** PascalCase + UseCase suffix (CreateProfileUseCase)
- **Repositories:** PascalCase + Repository suffix (FirebaseProfileRepository)
- **DTOs:** PascalCase + DTO suffix (PaymentDTO)
- **Interfaces:** I prefix + PascalCase (IProfileRepository)

### TypeScript Rules
- **NUNCA** usar `any` - sempre use `unknown` com validação
- **SEMPRE** definir tipos explícitos
- **SEMPRE** validar dados externos com Zod
- **strict mode** sempre ativado

### Error Handling
- Criar classes de erro específicas por camada
- Propagar erros através das camadas
- Log estruturado em todas as exceções
- Retornar erros apropriados nas APIs

### Testing Strategy
- **Unit Tests:** Domain layer (100% coverage)
- **Integration Tests:** Infrastructure layer
- **E2E Tests:** API layer + Frontend flows

## 🎯 BENEFÍCIOS DA ARQUITETURA DDD

1. **Manutenibilidade**
   - Código organizado e previsível
   - Fácil localização de funcionalidades
   - Mudanças isoladas por camada

2. **Testabilidade**
   - Domain layer 100% testável
   - Mocks fáceis com interfaces
   - Testes isolados por camada

3. **Escalabilidade**
   - Fácil adicionar novos casos de uso
   - Mudança de infraestrutura sem afetar domínio
   - Deploy independente por serviço

4. **Colaboração**
   - Estrutura clara para toda equipe
   - Responsabilidades bem definidas
   - Documentação através do código

Esta arquitetura DDD garante um sistema robusto, manutenível e escalável, seguindo as melhores práticas de desenvolvimento de software.