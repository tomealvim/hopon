import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReportDto) {
    if (userId === dto.targetId) {
      throw new BadRequestException('Não podes denunciar-te a ti mesmo.');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: dto.targetId },
    });
    if (!target) throw new NotFoundException('Utilizador não encontrado.');

    const report = await this.prisma.report.create({
      data: {
        userId,
        targetId: dto.targetId,
        reason: dto.reason,
        details: dto.details ?? null,
      },
    });

    return {
      id: report.id,
      status: report.status,
      createdAt: report.createdAt,
    };
  }
}
