import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRatingDto } from './dto/create-rating.dto';

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(reviewerId: string, dto: CreateRatingDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { ride: true },
    });

    if (!booking) throw new NotFoundException('Reserva não encontrada');

    const isPassenger = booking.userId === reviewerId;
    const isDriver = booking.ride.driverId === reviewerId;

    if (!isPassenger && !isDriver) {
      throw new ForbiddenException('Não és participante nesta boleia');
    }

    const expectedRevieweeId = isPassenger
      ? booking.ride.driverId
      : booking.userId;

    if (dto.revieweeId !== expectedRevieweeId) {
      throw new BadRequestException('Destinatário da avaliação inválido');
    }

    try {
      return await this.prisma.rating.create({
        data: {
          bookingId: dto.bookingId,
          reviewerId,
          revieweeId: dto.revieweeId,
          score: dto.score,
          tags: dto.tags ?? null,
          comment: dto.comment ?? null,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Já avaliaste esta viagem');
      }
      throw error;
    }
  }

  async getUserRatings(userId: string) {
    const ratings = await this.prisma.rating.findMany({
      where: { revieweeId: userId },
      include: {
        reviewer: { include: { profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const average =
      ratings.length > 0
        ? Math.round((ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length) * 10) / 10
        : null;

    return {
      average,
      total: ratings.length,
      ratings: ratings.map((r) => ({
        id: r.id,
        score: r.score,
        tags: r.tags as string[] | null,
        comment: r.comment,
        createdAt: r.createdAt,
        reviewer: {
          id: r.reviewerId,
          name: r.reviewer?.profile?.name ?? r.reviewer?.email ?? 'Utilizador',
          avatarUrl: r.reviewer?.profile?.avatarUrl ?? null,
        },
      })),
    };
  }
}
