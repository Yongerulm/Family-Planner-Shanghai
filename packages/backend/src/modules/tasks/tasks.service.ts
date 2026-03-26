import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { subMinutes } from 'date-fns';

import { TodoList } from './entities/todo-list.entity';
import { TodoItem } from './entities/todo-item.entity';
import {
  CreateTodoListDto,
  UpdateTodoListDto,
  CreateTodoItemDto,
  UpdateTodoItemDto,
  CompleteTaskDto,
} from './dto/tasks.dto';
import { JwtPayload } from '../../shared/types/common.types';
import { TASK_REMINDER_QUEUE, TaskReminderJobData } from './jobs/task-reminder.processor';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(TodoList)
    private readonly listRepo: Repository<TodoList>,
    @InjectRepository(TodoItem)
    private readonly itemRepo: Repository<TodoItem>,
    @InjectQueue(TASK_REMINDER_QUEUE)
    private readonly reminderQueue: Queue<TaskReminderJobData>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Lists ─────────────────────────────────────────────────────────────────

  async getLists(familyId: string, userId: string): Promise<TodoList[]> {
    return this.listRepo
      .createQueryBuilder('list')
      .where(
        '(list.family_id = :familyId AND list.is_private = false) OR ' +
          '(list.owner_id = :userId)',
        { familyId, userId },
      )
      .orderBy('list.created_at', 'DESC')
      .getMany();
  }

  async getList(listId: string, familyId: string, userId: string): Promise<TodoList> {
    const list = await this.listRepo.findOne({
      where: { id: listId },
      relations: ['items'],
      order: { items: { sortOrder: 'ASC', createdAt: 'ASC' } },
    });

    if (!list) throw new NotFoundException('Todo list not found');

    this.assertAccess(list, familyId, userId);
    return list;
  }

  async createList(
    dto: CreateTodoListDto,
    familyId: string,
    userId: string,
  ): Promise<TodoList> {
    const list = this.listRepo.create({
      name: dto.name,
      isPrivate: dto.isPrivate ?? false,
      familyId: dto.isPrivate ? null : familyId,
      ownerId: dto.isPrivate ? userId : null,
      createdBy: userId,
    });

    return this.listRepo.save(list);
  }

  async updateList(
    listId: string,
    dto: UpdateTodoListDto,
    familyId: string,
    userId: string,
  ): Promise<TodoList> {
    const list = await this.listRepo.findOneOrFail({ where: { id: listId } }).catch(() => {
      throw new NotFoundException('Todo list not found');
    });

    this.assertAccess(list, familyId, userId);
    Object.assign(list, dto);
    return this.listRepo.save(list);
  }

  async deleteList(listId: string, familyId: string, user: JwtPayload): Promise<void> {
    const list = await this.listRepo.findOne({ where: { id: listId } });
    if (!list) throw new NotFoundException('Todo list not found');

    this.assertAccess(list, familyId, user.sub);

    if (
      list.createdBy !== user.sub &&
      user.role !== 'family_admin' &&
      user.role !== 'super_admin'
    ) {
      throw new ForbiddenException('Only creator or family admin can delete');
    }

    await this.listRepo.remove(list);
  }

  // ─── Items ─────────────────────────────────────────────────────────────────

  async createItem(
    listId: string,
    dto: CreateTodoItemDto,
    familyId: string,
    userId: string,
  ): Promise<TodoItem> {
    const list = await this.listRepo.findOne({ where: { id: listId } });
    if (!list) throw new NotFoundException('Todo list not found');
    this.assertAccess(list, familyId, userId);

    const maxOrder = await this.itemRepo
      .createQueryBuilder('item')
      .select('MAX(item.sort_order)', 'max')
      .where('item.list_id = :listId', { listId })
      .getRawOne<{ max: number | null }>();

    const item = this.itemRepo.create({
      listId,
      title: dto.title,
      description: dto.description ?? null,
      assignedTo: dto.assignedTo ?? null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      priority: dto.priority ?? 0,
      sortOrder: (maxOrder?.max ?? 0) + 1,
      createdBy: userId,
    });

    const saved = await this.itemRepo.save(item);

    // Reminder planen wenn dueDate und reminderMinutesBefore gesetzt
    if (saved.dueDate && dto.reminderMinutesBefore && dto.reminderMinutesBefore > 0) {
      await this.scheduleReminder(saved, dto.reminderMinutesBefore, userId, familyId);
    }

    return saved;
  }

  async updateItem(
    itemId: string,
    dto: UpdateTodoItemDto,
    familyId: string,
    userId: string,
  ): Promise<TodoItem> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['list'],
    });

    if (!item) throw new NotFoundException('Task not found');
    this.assertAccess(item.list, familyId, userId);

    // Alten Reminder canceln wenn dueDate oder Reminder-Config sich ändert
    if (item.reminderJobId && (dto.dueDate !== undefined || dto.reminderMinutesBefore !== undefined)) {
      await this.cancelReminder(item.reminderJobId);
      item.reminderJobId = null;
    }

    Object.assign(item, {
      ...dto,
      dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : item.dueDate,
      assignedTo: dto.assignedTo !== undefined ? dto.assignedTo : item.assignedTo,
    });

    const saved = await this.itemRepo.save(item);

    // Neuen Reminder setzen
    const reminderMinutes = dto.reminderMinutesBefore;
    if (saved.dueDate && reminderMinutes && reminderMinutes > 0) {
      await this.scheduleReminder(saved, reminderMinutes, userId, familyId);
    }

    return saved;
  }

  async completeItem(
    itemId: string,
    dto: CompleteTaskDto,
    familyId: string,
    userId: string,
  ): Promise<TodoItem> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['list'],
    });

    if (!item) throw new NotFoundException('Task not found');
    this.assertAccess(item.list, familyId, userId);

    item.isCompleted = dto.isCompleted;
    item.completedAt = dto.isCompleted ? new Date() : null;

    const saved = await this.itemRepo.save(item);

    if (dto.isCompleted) {
      // Reminder canceln
      if (item.reminderJobId) {
        await this.cancelReminder(item.reminderJobId);
        saved.reminderJobId = null;
        await this.itemRepo.save(saved);
      }

      // Gamification Event: XP vergeben
      this.eventEmitter.emit('gamification.xp.award', {
        userId,
        familyId,
        delta: 10,
        reason: 'task_completed',
        sourceType: 'todo_item',
        sourceId: itemId,
      });
    }

    return saved;
  }

  async deleteItem(itemId: string, familyId: string, userId: string): Promise<void> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['list'],
    });

    if (!item) throw new NotFoundException('Task not found');
    this.assertAccess(item.list, familyId, userId);

    if (item.reminderJobId) {
      await this.cancelReminder(item.reminderJobId);
    }

    await this.itemRepo.softRemove(item);
  }

  async getUpcomingTasks(
    familyId: string,
    userId: string,
    days = 7,
  ): Promise<TodoItem[]> {
    const until = new Date();
    until.setDate(until.getDate() + days);

    return this.itemRepo
      .createQueryBuilder('item')
      .innerJoin('item.list', 'list')
      .where(
        '(list.family_id = :familyId OR list.owner_id = :userId)',
        { familyId, userId },
      )
      .andWhere('item.is_completed = false')
      .andWhere('item.deleted_at IS NULL')
      .andWhere('item.due_date IS NOT NULL')
      .andWhere('item.due_date <= :until', { until })
      .orderBy('item.due_date', 'ASC')
      .limit(50)
      .getMany();
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private assertAccess(list: TodoList, familyId: string, userId: string): void {
    const isOwner = list.ownerId === userId;
    const isFamilyMember = list.familyId === familyId;

    if (!isOwner && !isFamilyMember) {
      throw new ForbiddenException('Access denied');
    }

    if (list.isPrivate && !isOwner) {
      throw new ForbiddenException('This is a private list');
    }
  }

  private async scheduleReminder(
    item: TodoItem,
    minutesBefore: number,
    userId: string,
    familyId: string,
  ): Promise<void> {
    if (!item.dueDate) return;

    const reminderAt = subMinutes(item.dueDate, minutesBefore);
    const delay = reminderAt.getTime() - Date.now();

    if (delay <= 0) {
      this.logger.debug(`Reminder time already passed for task ${item.id}`);
      return;
    }

    const job = await this.reminderQueue.add(
      'task-reminder',
      {
        todoItemId: item.id,
        userId,
        familyId,
        title: item.title,
        dueDate: item.dueDate.toISOString(),
      },
      {
        delay,
        jobId: `task-reminder-${item.id}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    await this.itemRepo.update(item.id, { reminderJobId: job.id?.toString() ?? null });
    this.logger.debug(`Scheduled reminder for task ${item.id} at ${reminderAt.toISOString()}`);
  }

  private async cancelReminder(jobId: string): Promise<void> {
    try {
      const job = await this.reminderQueue.getJob(jobId);
      if (job) await job.remove();
    } catch {
      this.logger.debug(`Could not cancel reminder job ${jobId} (already processed?)`);
    }
  }
}
