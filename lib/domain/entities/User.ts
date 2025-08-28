import { Email } from '../value-objects.js';
import { ValidationError } from '../errors.js';

export type UserRole = 'user' | 'admin' | 'support';
export type UserStatus = 'active' | 'inactive' | 'pending_verification' | 'blocked';

export interface CreateUserProps {
  email: string;
  password: string;
  role?: UserRole;
}

export interface UserDTO {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  profileId?: string;
  lastLoginAt?: Date;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(
    private readonly id: string,
    private readonly email: Email,
    private passwordHash: string,
    private role: UserRole,
    private status: UserStatus,
    private profileId: string | undefined,
    private lastLoginAt: Date | undefined,
    private emailVerifiedAt: Date | undefined,
    private readonly createdAt: Date,
    private updatedAt: Date
  ) {}

  static create(props: CreateUserProps): User {
    if (!props.password || props.password.length < 8) {
      throw ValidationError.minLength('password', 8, props.password?.length || 0);
    }

    if (props.password.length > 100) {
      throw ValidationError.maxLength('password', 100, props.password.length);
    }

    // Validação de força da senha
    if (!this.isPasswordStrong(props.password)) {
      throw ValidationError.invalid(
        'password', 
        props.password, 
        'Senha deve conter pelo menos: 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial'
      );
    }

    const id = this.generateId();
    const passwordHash = this.hashPassword(props.password);

    return new User(
      id,
      Email.create(props.email),
      passwordHash,
      props.role || 'user',
      'pending_verification',
      undefined,
      undefined,
      undefined,
      new Date(),
      new Date()
    );
  }

  static fromDTO(dto: UserDTO): User {
    return new User(
      dto.id,
      Email.create(dto.email),
      dto.passwordHash,
      dto.role,
      dto.status,
      dto.profileId,
      dto.lastLoginAt,
      dto.emailVerifiedAt,
      dto.createdAt,
      dto.updatedAt
    );
  }

  private static generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private static isPasswordStrong(password: string): boolean {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  }

  private static hashPassword(password: string): string {
    // Em um ambiente real, usaríamos bcrypt ou similar
    // Aqui é apenas uma simulação
    return `hashed_${password}_${Date.now()}`;
  }

  private static verifyPassword(password: string, hash: string): boolean {
    // Em um ambiente real, usaríamos bcrypt.compare ou similar
    // Aqui é apenas uma simulação
    return hash.includes(password);
  }

  // Getters
  getId(): string {
    return this.id;
  }

  getEmail(): Email {
    return this.email;
  }

  getPasswordHash(): string {
    return this.passwordHash;
  }

  getRole(): UserRole {
    return this.role;
  }

  getStatus(): UserStatus {
    return this.status;
  }

  getProfileId(): string | undefined {
    return this.profileId;
  }

  getLastLoginAt(): Date | undefined {
    return this.lastLoginAt;
  }

  getEmailVerifiedAt(): Date | undefined {
    return this.emailVerifiedAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // Business Logic Methods
  verifyPassword(password: string): boolean {
    return User.verifyPassword(password, this.passwordHash);
  }

  changePassword(oldPassword: string, newPassword: string): void {
    if (!this.verifyPassword(oldPassword)) {
      throw ValidationError.invalid('oldPassword', oldPassword, 'Senha atual incorreta');
    }

    if (newPassword.length < 8) {
      throw ValidationError.minLength('newPassword', 8, newPassword.length);
    }

    if (!User.isPasswordStrong(newPassword)) {
      throw ValidationError.invalid(
        'newPassword', 
        newPassword, 
        'Nova senha deve conter pelo menos: 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial'
      );
    }

    this.passwordHash = User.hashPassword(newPassword);
    this.updatedAt = new Date();
  }

  updateLastLogin(): void {
    this.lastLoginAt = new Date();
    this.updatedAt = new Date();
  }

  verifyEmail(): void {
    if (this.emailVerifiedAt) {
      return; // Já verificado
    }

    this.emailVerifiedAt = new Date();
    
    if (this.status === 'pending_verification') {
      this.status = 'active';
    }
    
    this.updatedAt = new Date();
  }

  linkProfile(profileId: string): void {
    if (this.profileId) {
      throw ValidationError.invalid('profileId', profileId, 'Usuário já possui um perfil vinculado');
    }

    this.profileId = profileId;
    this.updatedAt = new Date();
  }

  unlinkProfile(): void {
    this.profileId = undefined;
    this.updatedAt = new Date();
  }

  changeRole(newRole: UserRole): void {
    if (this.role === newRole) {
      return; // Nada a fazer
    }

    this.role = newRole;
    this.updatedAt = new Date();
  }

  activate(): void {
    if (this.status === 'active') {
      return; // Já ativo
    }

    if (this.status === 'blocked') {
      throw ValidationError.invalid('status', this.status, 'Usuário bloqueado não pode ser ativado diretamente');
    }

    this.status = 'active';
    this.updatedAt = new Date();
  }

  deactivate(): void {
    if (this.status === 'inactive') {
      return; // Já inativo
    }

    this.status = 'inactive';
    this.updatedAt = new Date();
  }

  block(): void {
    this.status = 'blocked';
    this.updatedAt = new Date();
  }

  unblock(): void {
    if (this.status !== 'blocked') {
      return; // Não está bloqueado
    }

    this.status = this.emailVerifiedAt ? 'active' : 'pending_verification';
    this.updatedAt = new Date();
  }

  // Validation Methods
  isActive(): boolean {
    return this.status === 'active';
  }

  isBlocked(): boolean {
    return this.status === 'blocked';
  }

  isEmailVerified(): boolean {
    return this.emailVerifiedAt !== undefined;
  }

  hasProfile(): boolean {
    return this.profileId !== undefined;
  }

  isAdmin(): boolean {
    return this.role === 'admin';
  }

  isSupport(): boolean {
    return this.role === 'support';
  }

  canLogin(): boolean {
    return this.status === 'active' && this.isEmailVerified();
  }

  canAccessAdminFeatures(): boolean {
    return this.isActive() && this.isAdmin();
  }

  canAccessSupportFeatures(): boolean {
    return this.isActive() && (this.isAdmin() || this.isSupport());
  }

  getDaysSinceLastLogin(): number {
    if (!this.lastLoginAt) return -1;
    
    const now = new Date();
    const timeDiff = now.getTime() - this.lastLoginAt.getTime();
    return Math.floor(timeDiff / (1000 * 3600 * 24));
  }

  getDaysSinceCreation(): number {
    const now = new Date();
    const timeDiff = now.getTime() - this.createdAt.getTime();
    return Math.floor(timeDiff / (1000 * 3600 * 24));
  }

  // Serialization
  toDTO(): UserDTO {
    return {
      id: this.id,
      email: this.email.getValue(),
      passwordHash: this.passwordHash,
      role: this.role,
      status: this.status,
      profileId: this.profileId,
      lastLoginAt: this.lastLoginAt,
      emailVerifiedAt: this.emailVerifiedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Safe serialization (sem password hash)
  toSafeDTO(): Omit<UserDTO, 'passwordHash'> {
    const dto = this.toDTO();
    const { passwordHash, ...safeDto } = dto;
    return safeDto;
  }

  // Deserialization
  static fromDTO(dto: UserDTO): User {
    const email = Email.create(dto.email);
    
    return new User(
      dto.id,
      email,
      dto.passwordHash,
      dto.role,
      dto.status,
      dto.profileId,
      dto.lastLoginAt,
      dto.emailVerifiedAt,
      dto.createdAt,
      dto.updatedAt
    );
  }
}