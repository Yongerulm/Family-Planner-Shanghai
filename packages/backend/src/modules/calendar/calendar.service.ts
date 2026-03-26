import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { subMinutes } from 'date-fns';

import { CalendarEvent } from './entities/calendar-event.entity';
import { EventReminder } from './entities/event-reminder.entity';
import {
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
  CalendarQueryDto,
  ReminderConfigDto,
} from './dto/calendar.dto';
import { JwtPayload } from '../../shared/types/common.types';
import { EVENT_REMINDER_QUEUE, EventReminderJobData } from './jobs/event-reminder.processor';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @InjectRepository(CalendarEvent)
    private readonly eventRepo: Repository<CalendarEvent>,
    @InjectRepository(EventReminder)
    private readonly reminderRepo: Repository<EventReminder>,
    @InjectQueue(EVENT_REMINDER_QUEUE)
    private readonly reminderQueue: Queue<EventReminderJobData>,
  ) {}

  async getEvents(familyId: string, query: CalendarQueryDto): Promise<CalendarEvent[]> {
    const from = new Date(query.from);
    const to = new Date(query.to);

    if (from > to) throw new BadRequestException('from must be before to');

    return this.eventRepo.find({
      where: {
        familyId,
        startAt: Between(from, to),
        deletedAt: undefined,
      },
      relations: ['reminders'],
      order: { startAt: 'ASC' },
      withDeleted: false,
    });
  }

  async getEvent(eventId: string, familyId: string): Promise<CalendarEvent> {
    const event = await this.eventRepo.findOne({
      where: { id: eventId, familyId },
      relations: ['reminders'],
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async createEvent(
    dto: CreateCalendarEventDto,
    familyId: string,
    user: JwtPayload,
  ): Promise<CalendarEvent> {
    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);

    if (start >= end) {
      throw new BadRequestException('Event end must be after start');
    }

    const event = this.eventRepo.create({
      familyId,
      createdBy: user.sub,
      title: dto.title,
      description: dto.description ?? null,
      location: dto.location ?? null,
      startAt: start,
      endAt: end,
      allDay: dto.allDay ?? false,
      recurrenceRule: dto.recurrenceRule ?? null,
      color: dto.color ?? null,
    });

    const saved = await this.eventRepo.save(event);

    if (dto.reminders?.length) {
      await this.createReminders(saved, dto.reminders, user.sub, familyId);
    }

    return this.getEvent(saved.id, familyId);
  }

  async updateEvent(
    eventId: string,
    dto: UpdateCalendarEventDto,
    familyId: string,
    user: JwtPayload,
  ): Promise<CalendarEvent> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, familyId } });
    if (!event) throw new NotFoundException('Event not found');

    if (
      event.createdBy !== user.sub &&
      user.role !== 'family_admin' &&
      user.role !== 'super_admin'
    ) {
      throw new ForbiddenException('Only creator or family admin can update');
    }

    // Reminders neu aufsetzen wenn sie geändert wurden
    if (dto.reminders !== undefined) {
      await this.clearReminders(eventId);
    }

    Object.assign(event, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.startAt !== undefined && { startAt: new Date(dto.startAt) }),
      ...(dto.endAt !== undefined && { endAt: new Date(dto.endAt) }),
      ...(dto.allDay !== undefined && { allDay: dto.allDay }),
      ...(dto.recurrenceRule !== undefined && { recurrenceRule: dto.recurrenceRule }),
      ...(dto.color !== undefined && { color: dto.color }),
    });

    const saved = await this.eventRepo.save(event);

    if (dto.reminders?.length) {
      await this.createReminders(saved, dto.reminders, user.sub, familyId);
    }

    return this.getEvent(saved.id, familyId);
  }

  async deleteEvent(eventId: string, familyId: string, user: JwtPayload): Promise<void> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, familyId } });
    if (!event) throw new NotFoundException('Event not found');

    if (
      event.createdBy !== user.sub &&
      user.role !== 'family_admin' &&
      user.role !== 'super_admin'
    ) {
      throw new ForbiddenException('Only creator or family admin can delete');
    }

    await this.clearReminders(eventId);
    await this.eventRepo.softRemove(event);
  }

  async getUpcomingEvents(familyId: string, days = 7): Promise<CalendarEvent[]> {
    const now = new Date();
    const until = new Date();
    until.setDate(until.getDate() + days);

    return this.eventRepo.find({
      where: { familyId, startAt: Between(now, until) },
      order: { startAt: 'ASC' },
      take: 20,
    });
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async createReminders(
    event: CalendarEvent,
    configs: ReminderConfigDto[],
    userId: string,
    familyId: string,
  ): Promise<void> {
    for (const config of configs) {
      const remindAt = subMinutes(event.startAt, config.minutesBefore);
      const delay = remindAt.getTime() - Date.now();

      if (delay <= 0) {
        this.logger.debug(`Reminder time already passed for event ${event.id}`);
        continue;
      }

      const reminder = await this.reminderRepo.save(
        this.reminderRepo.create({ eventId: event.id, userId, remindAt }),
      );

      const job = await this.reminderQueue.add(
        'event-reminder',
        {
          reminderId: reminder.id,
          eventId: event.id,
          userId,
          familyId,
          eventTitle: event.title,
          startAt: event.startAt.toISOString(),
        },
        {
          delay,
          jobId: `event-reminder-${reminder.id}`,
          removeOnComplete: true,
        },
      );

      await this.reminderRepo.update(reminder.id, { jobId: job.id?.toString() ?? null });
    }
  }

  private async clearReminders(eventId: string): Promise<void> {
    const reminders = await this.reminderRepo.find({ where: { eventId } });

    for (const reminder of reminders) {
      if (reminder.jobId) {
        try {
          const job = await this.reminderQueue.getJob(reminder.jobId);
          if (job) await job.remove();
        } catch {
          // Job bereits verarbeitet, kein Problem
        }
      }
    }

    await this.reminderRepo.delete({ eventId });
  }
}
