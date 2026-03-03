import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  root() {
    return {
      message: 'Hopon API v1',
      docs: '/api/docs',
      health: 'ok',
    };
  }

  /**
   * Apple Pay domain verification
   * O Stripe Dashboard fornece o conteúdo após registar o domínio.
   * Definir APPLE_PAY_DOMAIN_ASSOCIATION no .env com o conteúdo do ficheiro.
   */
  @Get('.well-known/apple-developer-merchantid-domain-association')
  applePayDomainVerification(@Res() res: Response) {
    const content = this.config.get<string>('APPLE_PAY_DOMAIN_ASSOCIATION', '');
    if (!content) {
      return res.status(404).send('Not configured');
    }
    res.setHeader('Content-Type', 'text/plain');
    return res.send(content);
  }
}
