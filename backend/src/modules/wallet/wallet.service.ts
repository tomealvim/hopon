import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const TRANSACTION_TYPES = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
  REFUND: 'REFUND',
  PAYOUT: 'PAYOUT',
  WITHDRAW: 'WITHDRAW',
} as const;

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
    return { id: wallet.id, balance: wallet.balance, currency: wallet.currency };
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
      balance: wallet.balance,
      currency: wallet.currency,
      transactions: transactions.map((t) => this.toTransactionResponse(t)),
    };
  }

  /** Criar PaymentIntent Stripe para carregar saldo (devolve clientSecret ao frontend) */
  async createTopupIntent(userId: string, amount: number) {
    if (!amount || amount < 10 || amount > 500) {
      throw new BadRequestException('O valor deve estar entre €10 e €500.');
    }
    // Retorna os dados necessários ao frontend — o StripeService faz o trabalho real
    // Este método existe para que WalletController possa usar StripeService
    return { amount };
  }

  /**
   * Creditar wallet após confirmação Stripe (idempotente via paymentIntentId).
   * Chamado pelo StripeService no webhook payment_intent.succeeded.
   */
  async creditFromStripe(paymentIntentId: string, userId: string, amount: number) {
    const wallet = await this.getOrCreate(userId);

    // Idempotência: não creditar se já existe transação com este paymentIntentId
    const existing = await this.prisma.walletTransaction.findFirst({
      where: { walletId: wallet.id, reference: paymentIntentId },
    });
    if (existing) return existing;

    return this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      });
      return tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TRANSACTION_TYPES.CREDIT,
          amount,
          description: 'Carregamento via Stripe',
          reference: paymentIntentId,
        },
      });
    });
  }

  /** Carregamento de saldo (demo — sem gateway de pagamento real) */
  async topup(userId: string, amount: number, description?: string) {
    if (!amount || amount < 10) {
      throw new BadRequestException('O valor mínimo de carregamento é €10.');
    }
    if (amount > 500) {
      throw new BadRequestException('Máximo de €500 por carregamento.');
    }

    const wallet = await this.getOrCreate(userId);

    return this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      });
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TRANSACTION_TYPES.CREDIT,
          amount,
          description: description ?? 'Carregamento de saldo',
        },
      });
      const updated = await tx.wallet.findUnique({ where: { id: wallet.id } });
      return {
        balance: updated!.balance,
        currency: updated!.currency,
        transaction: this.toTransactionResponse(transaction),
      };
    });
  }

  /** Débito interno (usado por outros serviços — ex: pagamento de boleia) */
  async debit(userId: string, amount: number, description: string, reference?: string) {
    const wallet = await this.getOrCreate(userId);

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.wallet.findUnique({ where: { id: wallet.id } });
      if (!current || current.balance < amount) {
        throw new BadRequestException('Saldo insuficiente.');
      }
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });
      return tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TRANSACTION_TYPES.DEBIT,
          amount,
          description,
          reference: reference ?? null,
        },
      });
    });
  }

  /** Reembolso (reserva cancelada ou recusada) */
  async refund(userId: string, amount: number, description: string, reference?: string) {
    const wallet = await this.getOrCreate(userId);

    return this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      });
      return tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TRANSACTION_TYPES.REFUND,
          amount,
          description,
          reference: reference ?? null,
        },
      });
    });
  }

  /** Payout ao condutor quando viagem é concluída */
  async credit(userId: string, amount: number, description: string, reference?: string) {
    const wallet = await this.getOrCreate(userId);

    return this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      });
      return tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TRANSACTION_TYPES.PAYOUT,
          amount,
          description,
          reference: reference ?? null,
        },
      });
    });
  }

  /** Criar pedido de payout (condutor solicita saque para IBAN) */
  async createPayoutRequest(userId: string, amount: number, iban: string) {
    if (!amount || amount < 1) {
      throw new BadRequestException('O valor mínimo de saque é €1.');
    }
    if (amount > 5000) {
      throw new BadRequestException('O valor máximo por pedido é €5000.');
    }

    const ibanClean = iban.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(ibanClean)) {
      throw new BadRequestException('IBAN inválido.');
    }

    const wallet = await this.getOrCreate(userId);
    if (Number(wallet.balance) < amount) {
      throw new BadRequestException(
        `Saldo insuficiente. Tens €${Number(wallet.balance).toFixed(2)}, mas pediste €${amount.toFixed(2)}.`,
      );
    }

    // Reservar o saldo (debitar imediatamente para não poder gastar de novo)
    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'PAYOUT_PENDING',
          amount,
          description: 'Pedido de saque — aguarda processamento',
        },
      });
    });

    return (this.prisma as any).payoutRequest.create({
      data: { userId, amount, iban: ibanClean },
    });
  }

  /**
   * Calcula o plano de reembolso via Stripe para um withdraw.
   * Devolve lista de { pi, amount } a reembolsar, greedy oldest-first.
   * Lança exceção se saldo insuficiente ou se não há créditos Stripe suficientes.
   */
  async buildStripeRefundPlan(userId: string, requestedAmount: number) {
    if (requestedAmount < 1) {
      throw new BadRequestException('O valor mínimo de reembolso é €1.');
    }

    const wallet = await this.getOrCreate(userId);
    if (Number(wallet.balance) < requestedAmount) {
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
        withdrawnByPi[w.reference] = (withdrawnByPi[w.reference] ?? 0) + Number(w.amount);
      }
    }

    // Quanto resta reembolsável em cada pi_
    const refundable = credits
      .map((c) => ({
        pi: c.reference!,
        remaining: Math.max(0, Number(c.amount) - (withdrawnByPi[c.reference!] ?? 0)),
      }))
      .filter((r) => r.remaining > 0);

    const totalRefundable = refundable.reduce((s, r) => s + r.remaining, 0);

    if (totalRefundable < requestedAmount) {
      if (totalRefundable === 0) {
        throw new BadRequestException(
          'Não tens saldo elegível para reembolso via cartão. Saldo ganho como condutor pode ser levantado via IBAN.',
        );
      }
      throw new BadRequestException(
        `Apenas €${totalRefundable.toFixed(2)} do teu saldo são reembolsáveis via cartão. ` +
          'Para levantar o restante, usa o pedido de saque para IBAN.',
      );
    }

    // Plano greedy: mais antigas primeiro
    const plan: { pi: string; amount: number }[] = [];
    let remaining = requestedAmount;
    for (const { pi, remaining: piRemaining } of refundable) {
      if (remaining <= 0) break;
      const toRefund = parseFloat(Math.min(remaining, piRemaining).toFixed(2));
      plan.push({ pi, amount: toRefund });
      remaining = parseFloat((remaining - toRefund).toFixed(2));
    }

    return { walletId: wallet.id, plan };
  }

  /** Debitar wallet + registar transações WITHDRAW após reembolsos Stripe confirmados */
  async finalizeWithdraw(walletId: string, amount: number, plan: { pi: string; amount: number }[]) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet || Number(wallet.balance) < amount) {
        throw new BadRequestException('Saldo insuficiente.');
      }
      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: { decrement: amount } },
      });
      for (const { pi, amount: a } of plan) {
        await tx.walletTransaction.create({
          data: {
            walletId,
            type: TRANSACTION_TYPES.WITHDRAW,
            amount: a,
            description: 'Reembolso para cartão original',
            reference: pi,
          },
        });
      }
    });
  }

  /** Listar pedidos de payout do utilizador */
  async getMyPayoutRequests(userId: string) {
    return (this.prisma as any).payoutRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private toTransactionResponse(t: {
    id: string;
    type: string;
    amount: number;
    description: string | null;
    reference: string | null;
    createdAt: Date;
  }) {
    return {
      id: t.id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      reference: t.reference,
      createdAt: t.createdAt,
    };
  }
}
