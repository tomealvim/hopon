import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';

const DISPUTE_WINDOW_DAYS = 7;

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateDisputeDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { ride: true },
    });

    if (!booking) throw new NotFoundException('Reserva não encontrada.');

    // Só passageiro ou condutor pode abrir disputa
    if (booking.userId !== userId && booking.ride.driverId !== userId) {
      throw new ForbiddenException('Não tens permissão para contestar esta boleia.');
    }

    // Só boleias concluídas
    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException('Só podes contestar reservas concluídas.');
    }

    // Janela de 7 dias
    const departureTime = booking.ride.departureTime;
    const cutoff = new Date(departureTime);
    cutoff.setDate(cutoff.getDate() + DISPUTE_WINDOW_DAYS);
    if (new Date() > cutoff) {
      throw new BadRequestException(
        `O prazo para contestar expirou (${DISPUTE_WINDOW_DAYS} dias após a partida).`,
      );
    }

    // Verificar se já existe disputa aberta para este booking pelo mesmo utilizador
    const existing = await (this.prisma as any).dispute.findFirst({
      where: {
        bookingId: dto.bookingId,
        openedById: userId,
        status: { in: ['OPEN', 'REVIEWING'] },
      },
    });

    if (existing) {
      throw new BadRequestException('Já tens uma disputa aberta para esta reserva.');
    }

    return (this.prisma as any).dispute.create({
      data: {
        bookingId: dto.bookingId,
        openedById: userId,
        reason: dto.reason,
        description: dto.description,
      },
    });
  }

  async findMine(userId: string) {
    return (this.prisma as any).dispute.findMany({
      where: { openedById: userId },
      include: {
        booking: {
          include: {
            ride: {
              select: {
                origin: true,
                destination: true,
                departureTime: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
