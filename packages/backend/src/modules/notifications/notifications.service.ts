import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { NotificationEvent } from './entities/notification-event.entity';
import { SendNotificationDto, NotificationQueryDto } from './dto/notifications.dto';
import { ApnsPushAdapter } from './adapters/apns.adapter';
import { FcmPushAdapter } from './adapters/fcm.adapter';

export const PUSH_DISPATCH_QUEUE = 'push-dispatch';

export interface PushDispatchJobData {
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEvent)
    private readonly notifRepo: Repository<NotificationEvent>,
    @InjectQueue(PUSH_DISPATCH_QUEUE)
    private readonly pushQueue: Queue<PushDispatchJobData>,
    private readonly apnsAdapter: ApnsPushAdapter,
    private readonly fcmAdapter: FcmPushAdapter,
  ) {}

  /**
   * Primärer Einstiegspunkt für alle Notifications.
   *
   * Schritte:
   * 1. Notification immer in DB speichern (In-App Notification Center)
   * 2. Push-Dispatch als non-blocking BullMQ Job
   *
   * Das In-App Notification Center ist die Source of Truth.
   * Push ist ein Enhancement, das fehlschlagen darf.
   */
  async send(dto: SendNotificationDto): Promise<NotificationEvent> {
    const notification = await this.notifRepo.save(
      this.notifRepo.create({
        userId: dto.userId,
        familyId: dto.familyId ?? null,
        type: dto.type,
        title: dto.title,
        body: dto.body ?? null,
        data: dto.data ?? null,
      }),
    );

    // Push als fire-and-forget (kein await, kein blocking)
    await this.pushQueue.add(
      'push-dispatch',
      {
        notificationId: notification.id,
        userId: dto.userId,
        title: dto.title,
        body: dto.body ?? '',
        data: dto.data as Record<string, string> | undefined,
      },
      {
        attempts: 2, // Nur 2 Versuche - Push ist optional
        backoff: { type: 'fixed', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: { count: 10 },
      },
    );

    return notification;
  }

  /**
   * Event-Listener: Empfängt domain events von anderen Modulen.
   * Alle Module emittieren 'notification.send' Events statt direkt zu importieren.
   */
  @OnEvent('notification.send')
  async handleNotificationEvent(payload: SendNotificationDto): Promise<void> {
    try {
      await this.send(payload);
    } catch (err) {
      this.logger.error(`Failed to process notification event: ${(err as Error).message}`);
    }
  }

  async getNotifications(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<{ items: NotificationEvent[]; total: number; unreadCount: number }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.notifRepo
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId })
      .orderBy('n.created_at', 'DESC');

    if (query.unreadOnly) {
      qb.andWhere('n.is_read = false');
    }

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const unreadCount = await this.notifRepo.count({
      where: { userId, isRead: false },
    });

    return { items, total, unreadCount };
  }

  async markAsRead(userId: string, ids: string[]): Promise<void> {
    await this.notifRepo
      .createQueryBuilder()
      .update()
      .set({ isRead: true, readAt: new Date() })
      .where('id IN (:...ids)', { ids })
      .andWhere('user_id = :userId', { userId })
      .execute();
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notifRepo.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notifRepo.count({ where: { userId, isRead: false } });
  }

  /**
   * Wird vom Push-Dispatch-Job aufgerufen.
   * Kapselt APNs + FCM Dispatch.
   * Fehler werden in der DB protokolliert, aber nicht geworfen.
   */
  async dispatchPush(jobData: PushDispatchJobData): Promise<void> {
    const { notificationId, userId, title, body, data } = jobData;

    // TODO: Device-Tokens aus User-Settings laden
    // Derzeit Platzhalter - wird mit Device-Token-Management in Phase H ergänzt
    const deviceTokens: { token: string; platform: 'ios' | 'android' }[] = [];

    if (deviceTokens.length === 0) {
      this.logger.debug(`No device tokens for user ${userId} - in-app notification only`);
      return;
    }

    const iosTokens = deviceTokens.filter((d) => d.platform === 'ios').map((d) => d.token);
    const androidTokens = deviceTokens.filter((d) => d.platform === 'android').map((d) => d.token);

    let pushSuccess = false;
    let pushError: string | undefined;

    // iOS via APNs
    if (iosTokens.length > 0 && this.apnsAdapter.isConfigured()) {
      const result = await this.apnsAdapter.send({
        userId,
        deviceTokens: iosTokens,
        title,
        body,
        data: data as Record<string, string>,
      });

      if (result.success) {
        pushSuccess = true;
      } else {
        pushError = `APNs: ${result.error}`;
        this.logger.warn(`APNs push failed for user ${userId}: ${result.error}`);
      }
    }

    // Android via FCM (optional, unzuverlässig in China)
    if (androidTokens.length > 0 && this.fcmAdapter.isConfigured()) {
      const result = await this.fcmAdapter.send({
        userId,
        deviceTokens: androidTokens,
        title,
        body,
        data: data as Record<string, string>,
      });

      if (result.success) {
        pushSuccess = true;
      } else {
        // FCM-Fehler in China sind normal und erwartet
        this.logger.debug(`FCM push failed (expected in China): ${result.error}`);
        if (!pushError) pushError = `FCM: ${result.error}`;
      }
    }

    // Push-Status in DB aktualisieren
    await this.notifRepo.update(notificationId, {
      pushSent: pushSuccess,
      pushSentAt: pushSuccess ? new Date() : null,
      pushError: pushError ?? null,
    });
  }
}
