import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Notifica utilizadores quando uma boleia é cancelada/apagada
   * @param rideId ID da boleia que foi cancelada
   * @param rideOrigin Origem da boleia
   * @param rideDestination Destino da boleia
   * @param rideDepartureTime Data/hora de partida
   * @param affectedUserIds IDs dos utilizadores que tinham reservas nesta boleia
   */
  async notifyRideCancelled(
    rideId: string,
    rideOrigin: string,
    rideDestination: string,
    rideDepartureTime: Date,
    affectedUserIds: string[],
  ) {
    if (affectedUserIds.length === 0) {
      return;
    }

    // Buscar informações dos utilizadores para notificação
    const users = await this.prisma.user.findMany({
      where: { id: { in: affectedUserIds } },
      include: { profile: true },
    });

    // Por agora, apenas logamos (no futuro: email, SMS, push notifications)
    this.logger.log(
      `Boleia cancelada: ${rideOrigin} → ${rideDestination} (${rideDepartureTime.toISOString()})`,
    );
    this.logger.log(`Notificando ${users.length} utilizador(es) afetado(s):`);

    for (const user of users) {
      const userName = user.profile?.name || user.email;
      this.logger.log(`  - ${userName} (${user.email})`);

      // TODO: Implementar envio real de notificações
      // - Email transacional (SendGrid, Resend, etc.)
      // - SMS (Twilio, etc.)
      // - Push notifications (Firebase, OneSignal, etc.)
      // - In-app notifications (criar tabela Notification)
    }

    // TODO: Criar registos de notificação na BD quando tivermos modelo Notification
    // await this.prisma.notification.createMany({
    //   data: users.map(user => ({
    //     userId: user.id,
    //     type: 'RIDE_CANCELLED',
    //     title: 'Boleia cancelada',
    //     message: `A boleia de ${rideOrigin} para ${rideDestination} foi cancelada.`,
    //     metadata: { rideId },
    //   })),
    // });
  }
}

