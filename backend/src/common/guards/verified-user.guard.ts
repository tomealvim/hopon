import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Guard que garante que o utilizador tem email verificado.
 * Usado em: criar boleia, pedir boleia, ver detalhes de boleias.
 * (Telefone verificada fica para quando tiver SMS/telefone aplicado.)
 */
@Injectable()
export class VerifiedUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Autenticação necessária',
          details: null,
        },
      });
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException({
        error: {
          code: 'VERIFICATION_REQUIRED',
          message: 'Precisas de verificar o teu email para realizar esta ação.',
          details: { missing: 'email' },
        },
      });
    }

    return true;
  }
}
