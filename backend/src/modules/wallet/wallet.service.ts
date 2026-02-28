import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const TRANSACTION_TYPES = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
  REFUND: 'REFUND',
  PAYOUT: 'PAYOUT',
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

  /** Carregamento de saldo (demo — sem gateway de pagamento real) */
  async topup(userId: string, amount: number, description?: string) {
    if (!amount || amount <= 0) {
      throw new BadRequestException('O valor deve ser superior a €0.');
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
