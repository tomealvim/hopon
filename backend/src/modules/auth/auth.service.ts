import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import type { Profile } from 'passport-google-oauth20';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import * as bcrypt from 'bcrypt';
import { randomUUID, randomInt } from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
    private storageService: StorageService,
  ) {}

  async register(dto: RegisterDto, userAgent?: string, ip?: string) {
    try {
      // Verificar se email já existe
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email já registado');
      }

      // Verificar telefone se fornecido
      if (dto.phone) {
        const existingPhone = await this.prisma.user.findUnique({
          where: { phone: dto.phone },
        });
        if (existingPhone) {
          throw new ConflictException('Telefone já registado');
        }
      }

      // Hash password
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(dto.password, salt);

      // Criar user e profile numa transação
      // Garantir que phone seja null se não fornecido (não undefined)
      const userData: any = {
        email: dto.email,
        passwordHash,
        profile: {
          create: {
            name: dto.name,
          },
        },
      };
      
      // Só incluir phone se fornecido
      if (dto.phone) {
        userData.phone = dto.phone;
      }

      const user = await this.prisma.user.create({
        data: userData,
        include: {
          profile: true,
          vehicles: true,
        },
      });

      return this.generateTokens(user, userAgent, ip);
    } catch (error) {
      // Se já for uma exceção HTTP do NestJS, re-lançar
      if (error instanceof ConflictException) {
        throw error;
      }
      // Log do erro para debug
      console.error('[AuthService] Erro no registo:', error);
      // Re-lançar como erro genérico se não for uma exceção conhecida
      throw error;
    }
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
        include: { profile: true, vehicles: true },
      });

      if (!user || !user.passwordHash) {
        throw new UnauthorizedException('Credenciais inválidas');
      }

      const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Credenciais inválidas');
      }

      return this.generateTokens(user, userAgent, ip);
    } catch (error) {
      // Se já for uma exceção HTTP do NestJS, re-lançar
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Log do erro para debug
      console.error('[AuthService] Erro no login:', error);
      // Re-lançar como erro genérico se não for uma exceção conhecida
      throw error;
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, vehicles: true },
    });

    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado');
    }

    const base = this.buildUserResponse(user);

    // Calcular fiabilidade como condutor (últimos 30 dias)
    const since = new Date(Date.now() - 30 * 24 * 3_600_000);
    const [completedRides, cancelledRides] = await Promise.all([
      this.prisma.ride.count({ where: { driverId: userId, status: 'COMPLETED', departureTime: { gte: since } } }),
      this.prisma.ride.count({ where: { driverId: userId, status: 'CANCELLED', cancelledAt: { gte: since } } }),
    ]);
    const totalDriverRides = completedRides + cancelledRides;
    const reliabilityScore = totalDriverRides >= 3 ? Math.round((completedRides / totalDriverRides) * 100) : null;
    const reliabilityLabel = reliabilityScore === null ? 'Novo condutor'
      : reliabilityScore >= 98 ? 'Excelente'
      : reliabilityScore >= 90 ? 'Bom'
      : reliabilityScore >= 75 ? 'Regular' : 'Baixo';

    return {
      ...base,
      reliability: { score: reliabilityScore, label: reliabilityLabel, totalRides: totalDriverRides, cancelledRides },
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Validar telefone se fornecido
    if (dto.phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: {
          phone: dto.phone,
          NOT: { id: userId },
        },
      });

      if (existingPhone) {
        throw new ConflictException('Telefone já registado por outro utilizador');
      }
    }

    const profileData: Prisma.ProfileUpdateInput = {};
    if (dto.name !== undefined) profileData.name = dto.name;
    if (dto.username !== undefined) profileData.username = dto.username;
    if (dto.avatarUrl !== undefined) profileData.avatarUrl = dto.avatarUrl;
    if (dto.bio !== undefined) profileData.bio = dto.bio;
    if (dto.contactEmail !== undefined) profileData.contactEmail = dto.contactEmail;
    if (dto.schedule !== undefined) profileData.schedule = dto.schedule;
    if (dto.setupCompleted === true) profileData.setupCompleted = true;
    if (dto.homeAddress !== undefined) profileData.homeAddress = dto.homeAddress;
    if (dto.homeLat !== undefined) profileData.homeLat = dto.homeLat;
    if (dto.homeLng !== undefined) profileData.homeLng = dto.homeLng;

    const hasProfileUpdate = Object.keys(profileData).length > 0;
    const hasUserUpdates = dto.phone !== undefined;

    if (!hasUserUpdates && !hasProfileUpdate) {
      return this.getMe(userId);
    }

    const userData: Prisma.UserUpdateInput = {};
    if (hasUserUpdates) {
      userData.phone = dto.phone;
    }
    if (hasProfileUpdate) {
      userData.profile = { update: profileData };
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: userData,
      include: { profile: true, vehicles: true },
    });

    return this.buildUserResponse(user);
  }

  async refresh(dto: RefreshDto, userAgent?: string, ip?: string) {
    // Validar token
    let payload: { sub: string; email: string; jti?: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
    
    if (!payload.jti) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Buscar token específico pelo tokenId (jti)
    const validToken = await this.prisma.refreshToken.findUnique({
      where: { tokenId: payload.jti },
    });
    // eslint-disable-next-line no-console
    console.log('[AuthService] Refresh lookup', payload.jti, '=>', validToken ? 'found' : 'not found');

    if (
      !validToken ||
      validToken.userId !== payload.sub ||
      validToken.revoked ||
      validToken.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    // Buscar user
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { profile: true, vehicles: true },
    });

    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado');
    }

    // Revogar token antigo (token rotation - mais seguro)
    await this.prisma.refreshToken.update({
      where: { id: validToken.id },
      data: { revoked: true },
    });

    // Gerar novos tokens
    return this.generateTokens(user, userAgent, ip);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      try {
        const payload = await this.jwtService.verifyAsync(refreshToken, {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        });

        if (payload?.jti) {
          await this.prisma.refreshToken.updateMany({
            where: { userId, tokenId: payload.jti },
            data: { revoked: true },
          });
        } else {
          await this.prisma.refreshToken.updateMany({
            where: { userId },
            data: { revoked: true },
          });
        }
      } catch {
        // Se o token for inválido, revogar todos os tokens do utilizador por segurança
        await this.prisma.refreshToken.updateMany({
          where: { userId },
          data: { revoked: true },
        });
      }
    } else {
      // Revogar todos os tokens do utilizador (logout de todos os dispositivos)
      await this.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      });
    }

    return { message: 'Logout realizado com sucesso' };
  }

  private static readonly OTP_EXPIRY_MINUTES = 5;
  private static readonly OTP_MAX_VERIFY_ATTEMPTS = 5;
  private static readonly OTP_RATE_LIMIT_WINDOW_MINUTES = 15;
  private static readonly OTP_RATE_LIMIT_MAX_SENDS = 5;

  async sendOtp(userId: string, purpose: 'email' | 'phone') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado');
    }

    if (purpose === 'phone' && !user.phone) {
      throw new BadRequestException('Adiciona primeiro o teu número de telefone no perfil');
    }

    const since = new Date();
    since.setMinutes(since.getMinutes() - AuthService.OTP_RATE_LIMIT_WINDOW_MINUTES);
    const recentCount = await this.prisma.otpCode.count({
      where: {
        userId,
        channel: purpose,
        createdAt: { gte: since },
      },
    });
    if (recentCount >= AuthService.OTP_RATE_LIMIT_MAX_SENDS) {
      throw new BadRequestException(
        'Muitas tentativas. Espera 15 minutos antes de pedir um novo código.',
      );
    }

    const code = String(randomInt(100000, 999999));
    const codeHash = await bcrypt.hash(code, await bcrypt.genSalt());
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + AuthService.OTP_EXPIRY_MINUTES);

    await this.prisma.otpCode.create({
      data: {
        userId,
        channel: purpose,
        codeHash,
        expiresAt,
      },
    });

    await this.notificationsService.queueOtpEmail(
      user.email,
      code,
      purpose,
      AuthService.OTP_EXPIRY_MINUTES,
    );

    return { message: 'Código enviado. Verifica o teu email.' };
  }

  async verifyOtp(userId: string, purpose: 'email' | 'phone', code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado');
    }

    const otp = await this.prisma.otpCode.findFirst({
      where: { userId, channel: purpose },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException('Código inválido ou expirado. Pede um novo código.');
    }
    if (otp.expiresAt < new Date()) {
      await this.prisma.otpCode.delete({ where: { id: otp.id } });
      throw new BadRequestException('Código expirado. Pede um novo código.');
    }
    if (otp.attempts >= AuthService.OTP_MAX_VERIFY_ATTEMPTS) {
      await this.prisma.otpCode.delete({ where: { id: otp.id } });
      throw new BadRequestException('Demasiadas tentativas. Pede um novo código.');
    }

    const valid = await bcrypt.compare(code, otp.codeHash);
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: otp.attempts + 1 },
    });

    if (!valid) {
      throw new BadRequestException('Código incorreto.');
    }

    await this.prisma.otpCode.delete({ where: { id: otp.id } });

    const updateData: Prisma.UserUpdateInput = {};
    if (purpose === 'email') {
      updateData.emailVerifiedAt = new Date();
    } else {
      updateData.phoneVerifiedAt = new Date();
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return this.getMe(userId);
  }

  /**
   * Apenas para testes da API: marca o email do utilizador como verificado.
   * Só ativo quando ALLOW_TEST_VERIFY=1 (usado por test-rides-bookings-advanced.js).
   */
  async verifyEmailForTest(userId: string) {
    const v = this.configService.get<string>('ALLOW_TEST_VERIFY');
    const enabled = v === '1' || String(v).trim() === '1' || v === 'true';
    if (!enabled) {
      throw new BadRequestException('Endpoint apenas disponível em ambiente de testes (ALLOW_TEST_VERIFY=1)');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
    return this.getMe(userId);
  }

  /**
   * Apenas para testes da API: aprova a carta de condução do utilizador.
   * Só ativo quando ALLOW_TEST_VERIFY=1.
   */
  async approveDriverLicenseForTest(userId: string) {
    const v = this.configService.get<string>('ALLOW_TEST_VERIFY');
    const enabled = v === '1' || String(v).trim() === '1' || v === 'true';
    if (!enabled) {
      throw new BadRequestException('Endpoint apenas disponível em ambiente de testes (ALLOW_TEST_VERIFY=1)');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        driverLicenseStatus: 'APPROVED',
        driverLicenseCcNumber: 'TEST_CC',
      },
    });
    return this.getMe(userId);
  }

  async findOrCreateGoogleUser(profile: Profile) {
    const email = profile.emails?.[0]?.value;
    if (!email) throw new BadRequestException('Email não disponível na conta Google');

    const googleId = profile.id;
    const name = profile.displayName || profile.name?.givenName || 'Utilizador';
    const avatarUrl = profile.photos?.[0]?.value ?? null;

    // Tentar encontrar por googleId
    let user = await this.prisma.user.findUnique({
      where: { googleId },
      include: { profile: true, vehicles: true },
    });

    if (!user) {
      // Tentar encontrar por email (utilizador existente — ligar conta Google)
      const existing = await this.prisma.user.findUnique({
        where: { email },
        include: { profile: true, vehicles: true },
      });

      if (existing) {
        user = await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            googleId,
            // Se ainda não verificou o email, marcar como verificado (Google já verificou)
            emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
            // Importar avatar do Google se ainda não tiver um
            ...(avatarUrl && !existing.profile?.avatarUrl
              ? { profile: { update: { avatarUrl } } }
              : {}),
          },
          include: { profile: true, vehicles: true },
        });
      } else {
        // Criar novo utilizador — Google já verificou o email
        user = await this.prisma.user.create({
          data: {
            email,
            googleId,
            emailVerifiedAt: new Date(),
            profile: { create: { name, avatarUrl } },
          },
          include: { profile: true, vehicles: true },
        });
      }
    }

    return this.generateTokens(user);
  }

  async acceptPolicy(userId: string, role: 'passenger' | 'driver') {
    const updateData: Prisma.UserUpdateInput = {};
    if (role === 'passenger') {
      updateData.passengerPolicyAcceptedAt = new Date();
    } else {
      updateData.driverPolicyAcceptedAt = new Date();
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { profile: true, vehicles: true },
    });

    return this.buildUserResponse(user);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const avatarUrl = await this.storageService.uploadAvatar(userId, file.buffer, file.mimetype);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { profile: { update: { avatarUrl } } },
      include: { profile: true, vehicles: true },
    });

    return this.buildUserResponse(user);
  }

  async uploadIdentityDocument(
    userId: string,
    file: Express.Multer.File,
    documentType: string,
  ) {
    const docUrl = await this.storageService.uploadIdentityDocument(
      userId,
      file.buffer,
      file.mimetype,
    );

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        identityDocumentUrl: docUrl,
        identityDocumentType: documentType,
        identityDocumentStatus: 'PENDING',
      },
      include: { profile: true, vehicles: true },
    });

    return this.buildUserResponse(user);
  }

  async uploadDriverLicense(
    userId: string,
    file: Express.Multer.File,
    ccNumber: string,
  ) {
    if (!ccNumber || ccNumber.trim().length < 4) {
      throw new BadRequestException('O número do Cartão de Cidadão é obrigatório.');
    }

    const docUrl = await this.storageService.uploadDriverLicense(
      userId,
      file.buffer,
      file.mimetype,
    );

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        driverLicenseUrl: docUrl,
        driverLicenseStatus: 'PENDING',
        driverLicenseCcNumber: ccNumber.trim(),
        driverLicenseAdminNote: null,
      },
      include: { profile: true, vehicles: true },
    });

    return this.buildUserResponse(user);
  }

  private async generateTokens(user: any, userAgent?: string, ip?: string) {
    try {
      const basePayload = { sub: user.id, email: user.email };
      
      // Access token (curto)
      const accessTokenSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
      const accessTokenExpiration = this.configService.get<string>('JWT_ACCESS_EXPIRATION');
      
      if (!accessTokenSecret) {
        console.error('[AuthService] JWT_ACCESS_SECRET não configurado');
        throw new Error('Configuração de autenticação inválida');
      }

      const accessToken = await this.jwtService.signAsync(basePayload, {
        secret: accessTokenSecret,
        expiresIn: accessTokenExpiration || '15m',
        jwtid: randomUUID(),
      });

      // Refresh token (longo)
      const refreshTokenSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
      const refreshTokenExpiration = this.configService.get<string>('JWT_REFRESH_EXPIRATION');
      
      if (!refreshTokenSecret) {
        console.error('[AuthService] JWT_REFRESH_SECRET não configurado');
        throw new Error('Configuração de autenticação inválida');
      }

      const refreshTokenId = randomUUID();
      const refreshToken = await this.jwtService.signAsync(basePayload, {
        secret: refreshTokenSecret,
        expiresIn: refreshTokenExpiration || '7d',
        jwtid: refreshTokenId,
      });

      // Hash do refresh token para guardar na BD
      const refreshTokenHash = await bcrypt.hash(refreshToken, await bcrypt.genSalt());

      // Calcular expiração baseada na configuração
      const expiresAt = this.calculateExpirationDate(
        this.configService.get<string>('JWT_REFRESH_EXPIRATION'),
      );

      // Guardar refresh token na BD
      // eslint-disable-next-line no-console
      console.log('[AuthService] Guardar refresh token', refreshTokenId, 'para user', user.id);
      await this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: refreshTokenHash,
          tokenId: refreshTokenId,
          expiresAt,
          userAgent,
          ip,
        },
      });

      return {
        accessToken,
        refreshToken, // Enviar ao cliente (só uma vez)
        user: this.buildUserResponse(user),
      };
    } catch (error) {
      console.error('[AuthService] Erro ao gerar tokens:', error);
      throw error;
    }
  }

  private buildUserResponse(user: any) {
    const { passwordHash, ...rest } = user;

    let profile = rest.profile as any;
    if (profile) {
      profile = {
        ...profile,
        schedule: profile.schedule,
      };
    }

    const vehicles = Array.isArray(rest.vehicles)
      ? rest.vehicles.map((vehicle: any) => this.transformVehicle(vehicle))
      : rest.vehicles;

    return {
      ...rest,
      profile,
      vehicles,
      verification: {
        email: !!rest.emailVerifiedAt,
        phone: !!rest.phoneVerifiedAt,
        driverLicense: rest.driverLicenseStatus ?? 'NONE',
        identity: rest.identityDocumentStatus ?? 'NONE',
      },
      policy: {
        passengerAcceptedAt: rest.passengerPolicyAcceptedAt ?? null,
        driverAcceptedAt: rest.driverPolicyAcceptedAt ?? null,
      },
    };
  }

  private transformVehicle(vehicle: any) {
    if (!vehicle) return vehicle;
    return {
      ...vehicle,
      features: vehicle.features ?? {
        airConditioning: true,
        heater: true,
      },
    };
  }

  /**
   * Calcula a data de expiração baseada numa string de duração (ex: '7d', '30d', '1h', '15m')
   * Suporta: s (segundos), m (minutos), h (horas), d (dias)
   */
  private calculateExpirationDate(expirationString?: string): Date {
    const expiresAt = new Date();
    
    if (!expirationString) {
      // Fallback padrão: 7 dias se não configurado
      expiresAt.setDate(expiresAt.getDate() + 7);
      return expiresAt;
    }

    // Parse da string (ex: '7d', '30d', '1h', '15m', '3600s')
    const match = expirationString.match(/^(\d+)([smhd])$/);
    if (!match) {
      // Se formato inválido, usar 7 dias como fallback
      expiresAt.setDate(expiresAt.getDate() + 7);
      return expiresAt;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        expiresAt.setSeconds(expiresAt.getSeconds() + value);
        break;
      case 'm':
        expiresAt.setMinutes(expiresAt.getMinutes() + value);
        break;
      case 'h':
        expiresAt.setHours(expiresAt.getHours() + value);
        break;
      case 'd':
        expiresAt.setDate(expiresAt.getDate() + value);
        break;
      default:
        // Fallback: 7 dias
        expiresAt.setDate(expiresAt.getDate() + 7);
    }

    return expiresAt;
  }
}
