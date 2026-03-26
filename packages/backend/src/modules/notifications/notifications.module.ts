import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsController } from './notifications.controller';
import { NotificationsService, PUSH_DISPATCH_QUEUE } from './notifications.service';
import { PushDispatchProcessor } from './jobs/push-dispatch.processor';
import { ApnsPushAdapter } from './adapters/apns.adapter';
import { FcmPushAdapter } from './adapters/fcm.adapter';
import { NotificationEvent } from './entities/notification-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEvent]),
    BullModule.registerQueue({ name: PUSH_DISPATCH_QUEUE }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushDispatchProcessor, ApnsPushAdapter, FcmPushAdapter],
  exports: [NotificationsService],
})
export class NotificationsModule {}
