import { Controller, Query, Sse, UnauthorizedException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Observable, interval, merge } from 'rxjs';
import { map } from 'rxjs/operators';
import { EventsService, SseEvent } from './events.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * GET /events/stream?token=<accessToken>
 *
 * EventSource (browser) não suporta headers customizados, por isso o JWT
 * é passado como query param. Apenas tokens de acesso válidos são aceites.
 */
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Sse('stream')
  @SkipThrottle() // ligação SSE persistente - não contar como pedidos HTTP normais
  async stream(@Query('token') token: string): Promise<Observable<SseEvent>> {
    if (!token) {
      throw new UnauthorizedException('Token em falta');
    }

    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado');
    }

    const ping$ = interval(30_000).pipe(
      map(() => ({ data: JSON.stringify({ type: 'ping' }) })),
    );

    return merge(this.eventsService.subscribe(payload.sub), ping$);
  }
}
