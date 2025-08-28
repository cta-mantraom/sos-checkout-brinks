// Example data and configurations for the SOS Checkout application
// This file contains sample data that can be used for development and testing

import { MedicalFormData } from '@/schemas/medicalForm';
import { SubscriptionType } from '@/schemas/payment';

// Sample medical form data for testing
export const sampleMedicalData: MedicalFormData = {
  // Dados Pessoais
  name: 'João Silva Santos',
  cpf: '123.456.789-01',
  email: 'joao.silva@email.com',
  phone: '(11) 99999-9999',
  birthDate: '1985-06-15',
  
  // Informações Médicas
  bloodType: 'O+',
  weight: 75,
  height: 175,
  
  // Alergias
  hasAllergies: true,
  allergies: [
    'Penicilina',
    'Frutos do mar',
    'Pólen'
  ],
  
  // Medicações
  hasMedications: true,
  medications: [
    {
      name: 'Losartana',
      dosage: '50mg',
      frequency: '1x ao dia pela manhã'
    },
    {
      name: 'Sinvastatina',
      dosage: '20mg',
      frequency: '1x ao dia à noite'
    }
  ],
  
  // Condições Médicas
  hasMedicalConditions: true,
  medicalConditions: [
    'Hipertensão arterial',
    'Colesterol alto',
    'Diabetes tipo 2'
  ],
  
  // Contatos de Emergência
  emergencyContacts: [
    {
      name: 'Maria Silva Santos',
      relationship: 'Esposa',
      phone: '(11) 88888-8888'
    },
    {
      name: 'Pedro Santos',
      relationship: 'Filho',
      phone: '(11) 77777-7777'
    }
  ],
  
  // Informações do Médico
  doctor: {
    name: 'Dr. Carlos Oliveira',
    specialty: 'Cardiologia',
    phone: '(11) 3333-4444'
  },
  
  // Convênio
  healthInsurance: {
    company: 'Unimed',
    plan: 'Premium',
    cardNumber: '123456789012345'
  },
  
  // Observações
  observations: 'Paciente com histórico familiar de problemas cardíacos. Recomendado monitoramento regular da pressão arterial. Alergia severa à penicilina - utilizar alternativas como amoxicilina.'
};

// Sample data for minimal profile (basic information only)
export const sampleMinimalData: Partial<MedicalFormData> = {
  name: 'Ana Costa',
  cpf: '987.654.321-09',
  email: 'ana.costa@email.com',
  phone: '(11) 99887-7665',
  birthDate: '1992-03-20',
  bloodType: 'A+',
  weight: 60,
  height: 165,
  hasAllergies: false,
  allergies: [],
  hasMedications: false,
  medications: [],
  hasMedicalConditions: false,
  medicalConditions: [],
  emergencyContacts: [
    {
      name: 'Roberto Costa',
      relationship: 'Pai',
      phone: '(11) 99776-6554'
    }
  ]
};

// Sample QR Code data
export const sampleQRCodeData = {
  profileId: 'profile_123456',
  qrCode: 'https://sos-checkout.com/profile/abc123def456',
  shortUrl: 'https://sos.co/p/xyz789',
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  createdAt: new Date().toISOString()
};

// Sample payment data
export const samplePaymentData = {
  id: 'payment_789123',
  status: 'approved' as const,
  externalId: 'mp_payment_456789',
  amount: 19.90,
  installments: 1,
  paymentMethod: 'pix',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
};

// Sample subscription configurations
export const sampleSubscriptions: Record<SubscriptionType, {
  name: string;
  price: number;
  duration: number;
  features: string[];
  popular?: boolean;
}> = {
  basic: {
    name: 'Plano Básico',
    price: 19.90,
    duration: 30,
    features: [
      'Perfil médico completo',
      'QR Code personalizado',
      'Acesso móvel 24/7',
      'Contatos de emergência',
      'Suporte por email'
    ]
  },
  premium: {
    name: 'Plano Premium',
    price: 199.90,
    duration: 365,
    features: [
      'Tudo do plano Básico',
      'Validade de 1 ano completo',
      'Backup automático',
      'Histórico de acessos',
      'Suporte prioritário 24/7',
      'Múltiplos QR Codes'
    ],
    popular: true
  }
};

