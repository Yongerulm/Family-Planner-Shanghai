import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { EventReminderProcessor, EVENT_REMINDER_QUEUE } from './jobs/event-reminder.processor';
import { CalendarEvent } from './entities/calendar-event.entity';
import { EventReminder } from './entities/event-reminder.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CalendarEvent, EventReminder]),
    BullModule.registerQueue({ name: EVENT_REMINDER_QUEUE }),
  ],
  controllers: [CalendarController],
  providers: [CalendarService, EventReminderProcessor],
  exports: [CalendarService],
})
export class CalendarModule {}
