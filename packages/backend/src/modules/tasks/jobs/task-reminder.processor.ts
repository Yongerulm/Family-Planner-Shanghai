import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TodoItem } from '../entities/todo-item.entity';

export const TASK_REMINDER_QUEUE = 'task-reminders';

export interface TaskReminderJobData {
  todoItemId: string;
  userId: string;
  familyId: string;
  title: string;
  dueDate: string;
}

@Processor(TASK_REMINDER_QUEUE)
export class TaskReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskReminderProcessor.name);

  constructor(
    @InjectRepository(TodoItem)
    private readonly todoItemRepo: Repository<TodoItem>,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<TaskReminderJobData>): Promise<void> {
    const { todoItemId, userId, familyId, title, dueDate } = job.data;

    // Prüfe ob Task noch existiert und nicht abgeschlossen ist
    const item = await this.todoItemRepo.findOne({
      where: { id: todoItemId, isCompleted: false },
      withDeleted: false,
    });

    if (!item) {
      this.logger.debug(`Task ${todoItemId} already completed or deleted, skipping reminder`);
      return;
    }

    // Notification Event emittieren → NotificationsService verarbeitet
    this.eventEmitter.emit('notification.send', {
      userId,
      familyId,
      type: 'task.reminder',
      title: 'Aufgaben-Erinnerung',
      body: `Fällig: "${title}" – ${new Date(dueDate).toLocaleString('de-DE')}`,
      data: { todoItemId, dueDate },
    });

    this.logger.debug(`Reminder sent for task: ${todoItemId} to user: ${userId}`);
  }
}