// Sample medical specialties for autocomplete
export const medicalSpecialties = [
  'Cardiologia',
  'Dermatologia',
  'Endocrinologia',
  'Gastroenterologia',
  'Ginecologia',
  'Neurologia',
  'Oftalmologia',
  'Ortopedia',
  'Pediatria',
  'Pneumologia',
  'Psiquiatria',
  'Reumatologia',
  'Urologia',
  'Clínica Geral',
  'Medicina de Emergência'
];

// Sample health insurance companies
export const healthInsuranceCompanies = [
  'Unimed',
  'Bradesco Saúde',
  'SulAmérica',
  'Amil',
  'NotreDame Intermédica',
  'Hapvida',
  'São Francisco Saúde',
  'Medial Saúde',
  'Prevent Senior',
  'Golden Cross'
];

// Sample common medications for autocomplete
export const commonMedications = [
  'Losartana',
  'Sinvastatina',
  'Metformina',
  'Omeprazol',
  'Dipirona',
  'Paracetamol',
  'Ibuprofeno',
  'Amoxicilina',
  'Captopril',
  'Hidroclorotiazida',
  'Atenolol',
  'Prednisona',
  'Insulina',
  'Levotiroxina',
  'Diazepam'
];

// Sample common allergies for autocomplete
export const commonAllergies = [
  'Penicilina',
  'Sulfa',
  'Aspirina',
  'Frutos do mar',
  'Amendoim',
  'Leite',
  'Ovo',
  'Soja',
  'Pólen',
  'Ácaros',
  'Látex',
  'Iodo',
  'Corantes',
  'Conservantes'
];

// Sample common medical conditions for autocomplete
export const commonMedicalConditions = [
  'Hipertensão arterial',
  'Diabetes tipo 1',
  'Diabetes tipo 2',
  'Colesterol alto',
  'Asma',
  'Epilepsia',
  'Depressão',
  'Ansiedade',
  'Artrite',
  'Osteoporose',
  'Hipotireoidismo',
  'Hipertireoidismo',
  'Fibromialgia',
  'Enxaqueca',
  'Refluxo gastroesofágico'
];

// Sample emergency contact relationships
export const emergencyContactRelationships = [
  'Cônjuge',
  'Pai',
  'Mãe',
  'Filho',
  'Filha',
  'Irmão',
  'Irmã',
  'Avô',
  'Avó',
  'Tio',
  'Tia',
  'Primo',
  'Prima',
  'Amigo',
  'Amiga',
  'Vizinho',
  'Vizinha',
  'Colega de Trabalho',
  'Outro'
];

// Sample dosage formats for validation examples
export const sampleDosages = [
  '5mg',
  '10ml',
  '1 comprimido',
  '2 cápsulas',
  '1/2 comprimido',
  '2.5mg',
  '10UI',
  '1 ampola',
  '2 gotas',
  '1 sachê'
];

// Sample frequency patterns for validation examples
export const sampleFrequencies = [
  '1x ao dia',
  '2x ao dia',
  '3x ao dia',
  'de 8 em 8 horas',
  'de 12 em 12 horas',
  'quando necessário',
  'antes das refeições',
  'após as refeições',
  'pela manhã',
  'à noite',
  '1x por semana'
];

// Configuration for demo mode
export const demoConfig = {
  enableDemoData: import.meta.env.DEV,
  showSampleDataButton: import.meta.env.DEV,
  autoFillForms: false,
  skipPayment: false,
  generateQRImmediately: true
};

// Development utilities
export const devUtils = {
  // Fill form with sample data
  fillWithSampleData: () => sampleMedicalData,
  
  // Fill form with minimal data
  fillWithMinimalData: () => sampleMinimalData,
  
  // Generate random test data
  generateRandomTestData: (): Partial<MedicalFormData> => ({
    name: `Teste ${Math.random().toString(36).substr(2, 9)}`,
    email: `teste${Math.floor(Math.random() * 1000)}@example.com`,
    cpf: '123.456.789-01', // Fixed test CPF
    phone: `(11) ${Math.floor(Math.random() * 90000 + 10000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
    birthDate: '1990-01-01',
    bloodType: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'][Math.floor(Math.random() * 8)] as any,
    weight: Math.floor(Math.random() * 80 + 50),
    height: Math.floor(Math.random() * 40 + 160),
    hasAllergies: false,
    allergies: [],
    hasMedications: false,
    medications: [],
    hasMedicalConditions: false,
    medicalConditions: [],
    emergencyContacts: [
      {
        name: 'Contato de Emergência',
        relationship: 'Familiar',
        phone: '(11) 99999-9999'
      }
    ]
  })
};