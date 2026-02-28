import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getConversations(userId: string) {
    const participations = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            ride: true,
            participants: {
              include: { user: { include: { profile: true } } },
            },
            messages: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    return participations.map((p) => this.toConversationResponse(p, userId));
  }

  async getMessages(userId: string, conversationId: string) {
    const participation = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!participation) throw new ForbiddenException('Acesso negado');

    const messages = await this.prisma.message.findMany({
      where: { conversationId, deletedAt: null },
      include: { sender: { include: { profile: true } } },
      orderBy: { createdAt: 'asc' },
    });

    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });

    return messages.map((m) => this.toMessageResponse(m));
  }

  async sendMessage(userId: string, conversationId: string, body: string) {
    const participation = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      include: {
        conversation: {
          include: { participants: true },
        },
      },
    });

    if (!participation) throw new ForbiddenException('Acesso negado');

    const message = await this.prisma.message.create({
      data: { conversationId, senderId: userId, body, type: 'text' },
      include: { sender: { include: { profile: true } } },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const response = this.toMessageResponse(message);

    const senderName = message.sender?.profile?.name ?? message.sender?.email ?? 'Alguém';

    // Emitir SSE para todos os participantes excepto o remetente
    const otherParticipants = participation.conversation.participants
      .filter((p) => p.userId !== userId)
      .map((p) => p.userId);

    this.eventsService.emitToMany(otherParticipants, 'message.new', {
      conversationId,
      message: response,
    });

    // Notificação in-app para os outros participantes
    for (const recipientId of otherParticipants) {
      void this.notificationsService.createNotification(
        recipientId,
        'message.new',
        'Nova mensagem',
        `${senderName}: ${body.length > 60 ? body.slice(0, 60) + '…' : body}`,
        { conversationId },
      );
    }

    return response;
  }

  async markAsRead(userId: string, conversationId: string) {
    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });
    return { success: true };
  }

  async createConversationForBooking(
    bookingId: string,
    rideId: string,
    driverId: string,
    passengerId: string,
  ) {
    const existing = await this.prisma.conversation.findUnique({
      where: { bookingId },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        rideId,
        bookingId,
        participants: {
          create: [{ userId: driverId }, { userId: passengerId }],
        },
      },
    });
  }

  private toConversationResponse(participation: any, userId: string) {
    const conv = participation.conversation;
    const lastMessage = conv.messages[0] ?? null;
    const lastReadAt = participation.lastReadAt;

    const hasUnread =
      lastMessage &&
      lastMessage.senderId !== userId &&
      (!lastReadAt || new Date(lastMessage.createdAt) > new Date(lastReadAt));

    return {
      id: conv.id,
      rideId: conv.rideId,
      bookingId: conv.bookingId,
      ride: conv.ride
        ? {
            id: conv.ride.id,
            origin: conv.ride.origin,
            destination: conv.ride.destination,
            departureTime: conv.ride.departureTime,
          }
        : null,
      participants: conv.participants.map((p: any) => ({
        userId: p.userId,
        name: p.user?.profile?.name ?? p.user?.email ?? 'Utilizador',
        avatarUrl: p.user?.profile?.avatarUrl ?? null,
        lastReadAt: p.lastReadAt,
      })),
      lastMessage: lastMessage ? this.toMessageResponse(lastMessage) : null,
      hasUnread: !!hasUnread,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    };
  }

  private toMessageResponse(message: any) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      type: message.type,
      body: message.body,
      metadata: message.metadata ?? null,
      sender: {
        id: message.senderId,
        name: message.sender?.profile?.name ?? message.sender?.email ?? 'Utilizador',
        avatarUrl: message.sender?.profile?.avatarUrl ?? null,
      },
      createdAt: message.createdAt,
    };
  }
}
