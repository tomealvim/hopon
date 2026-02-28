import { Controller, Post, Body, Get, UseGuards, Request, Patch, Headers } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { ttl: 900_000, limit: 5 } }) // 5 registos / 15 min por IP
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
  @Throttle({ default: { ttl: 900_000, limit: 5 } }) // 5 tentativas / 15 min por IP
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
  @Post('test/verify-email')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Só testes] Marcar email como verificado (ALLOW_TEST_VERIFY=1)' })
  verifyEmailForTest(@Request() req) {
    return this.authService.verifyEmailForTest(req.user.id);
  }
}
