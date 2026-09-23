import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StripeService } from './stripe.service';

@ApiTags('Stripe')
@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  /**
   * POST /stripe/webhook
   * Recebe eventos do Stripe. Não tem JwtAuthGuard - é chamado pelo Stripe.
   * O body chega como Buffer (express.raw middleware em main.ts).
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Stripe (uso interno)' })
  webhook(@Req() req: any, @Headers('stripe-signature') signature: string) {
    const rawBody: Buffer = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body));
    return this.stripeService.handleWebhook(rawBody, signature);
  }
}
