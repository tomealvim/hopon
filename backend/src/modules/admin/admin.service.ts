import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getReports(status?: string) {
    const where = status ? { status } : {};
    const reports = await this.prisma.report.findMany({
      where,
      include: {
        reporter: { select: { id: true, email: true, profile: { select: { name: true } } } },
        target: { select: { id: true, email: true, profile: { select: { name: true } }, suspendedAt: true, isIdentityVerified: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt,
      reporter: { id: r.reporter.id, email: r.reporter.email, name: r.reporter.profile?.name },
      target: { id: r.target.id, email: r.target.email, name: r.target.profile?.name, suspendedAt: r.target.suspendedAt, isIdentityVerified: r.target.isIdentityVerified },
    }));
  }

  async updateReportStatus(reportId: string, status: string) {
    const valid = ['PENDING', 'REVIEWED', 'DISMISSED'];
    if (!valid.includes(status)) throw new BadRequestException('Estado inválido.');
    return this.prisma.report.update({ where: { id: reportId }, data: { status } });
  }

  async suspendUser(adminId: string, targetId: string, reason: string) {
    if (adminId === targetId) throw new BadRequestException('Não podes suspender-te a ti mesmo.');
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');
    await this.prisma.user.update({ where: { id: targetId }, data: { suspendedAt: new Date(), suspensionReason: reason } });
    return { message: `Utilizador ${targetId} suspenso.` };
  }

  async unsuspendUser(targetId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');
    await this.prisma.user.update({ where: { id: targetId }, data: { suspendedAt: null, suspensionReason: null } });
    return { message: `Utilizador ${targetId} reativado.` };
  }

  async verifyUser(targetId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');
    await this.prisma.user.update({ where: { id: targetId }, data: { isIdentityVerified: true } });
    return { message: `Utilizador ${targetId} verificado.` };
  }

  async unverifyUser(targetId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');
    await this.prisma.user.update({ where: { id: targetId }, data: { isIdentityVerified: false } });
    return { message: `Verificação de ${targetId} removida.` };
  }
}
