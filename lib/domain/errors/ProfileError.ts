import { DomainError } from './DomainError.js';

export class ProfileError extends DomainError {
  constructor(
    message: string,
    profileId?: string,
    reason?: string,
    context?: Record<string, unknown>
  ) {
    const errorContext = {
      ...context,
      ...(profileId && { profileId }),
      ...(reason && { reason })
    };

    super(message, 'PROFILE_ERROR', errorContext);
  }

  static notFound(identifier: string): ProfileError {
    return new ProfileError(
      `Perfil não encontrado: ${identifier}`,
      identifier,
      'NOT_FOUND'
    );
  }

  static alreadyExists(email: string): ProfileError {
    return new ProfileError(
      `Já existe um perfil cadastrado com este email: ${email}`,
      undefined,
      'ALREADY_EXISTS',
      { email }
    );
  }

  static qrCodeNotGenerated(profileId: string): ProfileError {
    return new ProfileError(
      'QR Code ainda não foi gerado para este perfil',
      profileId,
      'QR_CODE_NOT_GENERATED'
    );
  }

  static subscriptionExpired(profileId: string, expirationDate: Date): ProfileError {
    return new ProfileError(
      `Assinatura expirada em ${expirationDate.toLocaleDateString('pt-BR')}`,
      profileId,
      'SUBSCRIPTION_EXPIRED',
      { expirationDate }
    );
  }

  static paymentPending(profileId: string): ProfileError {
    return new ProfileError(
      'Pagamento pendente. Complete o pagamento para ativar o perfil',
      profileId,
      'PAYMENT_PENDING'
    );
  }

  static updateFailed(profileId: string, field: string, reason: string): ProfileError {
    return new ProfileError(
      `Falha ao atualizar campo ${field}: ${reason}`,
      profileId,
      'UPDATE_FAILED',
      { field, reason }
    );
  }

  static invalidEmergencyContact(profileId: string): ProfileError {
    return new ProfileError(
      'Contato de emergência inválido ou não informado',
      profileId,
      'INVALID_EMERGENCY_CONTACT'
    );
  }
}