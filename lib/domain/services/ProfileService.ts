import { MedicalProfile, CreateMedicalProfileProps } from '../entities/MedicalProfile.js';
import { Subscription } from '../entities/Subscription.js';
import { ProfileError } from '../errors/ProfileError.js';
import { ValidationError } from '../errors/ValidationError.js';
import { IProfileRepository } from '../../infrastructure/repositories/IProfileRepository.js';
import { IUserRepository } from '../../infrastructure/repositories/IUserRepository.js';
import { ISubscriptionRepository } from '../../infrastructure/repositories/ISubscriptionRepository.js';

export interface IProfileService {
  createProfile(props: CreateMedicalProfileProps, userId?: string): Promise<MedicalProfile>;
  getProfileById(id: string): Promise<MedicalProfile | null>;
  getProfileByEmail(email: string): Promise<MedicalProfile | null>;
  updateProfile(id: string, updates: Partial<CreateMedicalProfileProps>): Promise<MedicalProfile>;
  deactivateProfile(id: string): Promise<void>;
  linkUserToProfile(userId: string, profileId: string): Promise<void>;
  validateProfileUniqueness(email: string, cpf: string, excludeId?: string): Promise<void>;
}

export class ProfileService implements IProfileService {
  constructor(
    private readonly profileRepository: IProfileRepository,
    private readonly userRepository: IUserRepository,
    private readonly subscriptionRepository: ISubscriptionRepository
  ) {}

  async createProfile(props: CreateMedicalProfileProps, userId?: string): Promise<MedicalProfile> {
    // Validar unicidade
    await this.validateProfileUniqueness(props.email, props.cpf);

    // Criar perfil
    const profile = MedicalProfile.create(props);

    // Salvar perfil
    await this.profileRepository.save(profile);

    // Criar assinatura
    const subscription = Subscription.create({
      profileId: profile.getId(),
      plan: props.subscriptionPlan || 'basic'
    });
    await this.subscriptionRepository.save(subscription);

    // Vincular usuário se fornecido
    if (userId) {
      await this.linkUserToProfile(userId, profile.getId());
    }

    return profile;
  }

  async getProfileById(id: string): Promise<MedicalProfile | null> {
    return await this.profileRepository.findById(id);
  }

  async getProfileByEmail(email: string): Promise<MedicalProfile | null> {
    return await this.profileRepository.findByEmail(email);
  }

  async updateProfile(id: string, updates: Partial<CreateMedicalProfileProps>): Promise<MedicalProfile> {
    const profile = await this.profileRepository.findById(id);
    
    if (!profile) {
      throw ProfileError.notFound(id);
    }

    // Validar unicidade para email e CPF se estão sendo alterados
    if (updates.email && updates.email !== profile.getEmail().getValue()) {
      await this.validateProfileUniqueness(updates.email, profile.getCPF().getValue(), id);
    }

    if (updates.cpf && updates.cpf !== profile.getCPF().getValue()) {
      await this.validateProfileUniqueness(profile.getEmail().getValue(), updates.cpf, id);
    }

    // Criar novo perfil com dados atualizados
    const currentData = profile.toDTO();
    const updatedData: CreateMedicalProfileProps = {
      fullName: updates.fullName || currentData.fullName,
      cpf: updates.cpf || currentData.cpf,
      phone: updates.phone || currentData.phone,
      email: updates.email || currentData.email,
      bloodType: updates.bloodType || currentData.bloodType,
      emergencyContact: updates.emergencyContact || currentData.emergencyContact,
      medicalInfo: updates.medicalInfo || currentData.medicalInfo,
      subscriptionPlan: updates.subscriptionPlan || currentData.subscriptionPlan
    };

    const newProfile = MedicalProfile.create(updatedData);
    
    // Preservar dados que não podem ser alterados via update
    newProfile.updatePaymentStatus(profile.getPaymentStatus());
    const qrCodeUrl = profile.getQRCodeUrl();
    if (qrCodeUrl) {
      newProfile.setQRCodeUrl(qrCodeUrl);
    }

    await this.profileRepository.update(newProfile);

    return newProfile;
  }

  async deactivateProfile(id: string): Promise<void> {
    const profile = await this.profileRepository.findById(id);
    
    if (!profile) {
      throw ProfileError.notFound(id);
    }

    profile.deactivate();
    await this.profileRepository.update(profile);

    // Cancelar assinatura
    const subscription = await this.subscriptionRepository.findByProfileId(id);
    if (subscription) {
      subscription.cancel();
      await this.subscriptionRepository.update(subscription);
    }
  }

