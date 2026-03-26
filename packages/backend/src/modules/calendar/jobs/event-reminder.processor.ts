import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventReminder } from '../entities/event-reminder.entity';

export const EVENT_REMINDER_QUEUE = 'event-reminders';

export interface EventReminderJobData {
  reminderId: string;
  eventId: string;
  userId: string;
  familyId: string;
  eventTitle: string;
  startAt: string;
}

@Processor(EVENT_REMINDER_QUEUE)
export class EventReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(EventReminderProcessor.name);

  constructor(
    @InjectRepository(EventReminder)
    private readonly reminderRepo: Repository<EventReminder>,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<EventReminderJobData>): Promise<void> {
    const { reminderId, eventId, userId, familyId, eventTitle, startAt } = job.data;

    const reminder = await this.reminderRepo.findOne({
      where: { id: reminderId, isSent: false },
    });

    if (!reminder) {
      this.logger.debug(`Reminder ${reminderId} already sent or deleted`);
      return;
    }

    this.eventEmitter.emit('notification.send', {
      userId,
      familyId,
      type: 'calendar.reminder',
      title: 'Termin-Erinnerung',
      body: `"${eventTitle}" beginnt am ${new Date(startAt).toLocaleString('de-DE')}`,
      data: { eventId, startAt },
    });

    await this.reminderRepo.update(reminderId, { isSent: true });
    this.logger.debug(`Calendar reminder sent: ${reminderId} for event ${eventId}`);
  }
}
