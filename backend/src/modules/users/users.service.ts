import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany();
  }

  async findPublicProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        isIdentityVerified: true,
        createdAt: true,
        profile: {
          select: {
            name: true,
            username: true,
            avatarUrl: true,
            bio: true,
          },
        },
        ratingsReceived: {
          select: { score: true, comment: true, tags: true, createdAt: true, reviewer: { select: { profile: { select: { name: true, avatarUrl: true } } } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { offeredRides: true },
        },
      },
    });

    if (!user) throw new NotFoundException('Utilizador não encontrado');

    const ratings = user.ratingsReceived;
    const avgRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((s, r) => s + r.score, 0) / ratings.length) * 10) / 10
        : null;

    return {
      id: user.id,
      isIdentityVerified: user.isIdentityVerified,
      memberSince: user.createdAt,
      profile: user.profile,
      totalRides: user._count.offeredRides,
      avgRating,
      totalRatings: ratings.length,
      recentRatings: ratings.map((r) => ({
        score: r.score,
        comment: r.comment,
        tags: r.tags,
        createdAt: r.createdAt,
        reviewer: {
          name: r.reviewer?.profile?.name ?? 'Utilizador',
          avatarUrl: r.reviewer?.profile?.avatarUrl ?? null,
        },
      })),
    };
  }
}

