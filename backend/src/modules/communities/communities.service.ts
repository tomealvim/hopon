import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class CommunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private generateInviteCode(): string {
    return randomBytes(4).toString('hex').toUpperCase(); // ex: "A3F9C2B1"
  }

  async create(ownerId: string, dto: CreateCommunityDto) {
    const inviteCode = this.generateInviteCode();
    const community = await this.prisma.community.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        requiresApproval: dto.requiresApproval ?? true,
        domain: dto.domain ?? null,
        ownerId,
        inviteCode,
        members: {
          create: {
            userId: ownerId,
            role: 'OWNER',
            status: 'APPROVED',
            joinedAt: new Date(),
          },
        },
      },
      include: { members: { include: { user: { include: { profile: true } } } } },
    });
    return community;
  }

  async findMine(userId: string) {
    const memberships = await this.prisma.communityMember.findMany({
      where: { userId, status: 'APPROVED' },
      include: {
        community: {
          include: {
            _count: { select: { members: { where: { status: 'APPROVED' } } } },
          },
        },
      },
    });
    return memberships.map((m) => ({
      ...m.community,
      memberCount: m.community._count.members,
      myRole: m.role,
    }));
  }

  async findByInviteCode(inviteCode: string) {
    const community = await this.prisma.community.findUnique({
      where: { inviteCode },
      include: {
        owner: { include: { profile: true } },
        _count: { select: { members: { where: { status: 'APPROVED' } } } },
      },
    });
    if (!community) throw new NotFoundException('Comunidade não encontrada');
    return { ...community, memberCount: community._count.members };
  }

  async join(userId: string, inviteCode: string) {
    const community = await this.prisma.community.findUnique({ where: { inviteCode } });
    if (!community) throw new NotFoundException('Código de convite inválido');

    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    const requesterName = requester?.profile?.name ?? requester?.email ?? 'Alguém';

    const existing = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: community.id, userId } },
    });
    if (existing) {
      if (existing.status === 'APPROVED') throw new ConflictException('Já és membro desta comunidade');
      if (existing.status === 'PENDING') throw new ConflictException('O teu pedido já está pendente');
      // REJECTED — allow re-apply
      const newStatus = community.requiresApproval ? 'PENDING' : 'APPROVED';
      await this.prisma.communityMember.update({
        where: { id: existing.id },
        data: { status: newStatus, joinedAt: newStatus === 'APPROVED' ? new Date() : null },
      });
      if (newStatus === 'PENDING') {
        void this.notificationsService.createNotification(
          community.ownerId,
          'community.join_request',
          `Novo pedido em ${community.name}`,
          `${requesterName} quer entrar na comunidade.`,
          { communityId: community.id, userId },
        );
      }
      return { status: newStatus };
    }

    const status = community.requiresApproval ? 'PENDING' : 'APPROVED';
    await this.prisma.communityMember.create({
      data: {
        communityId: community.id,
        userId,
        role: 'MEMBER',
        status,
        joinedAt: status === 'APPROVED' ? new Date() : null,
      },
    });

    if (status === 'PENDING') {
      void this.notificationsService.createNotification(
        community.ownerId,
        'community.join_request',
        `Novo pedido em ${community.name}`,
        `${requesterName} quer entrar na comunidade.`,
        { communityId: community.id, userId },
      );
    }

    return { status, communityName: community.name };
  }

  async getMembers(requesterId: string, communityId: string) {
    // must be APPROVED member
    const membership = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: requesterId } },
    });
    if (!membership || membership.status !== 'APPROVED') throw new ForbiddenException('Não tens acesso a esta comunidade');

    return this.prisma.communityMember.findMany({
      where: { communityId },
      include: { user: { include: { profile: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveMember(ownerId: string, communityId: string, userId: string) {
    const community = await this.assertOwner(ownerId, communityId);
    const member = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    if (!member) throw new NotFoundException('Membro não encontrado');
    const updated = await this.prisma.communityMember.update({
      where: { id: member.id },
      data: { status: 'APPROVED', joinedAt: new Date() },
    });
    void this.notificationsService.createNotification(
      userId,
      'community.approved',
      `Entraste em ${community.name}!`,
      `O teu pedido foi aceite. Já podes ver boleias de colegas no Discover.`,
      { communityId },
    );
    return updated;
  }

  async rejectMember(ownerId: string, communityId: string, userId: string) {
    const community = await this.assertOwner(ownerId, communityId);
    const member = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    if (!member) throw new NotFoundException('Membro não encontrado');
    const updated = await this.prisma.communityMember.update({
      where: { id: member.id },
      data: { status: 'REJECTED' },
    });
    void this.notificationsService.createNotification(
      userId,
      'community.rejected',
      `Pedido recusado`,
      `O teu pedido para entrar em ${community.name} foi recusado.`,
      { communityId },
    );
    return updated;
  }

  async removeMember(ownerId: string, communityId: string, userId: string) {
    const community = await this.assertOwner(ownerId, communityId);
    if (ownerId === userId) throw new ForbiddenException('O owner não pode sair da comunidade');
    await this.prisma.communityMember.deleteMany({ where: { communityId, userId } });
    void this.notificationsService.createNotification(
      userId,
      'community.removed',
      `Removido de ${community.name}`,
      `Foste removido da comunidade pelo owner.`,
      { communityId },
    );
    return { ok: true };
  }

  async leave(userId: string, communityId: string) {
    const member = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    if (!member) throw new NotFoundException('Não és membro desta comunidade');
    if (member.role === 'OWNER') throw new ForbiddenException('O owner não pode sair da comunidade. Transfere a liderança primeiro.');
    await this.prisma.communityMember.delete({ where: { id: member.id } });
    return { ok: true };
  }

  async regenerateInviteCode(ownerId: string, communityId: string) {
    await this.assertOwner(ownerId, communityId);
    const newCode = this.generateInviteCode();
    return this.prisma.community.update({
      where: { id: communityId },
      data: { inviteCode: newCode },
      select: { inviteCode: true },
    });
  }

  /** Devolve IDs de utilizadores aprovados em comunidades partilhadas com userId */
  async getSharedCommunityUserIds(userId: string): Promise<string[]> {
    const map = await this.getSharedCommunityMap(userId);
    return [...map.keys()];
  }

  /** Devolve Map<otherUserId, { id, name }> para badge "Na tua comunidade" */
  async getSharedCommunityMap(userId: string): Promise<Map<string, { id: string; name: string }>> {
    const myMemberships = await this.prisma.communityMember.findMany({
      where: { userId, status: 'APPROVED' },
      include: { community: { select: { id: true, name: true } } },
    });
    if (myMemberships.length === 0) return new Map();

    const communityIds = myMemberships.map((m) => m.communityId);
    const otherMembers = await this.prisma.communityMember.findMany({
      where: { communityId: { in: communityIds }, status: 'APPROVED', userId: { not: userId } },
      select: { userId: true, communityId: true },
    });

    const communityById = new Map(myMemberships.map((m) => [m.communityId, { id: m.community.id, name: m.community.name }]));
    const result = new Map<string, { id: string; name: string }>();
    for (const m of otherMembers) {
      if (!result.has(m.userId)) {
        result.set(m.userId, communityById.get(m.communityId)!);
      }
    }
    return result;
  }

  private async assertOwner(userId: string, communityId: string) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new NotFoundException('Comunidade não encontrada');
    if (community.ownerId !== userId) throw new ForbiddenException('Só o owner pode fazer esta ação');
    return community;
  }
}
