import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { NotificationEvent } from './entities/notification-event.entity';
import { DeviceToken, DevicePlatform } from './entities/device-token.entity';
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

export interface RegisterDeviceTokenDto {
  deviceId: string;       // stable client-generated UUID (stored in SecureStore)
  platform: DevicePlatform;
  pushToken: string;
  appVersion?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEvent)
    private readonly notifRepo: Repository<NotificationEvent>,
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepo: Repository<DeviceToken>,
    @InjectQueue(PUSH_DISPATCH_QUEUE)
    private readonly pushQueue: Queue<PushDispatchJobData>,
    private readonly apnsAdapter: ApnsPushAdapter,
    private readonly fcmAdapter: FcmPushAdapter,
  ) {}

  /**
   * Register or update a push notification device token.
   * Upserts by (userId, deviceId) — one row per physical device.
   */
  async registerDeviceToken(userId: string, dto: RegisterDeviceTokenDto): Promise<void> {
    await this.deviceTokenRepo
      .createQueryBuilder()
      .insert()
      .into(DeviceToken)
      .values({
        userId,
        deviceId: dto.deviceId,
        platform: dto.platform,
        pushToken: dto.pushToken,
        appVersion: dto.appVersion ?? null,
      })
      .orUpdate(['push_token', 'platform', 'app_version', 'updated_at'], ['user_id', 'device_id'])
      .execute();

    this.logger.debug(`Device token registered for user ${userId} (${dto.platform})`);
  }

  /**
   * Remove a specific device token (e.g. on logout or when APNs reports it as stale).
   */
  async removeDeviceToken(userId: string, deviceId: string): Promise<void> {
    await this.deviceTokenRepo.delete({ userId, deviceId });
  }

  /**
   * Primärer Einstiegspunkt für alle Notifications.
   *
   * 1. Notification immer in DB speichern (In-App Notification Center — Source of Truth)
   * 2. Push-Dispatch als non-blocking BullMQ Job (darf fehlschlagen)
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
        attempts: 2,
        backoff: { type: 'fixed', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: { count: 10 },
      },
    );

    return notification;
  }

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
   * Called by the BullMQ PushDispatchProcessor.
   * Loads device tokens from DB, dispatches to APNs (iOS) and FCM (Android).
   * APNs is preferred over FCM — more reliable in China.
   * All errors are logged but never thrown (in-app notification is already persisted).
   */
  async dispatchPush(jobData: PushDispatchJobData): Promise<void> {
    const { notificationId, userId, title, body, data } = jobData;

    // Load all registered device tokens for this user
    const tokens = await this.deviceTokenRepo.find({ where: { userId } });

    if (tokens.length === 0) {
      this.logger.debug(`No device tokens for user ${userId} — in-app notification only`);
      return;
    }

    const apnsTokens = tokens.filter((t) => t.platform === 'apns').map((t) => t.pushToken);
    const fcmTokens = tokens.filter((t) => t.platform === 'fcm').map((t) => t.pushToken);

    let pushSuccess = false;
    let pushError: string | undefined;

    // ── iOS via APNs (preferred, works reliably in China) ──────────────────────
    if (apnsTokens.length > 0 && this.apnsAdapter.isConfigured()) {
      try {
        const result = await this.apnsAdapter.send({
          userId,
          deviceTokens: apnsTokens,
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

        // Remove stale tokens that APNs rejected
        if (result.failedTokens && result.failedTokens.length > 0) {
          await this.deviceTokenRepo
            .createQueryBuilder()
            .delete()
            .from(DeviceToken)
            .where('user_id = :userId AND push_token IN (:...stale)', {
              userId,
              stale: result.failedTokens,
            })
            .execute();
        }
      } catch (err) {
        this.logger.error(`APNs dispatch error: ${(err as Error).message}`);
        pushError = (err as Error).message;
      }
    }

    // ── Android via FCM (optional, unreliable in China behind GFW) ─────────────
    if (fcmTokens.length > 0 && this.fcmAdapter.isConfigured()) {
      try {
        const result = await this.fcmAdapter.send({
          userId,
          deviceTokens: fcmTokens,
          title,
          body,
          data: data as Record<string, string>,
        });

        if (result.success) {
          pushSuccess = true;
        } else {
          this.logger.debug(`FCM push failed (expected in China): ${result.error}`);
          if (!pushError) pushError = `FCM: ${result.error}`;
        }
      } catch (err) {
        this.logger.debug(`FCM dispatch error (non-critical): ${(err as Error).message}`);
      }
    }

    // Update notification with push delivery status
    await this.notifRepo.update(notificationId, {
      pushSent: pushSuccess,
      pushSentAt: pushSuccess ? new Date() : null,
      pushError: pushError ?? null,
    });
  }
}
