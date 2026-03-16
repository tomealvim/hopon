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

  async getMetrics() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7 = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers, newToday, newWeek, newMonth, suspended, verified,
      totalRides, ridesWeek, scheduled, completed, cancelledRides,
      totalBookings, confirmedBookings, cancelledBookings,
      pendingDisputes, pendingPayouts, pendingVerifications, pendingLicenses,
      topRoutes, walletAgg,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.user.count({ where: { createdAt: { gte: last7 } } }),
      this.prisma.user.count({ where: { createdAt: { gte: last30 } } }),
      this.prisma.user.count({ where: { suspendedAt: { not: null } } }),
      this.prisma.user.count({ where: { isIdentityVerified: true } }),
      this.prisma.ride.count(),
      this.prisma.ride.count({ where: { createdAt: { gte: last7 } } }),
      this.prisma.ride.count({ where: { status: 'SCHEDULED' } }),
      this.prisma.ride.count({ where: { status: 'COMPLETED' } }),
      this.prisma.ride.count({ where: { cancelledAt: { not: null } } }),
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      this.prisma.booking.count({ where: { status: 'CANCELLED' } }),
      (this.prisma as any).dispute.count({ where: { status: 'OPEN' } }),
      (this.prisma as any).payoutRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.user.count({ where: { identityDocumentStatus: 'PENDING' } }),
      this.prisma.user.count({ where: { driverLicenseStatus: 'PENDING' } }),
      this.prisma.ride.groupBy({
        by: ['origin', 'destination'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.wallet.aggregate({ _sum: { balance: true } }),
    ]);

    const cancellationRate =
      totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 1000) / 10 : 0;

    return {
      users: { total: totalUsers, newToday, newWeek, newMonth, suspended, verified },
      rides: { total: totalRides, thisWeek: ridesWeek, scheduled, completed, cancelled: cancelledRides },
      bookings: { total: totalBookings, confirmed: confirmedBookings, cancelled: cancelledBookings, cancellationRate },
      pending: { disputes: pendingDisputes, payouts: pendingPayouts, verifications: pendingVerifications, licenses: pendingLicenses },
      topRoutes: topRoutes.map((r) => ({ origin: r.origin, destination: r.destination, count: r._count.id })),
      totalWalletBalance: walletAgg._sum.balance ?? 0,
    };
  }

  async getUsers(search?: string, page = 1, limit = 20, filter?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { profile: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (filter === 'suspended') where.suspendedAt = { not: null };
    if (filter === 'verified') where.isIdentityVerified = true;
    if (filter === 'admin') where.isAdmin = true;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          isAdmin: true,
          isIdentityVerified: true,
          identityDocumentStatus: true,
          driverLicenseStatus: true,
          suspendedAt: true,
          suspensionReason: true,
          createdAt: true,
          profile: { select: { name: true, avatarUrl: true } },
          _count: { select: { offeredRides: true, bookings: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.profile?.name,
        avatarUrl: u.profile?.avatarUrl,
        isAdmin: u.isAdmin,
        isIdentityVerified: u.isIdentityVerified,
        identityDocumentStatus: u.identityDocumentStatus,
        driverLicenseStatus: u.driverLicenseStatus,
        suspendedAt: u.suspendedAt,
        suspensionReason: u.suspensionReason,
        createdAt: u.createdAt,
        ridesOffered: u._count.offeredRides,
        bookingsMade: u._count.bookings,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getRides(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = status ? { status } : {};

    const [rides, total] = await Promise.all([
      this.prisma.ride.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          origin: true,
          destination: true,
          departureTime: true,
          status: true,
          availableSeats: true,
          price: true,
          createdAt: true,
          cancelledAt: true,
          driver: { select: { id: true, email: true, profile: { select: { name: true } } } },
          _count: { select: { bookings: true } },
        },
        orderBy: { departureTime: 'desc' },
      }),
      this.prisma.ride.count({ where }),
    ]);

    return {
      rides: rides.map((r) => ({
        id: r.id,
        origin: r.origin,
        destination: r.destination,
        departureTime: r.departureTime,
        status: r.status,
        availableSeats: r.availableSeats,
        price: r.price,
        createdAt: r.createdAt,
        cancelledAt: r.cancelledAt,
        driver: { id: r.driver.id, email: r.driver.email, name: r.driver.profile?.name },
        bookingsCount: r._count.bookings,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
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
