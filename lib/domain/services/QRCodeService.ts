import { MedicalProfile } from '../entities/MedicalProfile.js';
import { ProfileError } from '../errors/ProfileError.js';
import { IProfileRepository } from '../../infrastructure/repositories/IProfileRepository.js';

export interface QRCodeData {
  profileId: string;
  fullName: string;
  bloodType: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalInfo?: {
    allergies?: string[];
    medications?: string[];
    conditions?: string[];
    observations?: string;
  };
  subscriptionPlan: string;
  generatedAt: Date;
}

export interface IQRCodeGenerator {
  generateQR(data: string): Promise<{
    url: string;
    base64: string;
  }>;
  
  uploadQRImage(imageData: string, profileId: string): Promise<string>;
}

export interface IQRCodeService {
  generateQRCode(profileId: string): Promise<string>;
  getQRCodeData(profileId: string): Promise<QRCodeData>;
  regenerateQRCode(profileId: string): Promise<string>;
  validateQRCode(qrData: string): Promise<boolean>;
  revokeQRCode(profileId: string): Promise<void>;
}

export class QRCodeService implements IQRCodeService {
  constructor(
    private readonly profileRepository: IProfileRepository,
    private readonly qrCodeGenerator: IQRCodeGenerator
  ) {}

  async generateQRCode(profileId: string): Promise<string> {
    // Buscar perfil
    const profile = await this.profileRepository.findById(profileId);
    
    if (!profile) {
      throw ProfileError.notFound(profileId);
    }

    // Verificar se pode gerar QR Code
    if (!profile.canGenerateQRCode()) {
      throw ProfileError.paymentPending(profileId);
    }

    // Preparar dados do QR Code
    const qrData = this.prepareQRCodeData(profile);
    
    // Gerar QR Code
    const qrResult = await this.qrCodeGenerator.generateQR(JSON.stringify(qrData));
    
    // Fazer upload da imagem
    const qrCodeUrl = await this.qrCodeGenerator.uploadQRImage(qrResult.base64, profileId);
    
    // Atualizar perfil com URL do QR Code
    profile.setQRCodeUrl(qrCodeUrl);
    await this.profileRepository.update(profile);

    return qrCodeUrl;
  }

  async getQRCodeData(profileId: string): Promise<QRCodeData> {
    const profile = await this.profileRepository.findById(profileId);
    
    if (!profile) {
      throw ProfileError.notFound(profileId);
    }

    return this.prepareQRCodeData(profile);
  }

  async regenerateQRCode(profileId: string): Promise<string> {
    const profile = await this.profileRepository.findById(profileId);
    
    if (!profile) {
      throw ProfileError.notFound(profileId);
    }

    if (!profile.hasValidSubscription()) {
      throw ProfileError.subscriptionExpired(
        profileId, 
        profile.getExpiresAt() || new Date()
      );
    }

    // Revogar QR Code anterior (se existir)
    if (profile.getQRCodeUrl()) {
      await this.revokeQRCode(profileId);
    }

    // Gerar novo QR Code
    return await this.generateQRCode(profileId);
  }

  async validateQRCode(qrData: string): Promise<boolean> {
    try {
      const data: QRCodeData = JSON.parse(qrData);
      
      // Validações básicas
      if (!data.profileId || !data.fullName || !data.bloodType) {
        return false;
      }

      // Buscar perfil para validar
      const profile = await this.profileRepository.findById(data.profileId);
      
      if (!profile) {
        return false;
      }

      // Verificar se o perfil ainda é válido
      if (!profile.hasValidSubscription()) {
        return false;
      }

      // Verificar se os dados não foram alterados
      const currentData = this.prepareQRCodeData(profile);
      
      return this.compareQRCodeData(data, currentData);
      
    } catch (error) {
      console.error('Erro ao validar QR Code:', error);
      return false;
    }
  }

  async revokeQRCode(profileId: string): Promise<void> {
    const profile = await this.profileRepository.findById(profileId);
    
    if (!profile) {
      throw ProfileError.notFound(profileId);
    }

    const qrCodeUrl = profile.getQRCodeUrl();
    if (!qrCodeUrl) {
      return; // Nada a revogar
    }

    // Aqui você removeria a imagem do storage
    // await this.storageService.deleteFile(qrCodeUrl);

    // Remover URL do QR Code do perfil
    profile.setQRCodeUrl('');
    await this.profileRepository.update(profile);
  }

  // Métodos utilitários
  private prepareQRCodeData(profile: MedicalProfile): QRCodeData {
    return {
      profileId: profile.getId(),
      fullName: profile.getFullName(),
      bloodType: profile.getBloodType().getValue(),
      emergencyContact: profile.getEmergencyContact(),
      medicalInfo: profile.getMedicalInfo(),
      subscriptionPlan: profile.getSubscriptionPlan(),
      generatedAt: new Date()
    };
  }

  private compareQRCodeData(data1: QRCodeData, data2: QRCodeData): boolean {
    // Comparação básica dos dados essenciais
    return (
      data1.profileId === data2.profileId &&
      data1.fullName === data2.fullName &&
      data1.bloodType === data2.bloodType &&
      data1.emergencyContact.name === data2.emergencyContact.name &&
      data1.emergencyContact.phone === data2.emergencyContact.phone
    );
  }

  async getQRCodeStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    premium: number;
    basic: number;
  }> {
    const result = await this.profileRepository.findMany({ limit: 1000 });
    const profiles = result.profiles;

    const stats = {
      total: 0,
      active: 0,
      expired: 0,
      premium: 0,
      basic: 0
    };

    for (const profile of profiles) {
      if (profile.getQRCodeUrl()) {
        stats.total++;
        
        if (profile.hasValidSubscription()) {
          stats.active++;
        } else {
          stats.expired++;
        }

        if (profile.canAccessPremiumFeatures()) {
          stats.premium++;
        } else {
          stats.basic++;
        }
      }
    }

    return stats;
  }

  async cleanupExpiredQRCodes(): Promise<number> {
    const expiredProfiles = await this.profileRepository.findExpired();
    let cleanedCount = 0;

    for (const profile of expiredProfiles) {
      if (profile.getQRCodeUrl()) {
        await this.revokeQRCode(profile.getId());
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  async getBulkQRCodes(profileIds: string[]): Promise<Map<string, string>> {
    const qrCodes = new Map<string, string>();

    for (const profileId of profileIds) {
      try {
        const profile = await this.profileRepository.findById(profileId);
        
        if (profile && profile.canGenerateQRCode()) {
          let qrCodeUrl = profile.getQRCodeUrl();
          
          if (!qrCodeUrl) {
            qrCodeUrl = await this.generateQRCode(profileId);
          }
          
          qrCodes.set(profileId, qrCodeUrl);
        }
      } catch (error) {
        console.error(`Erro ao gerar QR Code para perfil ${profileId}:`, error);
        // Continuar com os outros perfis
      }
    }

    return qrCodes;
  }
}