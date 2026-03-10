import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class CommunitiesService {
  constructor(private readonly prisma: PrismaService) {}

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

    const existing = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: community.id, userId } },
    });
    if (existing) {
      if (existing.status === 'APPROVED') throw new ConflictException('Já és membro desta comunidade');
      if (existing.status === 'PENDING') throw new ConflictException('O teu pedido já está pendente');
      // REJECTED — allow re-apply
      await this.prisma.communityMember.update({
        where: { id: existing.id },
        data: { status: community.requiresApproval ? 'PENDING' : 'APPROVED', joinedAt: community.requiresApproval ? null : new Date() },
      });
      return { status: community.requiresApproval ? 'PENDING' : 'APPROVED' };
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
    await this.assertOwner(ownerId, communityId);
    const member = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    if (!member) throw new NotFoundException('Membro não encontrado');
    return this.prisma.communityMember.update({
      where: { id: member.id },
      data: { status: 'APPROVED', joinedAt: new Date() },
    });
  }

  async rejectMember(ownerId: string, communityId: string, userId: string) {
    await this.assertOwner(ownerId, communityId);
    const member = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    if (!member) throw new NotFoundException('Membro não encontrado');
    return this.prisma.communityMember.update({
      where: { id: member.id },
      data: { status: 'REJECTED' },
    });
  }

  async removeMember(ownerId: string, communityId: string, userId: string) {
    await this.assertOwner(ownerId, communityId);
    if (ownerId === userId) throw new ForbiddenException('O owner não pode sair da comunidade');
    await this.prisma.communityMember.deleteMany({ where: { communityId, userId } });
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
    const myMemberships = await this.prisma.communityMember.findMany({
      where: { userId, status: 'APPROVED' },
      select: { communityId: true },
    });
    const communityIds = myMemberships.map((m) => m.communityId);
    if (communityIds.length === 0) return [];

    const otherMembers = await this.prisma.communityMember.findMany({
      where: { communityId: { in: communityIds }, status: 'APPROVED', userId: { not: userId } },
      select: { userId: true },
    });
    return [...new Set(otherMembers.map((m) => m.userId))];
  }

  private async assertOwner(userId: string, communityId: string) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new NotFoundException('Comunidade não encontrada');
    if (community.ownerId !== userId) throw new ForbiddenException('Só o owner pode fazer esta ação');
  }
}
