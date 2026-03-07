import {
  Controller, Post, Body, Get, UseGuards, Request, Patch, Headers,
  UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator,
  HttpCode, HttpStatus, Query, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { OtpSendDto } from './dto/otp-send.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AcceptPolicyDto } from './dto/accept-policy.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { ttl: 900_000, limit: 200 } }) // 200 registos / 15 min por IP (suite de testes usa ~50)
  @ApiOperation({ summary: 'Registar novo utilizador com email/password' })
  async register(
    @Body() dto: RegisterDto,
    @Headers('user-agent') userAgent?: string,
    @Request() req?: any,
  ) {
    try {
      const ip = req?.ip || req?.connection?.remoteAddress;
      return await this.authService.register(dto, userAgent, ip);
    } catch (error) {
      // Re-throw para que o NestJS trate com o exception filter padrão
      throw error;
    }
  }

  @Post('login')
  @Throttle({ default: { ttl: 900_000, limit: 200 } }) // 200 tentativas / 15 min por IP
  @ApiOperation({ summary: 'Login com email/password' })
  async login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent?: string,
    @Request() req?: any,
  ) {
    try {
      const ip = req?.ip || req?.connection?.remoteAddress;
      return await this.authService.login(dto, userAgent, ip);
    } catch (error) {
      // Re-throw para que o NestJS trate com o exception filter padrão
      throw error;
    }
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Renovar access token usando refresh token' })
  refresh(
    @Body() dto: RefreshDto,
    @Headers('user-agent') userAgent?: string,
    @Request() req?: any,
  ) {
    const ip = req?.ip || req?.connection?.remoteAddress;
    return this.authService.refresh(dto, userAgent, ip);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fazer logout (revogar refresh token)' })
  logout(@Request() req, @Body() dto?: LogoutDto) {
    return this.authService.logout(req.user.id, dto?.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter perfil do utilizador autenticado' })
  getProfile(@Request() req) {
    return this.authService.getMe(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar dados do perfil do utilizador autenticado' })
  updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('otp/send')
  @Throttle({ default: { ttl: 900_000, limit: 3 } }) // 3 envios / 15 min por IP
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enviar código OTP para verificar email ou telefone' })
  sendOtp(@Request() req, @Body() dto: OtpSendDto) {
    return this.authService.sendOtp(req.user.id, dto.purpose);
  }

  @UseGuards(JwtAuthGuard)
  @Post('otp/verify')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar código OTP e marcar email/telefone como verificado' })
  verifyOtp(@Request() req, @Body() dto: OtpVerifyDto) {
    return this.authService.verifyOtp(req.user.id, dto.purpose, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload de avatar (JPEG/PNG/WebP, máx 5MB)' })
  @UseInterceptors(FileInterceptor('avatar', { storage: memoryStorage() }))
  uploadAvatar(
    @Request() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /image\/(jpeg|png|webp)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.authService.uploadAvatar(req.user.id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/accept-policy')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aceitar política de viagens (passageiro ou condutor)' })
  acceptPolicy(@Request() req, @Body() dto: AcceptPolicyDto) {
    return this.authService.acceptPolicy(req.user.id, dto.role);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/driver-license')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload de carta de condução com nº CC (JPEG/PNG/WebP, máx 10MB)' })
  @UseInterceptors(FileInterceptor('document', { storage: memoryStorage() }))
  uploadDriverLicense(
    @Request() req,
    @Query('ccNumber') ccNumber: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /image\/(jpeg|png|webp)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.authService.uploadDriverLicense(req.user.id, file, ccNumber ?? '');
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/identity-document')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload de documento de identidade (JPEG/PNG/WebP, máx 10MB)' })
  @UseInterceptors(FileInterceptor('document', { storage: memoryStorage() }))
  uploadIdentityDocument(
    @Request() req,
    @Query('type') documentType: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /image\/(jpeg|png|webp)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.authService.uploadIdentityDocument(req.user.id, file, documentType ?? 'cc');
  }

  @Get('google')
  @SkipThrottle()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Iniciar login com Google (OAuth redirect)' })
  googleAuth() {
    // Passport trata do redirect para o Google
  }

  @Get('google/callback')
  @SkipThrottle()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Callback OAuth do Google' })
  async googleCallback(@Request() req, @Res() res: Response) {
    const { accessToken, refreshToken } = req.user as { accessToken: string; refreshToken: string };
    const frontendUrl = this.configService
      .get<string>('FRONTEND_URL', 'http://localhost:5173')
      .split(',')[0]
      .trim();
    return res.redirect(
      `${frontendUrl}/auth/callback?token=${accessToken}&refresh=${refreshToken}`,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('test/verify-email')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Só testes] Marcar email como verificado (ALLOW_TEST_VERIFY=1)' })
  verifyEmailForTest(@Request() req) {
    return this.authService.verifyEmailForTest(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('test/approve-driver-license')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Só testes] Aprovar carta de condução (ALLOW_TEST_VERIFY=1)' })
  approveDriverLicenseForTest(@Request() req) {
    return this.authService.approveDriverLicenseForTest(req.user.id);
  }
}
