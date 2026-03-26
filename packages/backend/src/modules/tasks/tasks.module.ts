import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskReminderProcessor, TASK_REMINDER_QUEUE } from './jobs/task-reminder.processor';
import { TodoList } from './entities/todo-list.entity';
import { TodoItem } from './entities/todo-item.entity';
import { Family } from '../families/entities/family.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TodoList, TodoItem, Family]),
    BullModule.registerQueue({ name: TASK_REMINDER_QUEUE }),
  ],
  controllers: [TasksController],
  providers: [TasksService, TaskReminderProcessor],
  exports: [TasksService],
})
export class TasksModule {}
