import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const TRANSACTION_TYPES = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
  REFUND: 'REFUND',
  PAYOUT: 'PAYOUT',
  WITHDRAW: 'WITHDRAW',
} as const;

/** Formata cêntimos como euros para mensagens de erro (ex: 1050 -> "10.50") */
function euros(cents: number): string {
  return (cents / 100).toFixed(2);
}

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  /** Obter (ou criar) wallet do utilizador */
  async getOrCreate(userId: string) {
    const existing = await this.prisma.wallet.findFirst({ where: { userId } });
    if (existing) return existing;
    return this.prisma.wallet.create({ data: { userId } });
  }

  /** Saldo + moeda */
  async getBalance(userId: string) {
    const wallet = await this.getOrCreate(userId);
    return { id: wallet.id, balanceCents: wallet.balanceCents, currency: wallet.currency };
  }

  /** Saldo + últimas transações */
  async getTransactions(userId: string, limit = 30) {
    const wallet = await this.getOrCreate(userId);
    const transactions = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return {
      balanceCents: wallet.balanceCents,
      currency: wallet.currency,
      transactions: transactions.map((t) => this.toTransactionResponse(t)),
    };
  }

  /** Criar PaymentIntent Stripe para carregar saldo (devolve clientSecret ao frontend) */
  async createTopupIntent(userId: string, amountCents: number) {
    if (!amountCents || amountCents < 1000 || amountCents > 50000) {
      throw new BadRequestException('O valor deve estar entre €10 e €500.');
    }
    // Retorna os dados necessários ao frontend — o StripeService faz o trabalho real
    // Este método existe para que WalletController possa usar StripeService
    return { amountCents };
  }

  /**
   * Creditar wallet após confirmação Stripe (idempotente via paymentIntentId).
   * Chamado pelo StripeService no webhook payment_intent.succeeded.
   */
  async creditFromStripe(paymentIntentId: string, userId: string, amountCents: number) {
    const wallet = await this.getOrCreate(userId);

    // Idempotência: não creditar se já existe transação com este paymentIntentId
    const existing = await this.prisma.walletTransaction.findFirst({
      where: { walletId: wallet.id, reference: paymentIntentId },
    });
    if (existing) return existing;

    return this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceCents: { increment: amountCents } },
      });
      return tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TRANSACTION_TYPES.CREDIT,
          amountCents,
          description: 'Carregamento via Stripe',
          reference: paymentIntentId,
        },
      });
    });
  }

  /** Carregamento de saldo (demo — sem gateway de pagamento real) */
  async topup(userId: string, amountCents: number, description?: string) {
    if (!amountCents || amountCents < 1000) {
      throw new BadRequestException('O valor mínimo de carregamento é €10.');
    }
    if (amountCents > 50000) {
      throw new BadRequestException('Máximo de €500 por carregamento.');
    }

    const wallet = await this.getOrCreate(userId);

    return this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceCents: { increment: amountCents } },
      });
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TRANSACTION_TYPES.CREDIT,
          amountCents,
          description: description ?? 'Carregamento de saldo',
        },
      });
      const updated = await tx.wallet.findUnique({ where: { id: wallet.id } });
      return {
        balanceCents: updated!.balanceCents,
        currency: updated!.currency,
        transaction: this.toTransactionResponse(transaction),
      };
    });
  }

  /** Débito interno (usado por outros serviços — ex: pagamento de boleia) */
  async debit(userId: string, amountCents: number, description: string, reference?: string) {
    const wallet = await this.getOrCreate(userId);

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.wallet.findUnique({ where: { id: wallet.id } });
      if (!current || current.balanceCents < amountCents) {
        throw new BadRequestException('Saldo insuficiente.');
      }
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceCents: { decrement: amountCents } },
      });
      return tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TRANSACTION_TYPES.DEBIT,
          amountCents,
          description,
          reference: reference ?? null,
        },
      });
    });
  }

  /** Reembolso (reserva cancelada ou recusada) */
  async refund(userId: string, amountCents: number, description: string, reference?: string) {
    const wallet = await this.getOrCreate(userId);

    return this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceCents: { increment: amountCents } },
      });
      return tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TRANSACTION_TYPES.REFUND,
          amountCents,
          description,
          reference: reference ?? null,
        },
      });
    });
  }

  /** Payout ao condutor quando viagem é concluída */
  async credit(userId: string, amountCents: number, description: string, reference?: string) {
    const wallet = await this.getOrCreate(userId);

    return this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceCents: { increment: amountCents } },
      });
      return tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TRANSACTION_TYPES.PAYOUT,
          amountCents,
          description,
          reference: reference ?? null,
        },
      });
    });
  }

  /** Criar pedido de payout (condutor solicita levantamento para IBAN) */
  async createPayoutRequest(userId: string, amountCents: number, iban: string) {
    if (!amountCents || amountCents < 100) {
      throw new BadRequestException('O valor mínimo de levantamento é €1.');
    }
    if (amountCents > 500000) {
      throw new BadRequestException('O valor máximo por pedido é €5000.');
    }

    const ibanClean = iban.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(ibanClean)) {
      throw new BadRequestException('IBAN inválido.');
    }

    const wallet = await this.getOrCreate(userId);
    if (wallet.balanceCents < amountCents) {
      throw new BadRequestException(
        `Saldo insuficiente. Tens €${euros(wallet.balanceCents)}, mas pediste €${euros(amountCents)}.`,
      );
    }

    // Reservar o saldo (debitar imediatamente para não poder gastar de novo)
    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceCents: { decrement: amountCents } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'PAYOUT_PENDING',
          amountCents,
          description: 'Pedido de levantamento — aguarda processamento',
        },
      });
    });

    return this.prisma.payoutRequest.create({
      data: { userId, amountCents, iban: ibanClean },
    });
  }

  /**
   * Calcula o plano de reembolso via Stripe para um withdraw.
   * Devolve lista de { pi, amountCents } a reembolsar, greedy oldest-first.
   * Lança exceção se saldo insuficiente ou se não há créditos Stripe suficientes.
   */
  async buildStripeRefundPlan(userId: string, requestedAmountCents: number) {
    if (requestedAmountCents < 100) {
      throw new BadRequestException('O valor mínimo de reembolso é €1.');
    }

    const wallet = await this.getOrCreate(userId);
    if (wallet.balanceCents < requestedAmountCents) {
      throw new BadRequestException('Saldo insuficiente.');
    }

    // Todos os carregamentos via Stripe (CREDIT com referência pi_xxx)
    const credits = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id, type: TRANSACTION_TYPES.CREDIT, reference: { startsWith: 'pi_' } },
      orderBy: { createdAt: 'asc' },
    });

    // Levantamentos já processados por pi_ (para não ultrapassar o limite de cada PaymentIntent)
    const withdrawals = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id, type: TRANSACTION_TYPES.WITHDRAW, reference: { startsWith: 'pi_' } },
    });
    const withdrawnByPi: Record<string, number> = {};
    for (const w of withdrawals) {
      if (w.reference) {
        withdrawnByPi[w.reference] = (withdrawnByPi[w.reference] ?? 0) + w.amountCents;
      }
    }

    // Quanto resta reembolsável em cada pi_
    const refundable = credits
      .map((c) => ({
        pi: c.reference!,
        remaining: Math.max(0, c.amountCents - (withdrawnByPi[c.reference!] ?? 0)),
      }))
      .filter((r) => r.remaining > 0);

    const totalRefundable = refundable.reduce((s, r) => s + r.remaining, 0);

    if (totalRefundable < requestedAmountCents) {
      if (totalRefundable === 0) {
        throw new BadRequestException(
          'Não tens saldo elegível para reembolso via cartão. Saldo ganho como condutor pode ser levantado via IBAN.',
        );
      }
      throw new BadRequestException(
        `Apenas €${euros(totalRefundable)} do teu saldo são reembolsáveis via cartão. ` +
          'Para levantar o restante, usa o pedido de levantamento para IBAN.',
      );
    }

    // Plano greedy: mais antigas primeiro
    const plan: { pi: string; amountCents: number }[] = [];
    let remaining = requestedAmountCents;
    for (const { pi, remaining: piRemaining } of refundable) {
      if (remaining <= 0) break;
      const toRefund = Math.min(remaining, piRemaining);
      plan.push({ pi, amountCents: toRefund });
      remaining -= toRefund;
    }

    return { walletId: wallet.id, plan };
  }

  /** Debitar wallet + registar transações WITHDRAW após reembolsos Stripe confirmados */
  async finalizeWithdraw(walletId: string, amountCents: number, plan: { pi: string; amountCents: number }[]) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet || wallet.balanceCents < amountCents) {
        throw new BadRequestException('Saldo insuficiente.');
      }
      await tx.wallet.update({
        where: { id: walletId },
        data: { balanceCents: { decrement: amountCents } },
      });
      for (const { pi, amountCents: a } of plan) {
        await tx.walletTransaction.create({
          data: {
            walletId,
            type: TRANSACTION_TYPES.WITHDRAW,
            amountCents: a,
            description: 'Reembolso para cartão original',
            reference: pi,
          },
        });
      }
    });
  }

  /** Listar pedidos de payout do utilizador */
  async getMyPayoutRequests(userId: string) {
    return this.prisma.payoutRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private toTransactionResponse(t: {
    id: string;
    type: string;
    amountCents: number;
    description: string | null;
    reference: string | null;
    createdAt: Date;
  }) {
    return {
      id: t.id,
      type: t.type,
      amountCents: t.amountCents,
      description: t.description,
      reference: t.reference,
      createdAt: t.createdAt,
    };
  }
}
