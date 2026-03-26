import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';

import { User } from '../users/entities/user.entity';
import { Family } from '../families/entities/family.entity';
import { RefreshToken } from '../users/entities/refresh-token.entity';
import { UserFamilyRole } from '../users/entities/user-family-role.entity';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload, UserRole } from '../../shared/types/common.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Family)
    private readonly familyRepo: Repository<Family>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(UserFamilyRole)
    private readonly userFamilyRoleRepo: Repository<UserFamilyRole>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto): Promise<LoginResponseDto> {
    // Prüfe ob Email schon existiert
    const existingUser = await this.userRepo.findOne({
      where: { email: dto.email },
      withDeleted: false,
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Prüfe Invite Code wenn angegeben
    let family: Family | null = null;
    let role: UserRole = 'adult';

    if (dto.inviteCode) {
      family = await this.familyRepo.findOne({
        where: { inviteCode: dto.inviteCode },
      });

      if (!family) {
        throw new BadRequestException('Invalid invite code');
      }
    }

    // Passwort hashen
    const pepper = this.configService.get<string>('app.bcrypt.pepper', '');
    const rounds = this.configService.get<number>('app.bcrypt.rounds', 12);
    const passwordHash = await bcrypt.hash(dto.password + pepper, rounds);

    // User anlegen in Transaktion
    const user = await this.dataSource.transaction(async (manager) => {
      const newUser = manager.create(User, {
        email: dto.email,
        username: dto.username,
        passwordHash,
        displayName: dto.displayName ?? dto.username,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        familyId: family?.id ?? null,
        cachedRole: family ? role : null,
      });

      const savedUser = await manager.save(User, newUser);

      if (family) {
        const familyRole = manager.create(UserFamilyRole, {
          userId: savedUser.id,
          familyId: family.id,
          role,
        });
        await manager.save(UserFamilyRole, familyRole);
      }

      return savedUser;
    });

    this.logger.log(`New user registered: ${user.email}`);
    return this.generateTokens(user, role, family?.id ?? null, dto.deviceId);
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ['familyRoles'],
    });

    if (!user || !user.isActive) {
      // Timing-safe: auch bei nicht-existierendem User bcrypt ausführen
      await bcrypt.compare('dummy', '$2b$12$dummy.hash.to.prevent.timing.attacks');
      throw new UnauthorizedException('Invalid email or password');
    }

    const pepper = this.configService.get<string>('app.bcrypt.pepper', '');
    const isPasswordValid = await bcrypt.compare(dto.password + pepper, user.passwordHash);

    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt for: ${dto.email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    const familyRole = user.familyRoles?.[0];
    const role = user.cachedRole ?? familyRole?.role ?? 'adult';
    const familyId = user.familyId;

    this.logger.log(`User logged in: ${user.email}`);
    return this.generateTokens(user, role, familyId, dto.deviceId, dto.platform, dto.appVersion);
  }

  async refreshTokens(
    refreshTokenValue: string,
    deviceId?: string,
  ): Promise<LoginResponseDto> {
    const tokenHash = this.hashToken(refreshTokenValue);

    const storedToken = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
      relations: ['user', 'user.familyRoles'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Token-Reuse Detection
    if (storedToken.isRevoked) {
      this.logger.warn(
        `Refresh token reuse detected for user: ${storedToken.userId} - Revoking all tokens`,
      );
      // Alle Tokens des Users invalidieren (Kompromittierungsindiz)
      await this.revokeAllUserTokens(storedToken.userId);
      await this.userRepo.increment({ id: storedToken.userId }, 'tokenVersion', 1);
      throw new UnauthorizedException('Token reuse detected. Please login again');
    }

    if (storedToken.isExpired) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (!storedToken.user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Altes Token revoken
    await this.refreshTokenRepo.update(storedToken.id, { revokedAt: new Date() });

    const user = storedToken.user;
    const role = user.cachedRole ?? user.familyRoles?.[0]?.role ?? 'adult';

    return this.generateTokens(user, role, user.familyId, deviceId);
  }

  async logout(userId: string, refreshTokenValue: string): Promise<void> {
    const tokenHash = this.hashToken(refreshTokenValue);
    await this.refreshTokenRepo.update({ tokenHash, userId }, { revokedAt: new Date() });
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.revokeAllUserTokens(userId);
    await this.userRepo.increment({ id: userId }, 'tokenVersion', 1);
  }

  private async generateTokens(
    user: User,
    role: UserRole,
    familyId: string | null,
    deviceId?: string,
    platform?: string,
    appVersion?: string,
  ): Promise<LoginResponseDto> {
    const deviceUuid = deviceId ?? uuidv4();

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role,
      familyId: familyId ?? '',
      deviceId: deviceUuid,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = this.jwtService.sign(payload);

    // Refresh Token generieren und speichern
    const refreshTokenValue = randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(refreshTokenValue);
    const expiresAt = addDays(new Date(), 30);

    await this.refreshTokenRepo.save({
      userId: user.id,
      tokenHash,
      expiresAt,
      deviceInfo: {
        deviceId: deviceUuid,
        platform: platform ?? 'unknown',
        appVersion,
        userAgent: undefined,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 15 * 60, // 15 Minuten in Sekunden
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role,
        familyId,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { userId, revokedAt: undefined as unknown as Date },
      { revokedAt: new Date() },
    );
  }

  // Cleanup Job: Expired Tokens löschen
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.refreshTokenRepo
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now: new Date() })
      .execute();

    return result.affected ?? 0;
  }
}
