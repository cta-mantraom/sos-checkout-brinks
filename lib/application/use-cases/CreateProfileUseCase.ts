import { MedicalProfile } from '../../domain/entities/MedicalProfile.js';
import { IProfileService } from '../../domain/services/ProfileService.js';
import { CreateProfileDTO, CreateProfileData } from '../dto/CreateProfileDTO.js';

export interface CreateProfileResult {
  profile: MedicalProfile;
  success: boolean;
  message: string;
}

export class CreateProfileUseCase {
  constructor(
    private readonly profileService: IProfileService
  ) {}

  async execute(data: unknown, userId?: string): Promise<CreateProfileResult> {
    try {
      // Validar e limpar dados
      const validatedData: CreateProfileData = CreateProfileDTO.validateAndClean(data);

      // Criar perfil através do serviço
      const profile = await this.profileService.createProfile(validatedData, userId);

      return {
        profile,
        success: true,
        message: 'Perfil criado com sucesso'
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao criar perfil';
      
      throw new Error(`Falha ao criar perfil: ${message}`);
    }
  }

  async validateData(data: unknown): Promise<{ valid: boolean; errors: string[] }> {
    try {
      CreateProfileDTO.validateAndClean(data);
      return {
        valid: true,
        errors: []
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Erro de validação']
      };
    }
  }

  async checkAvailability(email: string, cpf: string): Promise<{
    emailAvailable: boolean;
    cpfAvailable: boolean;
    message: string;
  }> {
    try {
      await this.profileService.validateProfileUniqueness(email, cpf);
      
      return {
        emailAvailable: true,
        cpfAvailable: true,
        message: 'Email e CPF disponíveis'
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao verificar disponibilidade';
      
      return {
        emailAvailable: !message.toLowerCase().includes('email'),
        cpfAvailable: !message.toLowerCase().includes('cpf'),
        message
      };
    }
  }
}