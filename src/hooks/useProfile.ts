import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MedicalFormData } from '@/schemas/medicalForm';
import { transformToBackendFormat, BackendProfileData } from '@/schemas/profileTransform';

interface Profile {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  birthDate: string;
  bloodType: string;
  weight: number;
  height: number;
  allergies: string[];
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
  medicalConditions: string[];
  emergencyContacts: Array<{
    name: string;
    relationship: string;
    phone: string;
  }>;
  doctor?: {
    name?: string;
    phone?: string;
    specialty?: string;
  };
  healthInsurance?: {
    company?: string;
    plan?: string;
    cardNumber?: string;
  };
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

async function createProfile(data: MedicalFormData, subscriptionPlan: 'basic' | 'premium' = 'basic'): Promise<Profile> {
  // Transformar dados do frontend para o formato esperado pelo backend
  const backendData: BackendProfileData = transformToBackendFormat(data, subscriptionPlan);
  
  const response = await fetch('/api/create-profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(backendData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || errorData.error || 'Erro ao criar perfil');
  }

  const result = await response.json();
  
  // Extrair dados do perfil da resposta
  const profileData = result.data?.profile || result;
  
  // Mapear resposta do backend para o formato do frontend
  return {
    id: profileData.id,
    name: profileData.fullName || profileData.name || data.name,
    email: profileData.email,
    cpf: data.cpf, // Manter formatado
    phone: data.phone, // Manter formatado
    birthDate: data.birthDate,
    bloodType: profileData.bloodType || data.bloodType,
    weight: data.weight,
    height: data.height,
    allergies: data.allergies,
    // Garantir que medications tem todas as propriedades obrigatórias
    medications: data.medications.map(med => ({
      name: med.name || '',
      dosage: med.dosage || '',
      frequency: med.frequency || ''
    })),
    medicalConditions: data.medicalConditions,
    // Garantir que emergencyContacts tem todas as propriedades obrigatórias
    emergencyContacts: data.emergencyContacts.map(contact => ({
      name: contact.name || '',
      relationship: contact.relationship || '',
      phone: contact.phone || ''
    })),
    doctor: data.doctor,
    healthInsurance: data.healthInsurance,
    observations: data.observations,
    createdAt: profileData.createdAt || new Date().toISOString(),
    updatedAt: profileData.updatedAt || new Date().toISOString(),
  };
}

async function getProfile(id: string): Promise<Profile> {
  const response = await fetch(`/api/get-profile?id=${id}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao buscar perfil');
  }

  return response.json();
}

async function updateProfile(id: string, data: Partial<MedicalFormData>): Promise<Profile> {
  const response = await fetch(`/api/update-profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, ...data }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao atualizar perfil');
  }

  return response.json();
}

export function useProfile(profileId?: string) {
  return useQuery({
    queryKey: ['profile', profileId],
    queryFn: () => getProfile(profileId!),
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 3,
  });
}

export function useCreateProfile(subscriptionPlan: 'basic' | 'premium' = 'basic') {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: MedicalFormData) => createProfile(data, subscriptionPlan),
    onSuccess: (data) => {
      // Adiciona o perfil ao cache
      queryClient.setQueryData(['profile', data.id], data);
      // Invalida queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
    onError: (error) => {
      console.error('Erro ao criar perfil:', error);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MedicalFormData> }) =>
      updateProfile(id, data),
    onSuccess: (data) => {
      // Atualiza o perfil no cache
      queryClient.setQueryData(['profile', data.id], data);
      // Invalida queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['profile', data.id] });
    },
    onError: (error) => {
      console.error('Erro ao atualizar perfil:', error);
    },
  });
}

// Hook para gerenciar estado local do perfil durante edição
export function useProfileForm(initialData?: Profile) {
  const queryClient = useQueryClient();
  
  const optimisticUpdate = (data: Partial<Profile>) => {
    if (initialData?.id) {
      queryClient.setQueryData(['profile', initialData.id], (old: Profile | undefined) => ({
        ...old,
        ...data,
        updatedAt: new Date().toISOString(),
      } as Profile));
    }
  };

  return {
    optimisticUpdate,
    rollback: (profileId: string) => {
      queryClient.invalidateQueries({ queryKey: ['profile', profileId] });
    },
  };
}