import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe | null = null;
  private readonly webhookSecret: string;
  private readonly publishableKey: string;
  private readonly enabled: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly walletService: WalletService,
  ) {
    const secretKey = config.get<string>('STRIPE_SECRET_KEY');
    this.publishableKey = config.get<string>('STRIPE_PUBLISHABLE_KEY', '');
    this.webhookSecret = config.get<string>('STRIPE_WEBHOOK_SECRET', '');
    this.enabled = !!secretKey;

    if (this.enabled) {
      this.stripe = new Stripe(secretKey!, { apiVersion: '2026-02-25.clover' });
    } else {
      this.logger.warn('STRIPE_SECRET_KEY não definida - Stripe desativado.');
    }
  }

  /** Criar PaymentIntent para carregar saldo (amountCents em cêntimos - unidade nativa do Stripe) */
  async createPaymentIntent(userId: string, amountCents: number) {
    if (!this.enabled || !this.stripe) {
      throw new BadRequestException(
        'Pagamento via Stripe não está configurado neste servidor.',
      );
    }

    if (!amountCents || amountCents < 1000 || amountCents > 50000) {
      throw new BadRequestException('O valor deve estar entre €10 e €500.');
    }

    const intent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      metadata: { userId, type: 'topup' },
      payment_method_types: ['card', 'mb_way'],
    });

    return {
      clientSecret: intent.client_secret,
      publishableKey: this.publishableKey,
      paymentIntentId: intent.id,
    };
  }

  /** Criar PaymentIntent para pagamento direto de uma reserva */
  async createBookingPaymentIntent(
    userId: string,
    rideId: string,
    seats: number,
    amountCents: number,
  ) {
    if (!this.enabled || !this.stripe) {
      throw new BadRequestException(
        'Pagamento via Stripe não está configurado neste servidor.',
      );
    }

    const intent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      metadata: {
        userId,
        rideId,
        seats: String(seats),
        type: 'booking',
      },
      payment_method_types: ['card', 'mb_way'],
    });

    return {
      clientSecret: intent.client_secret,
      publishableKey: this.publishableKey,
      paymentIntentId: intent.id,
    };
  }

  /**
   * Verificar que um PaymentIntent de reserva é válido e não foi já usado.
   * Lança exceção se inválido.
   */
  async verifyBookingPaymentIntent(
    piId: string,
    userId: string,
    rideId: string,
  ): Promise<void> {
    if (!this.enabled || !this.stripe) {
      throw new BadRequestException('Stripe não configurado.');
    }

    let pi: Stripe.PaymentIntent;
    try {
      pi = await this.stripe.paymentIntents.retrieve(piId);
    } catch {
      throw new BadRequestException('Pagamento inválido ou não encontrado.');
    }

    if (pi.status !== 'succeeded') {
      throw new BadRequestException(
        'O pagamento ainda não foi confirmado. Tenta novamente.',
      );
    }

    if (pi.metadata?.userId !== userId) {
      throw new BadRequestException('Este pagamento não pertence à tua conta.');
    }

    if (pi.metadata?.rideId !== rideId) {
      throw new BadRequestException(
        'Este pagamento foi criado para uma boleia diferente.',
      );
    }
  }

  /** Criar reembolsos Stripe (para withdraw de passageiro) */
  async createRefunds(
    refunds: { paymentIntentId: string; amountCents: number }[],
  ) {
    if (!this.enabled || !this.stripe) {
      throw new BadRequestException(
        'Reembolso via Stripe não está configurado neste servidor. Contacta o suporte.',
      );
    }

    for (const { paymentIntentId, amountCents } of refunds) {
      try {
        await this.stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: amountCents,
        });
      } catch (err: any) {
        this.logger.error(
          `Erro ao reembolsar ${paymentIntentId}: ${err.message}`,
        );
        throw new BadRequestException(
          `Erro ao processar reembolso Stripe: ${err.message ?? 'erro desconhecido'}`,
        );
      }
    }
  }

  /** Processar webhook do Stripe */
  async handleWebhook(rawBody: Buffer, signature: string) {
    if (!this.enabled || !this.stripe) {
      throw new BadRequestException('Stripe não configurado.');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
    } catch (err: any) {
      this.logger.warn(`Webhook inválido: ${err.message}`);
      throw new BadRequestException(`Webhook inválido: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const userId = intent.metadata?.userId;
      // Só topups creditam a wallet; bookings pagos via Stripe são tratados no fluxo de booking
      const isBooking = intent.metadata?.type === 'booking';
      // intent.amount é a fonte de verdade (cêntimos), não a metadata
      const amountCents = intent.amount;

      if (!userId || !amountCents || isBooking) {
        if (!isBooking) {
          this.logger.warn(
            `PaymentIntent ${intent.id} sem metadata userId/amount - ignorado.`,
          );
        }
        return { received: true };
      }

      await this.walletService.creditFromStripe(intent.id, userId, amountCents);
      this.logger.log(
        `Wallet creditada: userId=${userId} amount=€${(amountCents / 100).toFixed(2)} pi=${intent.id}`,
      );
    }

    return { received: true };
  }
}
