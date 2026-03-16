import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
  ) {}

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
    await this.prisma.user.update({
      where: { id: targetId },
      data: {
        isIdentityVerified: true,
        identityDocumentStatus: 'VERIFIED',
      },
    });
    void this.notificationsService.createNotification(
      targetId,
      'identity.verified',
      'Identidade verificada',
      'A tua identidade foi verificada com sucesso. Apareces agora com o selo de verificado.',
    );
    return { message: `Utilizador ${targetId} verificado.` };
  }

  async unverifyUser(targetId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');
    await this.prisma.user.update({
      where: { id: targetId },
      data: { isIdentityVerified: false, identityDocumentStatus: 'NONE' },
    });
    return { message: `Verificação de ${targetId} removida.` };
  }

  async getPendingVerifications() {
    const users = await this.prisma.user.findMany({
      where: { identityDocumentStatus: 'PENDING' },
      select: {
        id: true,
        email: true,
        identityDocumentUrl: true,
        identityDocumentType: true,
        identityDocumentStatus: true,
        createdAt: true,
        profile: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.profile?.name,
      identityDocumentUrl: u.identityDocumentUrl,
      identityDocumentType: u.identityDocumentType,
      identityDocumentStatus: u.identityDocumentStatus,
      createdAt: u.createdAt,
    }));
  }

  async rejectVerification(targetId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');
    await this.prisma.user.update({
      where: { id: targetId },
      data: { identityDocumentStatus: 'REJECTED' },
    });
    void this.notificationsService.createNotification(
      targetId,
      'identity.rejected',
      'Verificação de identidade rejeitada',
      'O teu documento de identificação foi rejeitado. Por favor, envia um documento válido e legível.',
    );
    return { message: `Verificação de ${targetId} rejeitada.` };
  }

  async getPendingDriverLicenses() {
    const users = await this.prisma.user.findMany({
      where: { driverLicenseStatus: 'PENDING' },
      select: {
        id: true,
        email: true,
        driverLicenseUrl: true,
        driverLicenseStatus: true,
        driverLicenseCcNumber: true,
        createdAt: true,
        profile: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.profile?.name,
      driverLicenseUrl: u.driverLicenseUrl,
      driverLicenseStatus: u.driverLicenseStatus,
      driverLicenseCcNumber: u.driverLicenseCcNumber,
      createdAt: u.createdAt,
    }));
  }

  async approveDriverLicense(targetId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');
    if (user.driverLicenseStatus !== 'PENDING') {
      throw new BadRequestException('Carta de condução não está pendente de verificação.');
    }
    await this.prisma.user.update({
      where: { id: targetId },
      data: { driverLicenseStatus: 'APPROVED', driverLicenseAdminNote: null },
    });
    void this.notificationsService.createNotification(
      targetId,
      'driver_license.approved',
      'Carta de condução verificada',
      'A tua carta de condução foi verificada com sucesso. Já podes adicionar veículos e oferecer boleias.',
    );
    return { message: `Carta de condução de ${targetId} aprovada.` };
  }

  async rejectDriverLicense(targetId: string, adminNote?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');
    await this.prisma.user.update({
      where: { id: targetId },
      data: {
        driverLicenseStatus: 'REJECTED',
        driverLicenseAdminNote: adminNote ?? null,
      },
    });
    const noteText = adminNote ? ` Motivo: ${adminNote}` : '';
    void this.notificationsService.createNotification(
      targetId,
      'driver_license.rejected',
      'Carta de condução rejeitada',
      `O teu documento foi rejeitado.${noteText} Por favor, envia um documento válido e legível.`,
    );
    return { message: `Carta de condução de ${targetId} rejeitada.` };
  }

  async getDisputes(status?: string) {
    const where = status ? { status } : {};
    const disputes = await (this.prisma as any).dispute.findMany({
      where,
      include: {
        openedBy: {
          select: { id: true, email: true, profile: { select: { name: true } } },
        },
        booking: {
          include: {
            ride: {
              select: { origin: true, destination: true, departureTime: true, driverId: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return disputes;
  }

  async resolveDispute(disputeId: string, dto: ResolveDisputeDto) {
    const dispute = await (this.prisma as any).dispute.findUnique({
      where: { id: disputeId },
      include: {
        booking: {
          include: {
            ride: { select: { origin: true, destination: true } },
          },
        },
      },
    });

    if (!dispute) throw new NotFoundException('Disputa não encontrada.');
    if (dispute.status === 'RESOLVED' || dispute.status === 'DISMISSED') {
      throw new BadRequestException('Disputa já foi resolvida.');
    }

    const newStatus = dto.action === 'REFUND' ? 'RESOLVED' : 'DISMISSED';

    if (dto.action === 'REFUND') {
      if (!dto.refundAmount || dto.refundAmount <= 0) {
        throw new BadRequestException('Indica o valor do reembolso.');
      }
      await this.walletService.refund(
        dispute.booking.userId,
        dto.refundAmount,
        `Reembolso — disputa ${disputeId}`,
        disputeId,
      );
    }

    await (this.prisma as any).dispute.update({
      where: { id: disputeId },
      data: {
        status: newStatus,
        resolution: dto.resolution,
        refundAmount: dto.refundAmount ?? null,
      },
    });

    // Notificar o utilizador que abriu a disputa
    const notifTitle =
      dto.action === 'REFUND' ? 'Disputa resolvida — reembolso processado' : 'Disputa encerrada';
    const notifBody =
      dto.action === 'REFUND'
        ? `A tua disputa foi resolvida. Foi creditado €${dto.refundAmount?.toFixed(2)} na tua carteira.`
        : `A tua disputa foi analisada: ${dto.resolution}`;

    void this.notificationsService.createNotification(
      dispute.openedById,
      'dispute.resolved',
      notifTitle,
      notifBody,
      { disputeId, action: dto.action },
    );

    return { message: `Disputa ${disputeId} ${newStatus.toLowerCase()}.` };
  }

  async getPayoutRequests(status?: string) {
    const where = status ? { status } : {};
    return (this.prisma as any).payoutRequest.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, profile: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async processPayoutRequest(requestId: string, dto: { status: string; adminNote?: string }) {
    const validStatuses = ['APPROVED', 'PROCESSED', 'REJECTED'];
    if (!validStatuses.includes(dto.status)) {
      throw new BadRequestException('Estado inválido. Use APPROVED, PROCESSED ou REJECTED.');
    }

    const request = await (this.prisma as any).payoutRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!request) throw new NotFoundException('Pedido de saque não encontrado.');
    if (request.status === 'PROCESSED') {
      throw new BadRequestException('Pedido já foi processado.');
    }

    // Se rejeitado: devolver saldo ao condutor
    if (dto.status === 'REJECTED' && request.status !== 'REJECTED') {
      await this.walletService.refund(
        request.userId,
        request.amount,
        `Pedido de saque rejeitado — ${dto.adminNote ?? 'sem nota'}`,
        requestId,
      );
    }

    await (this.prisma as any).payoutRequest.update({
      where: { id: requestId },
      data: { status: dto.status, adminNote: dto.adminNote ?? null },
    });

    const notifMap: Record<string, [string, string]> = {
      APPROVED: ['Saque aprovado', 'O teu pedido de saque foi aprovado e será processado em breve.'],
      PROCESSED: ['Saque processado', `O teu saque de €${request.amount.toFixed(2)} foi enviado para o IBAN indicado.`],
      REJECTED: ['Saque rejeitado', `O teu pedido de saque foi rejeitado. ${dto.adminNote ? `Motivo: ${dto.adminNote}` : ''} O valor foi devolvido à tua carteira.`],
    };

    const [title, body] = notifMap[dto.status];
    void this.notificationsService.createNotification(request.userId, 'payout.update', title, body, { requestId, status: dto.status });

    return { message: `Pedido ${requestId} atualizado para ${dto.status}.` };
  }
}