  async linkUserToProfile(userId: string, profileId: string): Promise<void> {
    const [user, profile] = await Promise.all([
      this.userRepository.findById(userId),
      this.profileRepository.findById(profileId)
    ]);

    if (!user) {
      throw ValidationError.invalid('userId', userId, 'Usuário não encontrado');
    }

    if (!profile) {
      throw ProfileError.notFound(profileId);
    }

    if (user.hasProfile()) {
      throw ValidationError.invalid('userId', userId, 'Usuário já possui um perfil vinculado');
    }

    user.linkProfile(profileId);
    await this.userRepository.update(user);
  }

  async validateProfileUniqueness(email: string, cpf: string, excludeId?: string): Promise<void> {
    const [existingByEmail, existingByCPF] = await Promise.all([
      this.profileRepository.findByEmail(email),
      this.profileRepository.findByCPF(cpf)
    ]);

    if (existingByEmail && existingByEmail.getId() !== excludeId) {
      throw ProfileError.alreadyExists(email);
    }

    if (existingByCPF && existingByCPF.getId() !== excludeId) {
      throw ValidationError.invalid('cpf', cpf, 'CPF já cadastrado');
    }
  }

  async getProfileStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    basic: number;
    premium: number;
    pendingPayment: number;
    expired: number;
  }> {
    const result = await this.profileRepository.findMany({ limit: 1000 });
    const profiles = result.profiles;

    const stats = {
      total: profiles.length,
      active: 0,
      inactive: 0,
      basic: 0,
      premium: 0,
      pendingPayment: 0,
      expired: 0
    };

    for (const profile of profiles) {
      if (profile.getIsActive()) {
        stats.active++;
      } else {
        stats.inactive++;
      }

      if (profile.getSubscriptionPlan() === 'basic') {
        stats.basic++;
      } else {
        stats.premium++;
      }

      if (profile.getPaymentStatus().isPending()) {
        stats.pendingPayment++;
      }

      if (profile.isSubscriptionExpired()) {
        stats.expired++;
      }
    }

    return stats;
  }

  async getProfilesByStatus(status: string, page: number = 1, limit: number = 10): Promise<{
    profiles: MedicalProfile[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return await this.profileRepository.findMany({
      page,
      limit,
      status
    });
  }

  async getExpiredProfiles(): Promise<MedicalProfile[]> {
    return await this.profileRepository.findExpired();
  }

  async renewProfile(id: string, paymentId?: string): Promise<void> {
    const profile = await this.profileRepository.findById(id);
    
    if (!profile) {
      throw ProfileError.notFound(id);
    }

    // Renovar assinatura
    const subscription = await this.subscriptionRepository.findByProfileId(id);
    if (subscription) {
      subscription.renew(paymentId);
      await this.subscriptionRepository.update(subscription);
    }

    // Atualizar data de expiração do perfil
    profile.renewSubscription();
    await this.profileRepository.update(profile);
  }

  async upgradeProfile(id: string, newPlan: 'basic' | 'premium'): Promise<void> {
    const profile = await this.profileRepository.findById(id);
    
    if (!profile) {
      throw ProfileError.notFound(id);
    }

    profile.upgradePlan(newPlan);
    await this.profileRepository.update(profile);

    // Atualizar assinatura
    const subscription = await this.subscriptionRepository.findByProfileId(id);
    if (subscription) {
      // Criar nova assinatura com o novo plano
      const newSubscription = Subscription.create({
        profileId: id,
        plan: newPlan
      });
      
      // Cancelar assinatura antiga
      subscription.cancel();
      
      await Promise.all([
        this.subscriptionRepository.update(subscription),
        this.subscriptionRepository.save(newSubscription)
      ]);
    }
  }

  async searchProfiles(query: string, page: number = 1, limit: number = 10): Promise<{
    profiles: MedicalProfile[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Em um cenário real, você implementaria busca full-text
    // Por simplicidade, vamos buscar por nome ou email
    const allProfiles = await this.profileRepository.findMany({ limit: 1000 });
    
    const filteredProfiles = allProfiles.profiles.filter(profile => 
      profile.getFullName().toLowerCase().includes(query.toLowerCase()) ||
      profile.getEmail().getValue().toLowerCase().includes(query.toLowerCase())
    );

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProfiles = filteredProfiles.slice(startIndex, endIndex);

    return {
      profiles: paginatedProfiles,
      total: filteredProfiles.length,
      page,
      totalPages: Math.ceil(filteredProfiles.length / limit)
    };
  }

  async bulkDeactivateProfiles(profileIds: string[]): Promise<number> {
    let deactivatedCount = 0;

    for (const profileId of profileIds) {
      try {
        await this.deactivateProfile(profileId);
        deactivatedCount++;
      } catch (error) {
        console.error(`Erro ao desativar perfil ${profileId}:`, error);
        // Continuar com os outros perfis
      }
    }

    return deactivatedCount;
  }
}