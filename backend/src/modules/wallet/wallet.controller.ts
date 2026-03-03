import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WalletService } from './wallet.service';
import { StripeService } from '../stripe/stripe.service';
import { TopupDto } from './dto/topup.dto';

@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly moduleRef: ModuleRef,
  ) {}

  /** GET /wallet — saldo actual */
  @Get()
  getBalance(@Request() req: any) {
    return this.walletService.getBalance(req.user.id);
  }

  /** GET /wallet/transactions?limit=30 — histórico de transações */
  @Get('transactions')
  getTransactions(@Request() req: any, @Query('limit') limit?: string) {
    return this.walletService.getTransactions(req.user.id, limit ? parseInt(limit) : 30);
  }

  /** POST /wallet/topup/intent — criar PaymentIntent Stripe */
  @Post('topup/intent')
  topupIntent(@Request() req: any, @Body() dto: TopupDto) {
    const stripeService = this.moduleRef.get(StripeService, { strict: false });
    return stripeService.createPaymentIntent(req.user.id, dto.amount);
  }

  /** POST /wallet/topup — carregar saldo (demo) */
  @Post('topup')
  topup(@Request() req: any, @Body() dto: TopupDto) {
    return this.walletService.topup(req.user.id, dto.amount, dto.description);
  }

  /** POST /wallet/withdraw — passageiro reembolsa saldo não usado para o cartão original */
  @Post('withdraw')
  async withdraw(@Request() req: any, @Body() body: { amount: number }) {
    const amount = parseFloat(String(body.amount));
    if (!amount || amount < 1) {
      throw new BadRequestException('O valor mínimo é €1.');
    }

    // Validar saldo e calcular plano de reembolso
    const { walletId, plan } = await this.walletService.buildStripeRefundPlan(req.user.id, amount);

    // Executar reembolsos no Stripe
    const stripeService = this.moduleRef.get(StripeService, { strict: false });
    await stripeService.createRefunds(
      plan.map((r) => ({ paymentIntentId: r.pi, amountCents: Math.round(r.amount * 100) })),
    );

    // Debitar wallet e registar transações (atómico)
    await this.walletService.finalizeWithdraw(walletId, amount, plan);

    return { success: true, refundedAmount: amount };
  }

  /** POST /wallet/payout-request — condutor pede saque para IBAN */
  @Post('payout-request')
  createPayoutRequest(@Request() req: any, @Body() body: { amount: number; iban: string }) {
    return this.walletService.createPayoutRequest(req.user.id, body.amount, body.iban);
  }

  /** GET /wallet/payout-requests — histórico de pedidos de saque */
  @Get('payout-requests')
  getMyPayoutRequests(@Request() req: any) {
    return this.walletService.getMyPayoutRequests(req.user.id);
  }
}
