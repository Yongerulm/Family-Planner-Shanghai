import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TimetableSlot } from './entities/timetable-slot.entity';
import { Homework } from './entities/homework.entity';
import { Exam } from './entities/exam.entity';
import { Grade } from './entities/grade.entity';
import {
  CreateTimetableSlotDto, UpdateTimetableSlotDto,
  CreateHomeworkDto, UpdateHomeworkDto,
  CreateExamDto, UpdateExamDto,
  CreateGradeDto, UpdateGradeDto,
} from './dto/school.dto';
import { JwtPayload, hasMinimumRole } from '../../shared/types/common.types';

@Injectable()
export class SchoolService {
  constructor(
    @InjectRepository(TimetableSlot)
    private readonly slotRepo: Repository<TimetableSlot>,
    @InjectRepository(Homework)
    private readonly homeworkRepo: Repository<Homework>,
    @InjectRepository(Exam)
    private readonly examRepo: Repository<Exam>,
    @InjectRepository(Grade)
    private readonly gradeRepo: Repository<Grade>,
    private readonly events: EventEmitter2,
  ) {}

  // ─── Timetable ─────────────────────────────────────────────────────────────

  async getTimetable(childId: string): Promise<TimetableSlot[]> {
    return this.slotRepo.find({
      where: { childId },
      order: { weekday: 'ASC', periodNumber: 'ASC' },
    });
  }

  async addSlot(dto: CreateTimetableSlotDto, user: JwtPayload): Promise<TimetableSlot> {
    this.assertAccessToChild(dto.childId, user);
    const slot = this.slotRepo.create({
      childId: dto.childId,
      weekday: dto.weekday,
      periodNumber: dto.periodNumber,
      subject: dto.subject,
      teacher: dto.teacher ?? null,
      room: dto.room ?? null,
      startsAt: dto.startsAt ?? null,
      endsAt: dto.endsAt ?? null,
    });
    return this.slotRepo.save(slot);
  }

  async updateSlot(id: string, dto: UpdateTimetableSlotDto, user: JwtPayload): Promise<TimetableSlot> {
    const slot = await this.slotRepo.findOneByOrFail({ id });
    this.assertAccessToChild(slot.childId, user);
    Object.assign(slot, dto);
    return this.slotRepo.save(slot);
  }

  async deleteSlot(id: string, user: JwtPayload): Promise<void> {
    const slot = await this.slotRepo.findOneByOrFail({ id });
    this.assertAccessToChild(slot.childId, user);
    await this.slotRepo.remove(slot);
  }

  // ─── Homework ──────────────────────────────────────────────────────────────

  async getHomework(childId: string, showDone = false): Promise<Homework[]> {
    const qb = this.homeworkRepo.createQueryBuilder('hw')
      .where('hw.child_id = :childId', { childId })
      .orderBy('hw.due_date', 'ASC');

    if (!showDone) qb.andWhere('hw.is_done = false');

    return qb.getMany();
  }

  async addHomework(dto: CreateHomeworkDto, user: JwtPayload): Promise<Homework> {
    this.assertAccessToChild(dto.childId, user);
    const hw = this.homeworkRepo.create({
      childId: dto.childId,
      subject: dto.subject,
      description: dto.description,
      dueDate: dto.dueDate,
    });
    return this.homeworkRepo.save(hw);
  }

  async updateHomework(id: string, dto: UpdateHomeworkDto, user: JwtPayload): Promise<Homework> {
    const hw = await this.homeworkRepo.findOneByOrFail({ id });
    this.assertAccessToChild(hw.childId, user);

    const wasDone = hw.isDone;
    Object.assign(hw, dto);
    if (!wasDone && dto.isDone === true) {
      hw.doneAt = new Date();
      // Award XP for completing homework
      this.events.emit('gamification.xp.award', {
        userId: hw.childId,
        action: 'homework_done',
        points: 10,
        resourceId: hw.id,
      });
    }
    if (dto.isDone === false) {
      hw.doneAt = null;
    }
    return this.homeworkRepo.save(hw);
  }

  async deleteHomework(id: string, user: JwtPayload): Promise<void> {
    const hw = await this.homeworkRepo.findOneByOrFail({ id });
    this.assertAccessToChild(hw.childId, user);
    await this.homeworkRepo.remove(hw);
  }

  // ─── Exams ─────────────────────────────────────────────────────────────────

  async getExams(childId: string): Promise<Exam[]> {
    return this.examRepo.find({
      where: { childId },
      order: { date: 'ASC' },
    });
  }

  async addExam(dto: CreateExamDto, user: JwtPayload): Promise<Exam> {
    this.assertAccessToChild(dto.childId, user);
    const exam = this.examRepo.create({
      childId: dto.childId,
      subject: dto.subject,
      date: dto.date,
      time: dto.time ?? null,
      topics: dto.topics ?? null,
      notes: dto.notes ?? null,
    });
    return this.examRepo.save(exam);
  }

  async updateExam(id: string, dto: UpdateExamDto, user: JwtPayload): Promise<Exam> {
    const exam = await this.examRepo.findOneByOrFail({ id });
    this.assertAccessToChild(exam.childId, user);
    Object.assign(exam, {
      ...dto,
      grade: 'grade' in dto ? (dto.grade ?? null) : exam.grade,
    });
    return this.examRepo.save(exam);
  }

  async deleteExam(id: string, user: JwtPayload): Promise<void> {
    const exam = await this.examRepo.findOneByOrFail({ id });
    this.assertAccessToChild(exam.childId, user);
    await this.examRepo.remove(exam);
  }

  // ─── Grades ────────────────────────────────────────────────────────────────

  async getGrades(childId: string, schoolYear?: string): Promise<Grade[]> {
    const where: Record<string, unknown> = { childId };
    if (schoolYear) where['schoolYear'] = schoolYear;
    return this.gradeRepo.find({
      where,
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async addGrade(dto: CreateGradeDto, user: JwtPayload): Promise<Grade> {
    this.assertAccessToChild(dto.childId, user);
    const grade = this.gradeRepo.create({
      childId: dto.childId,
      subject: dto.subject,
      value: dto.value,
      label: dto.label ?? null,
      date: dto.date ?? null,
      comment: dto.comment ?? null,
      schoolYear: dto.schoolYear ?? null,
    });
    return this.gradeRepo.save(grade);
  }

  async updateGrade(id: string, dto: UpdateGradeDto, user: JwtPayload): Promise<Grade> {
    const grade = await this.gradeRepo.findOneByOrFail({ id });
    this.assertAccessToChild(grade.childId, user);
    Object.assign(grade, dto);
    return this.gradeRepo.save(grade);
  }

  async deleteGrade(id: string, user: JwtPayload): Promise<void> {
    const grade = await this.gradeRepo.findOneByOrFail({ id });
    this.assertAccessToChild(grade.childId, user);
    await this.gradeRepo.remove(grade);
  }

  // ─── Access control ────────────────────────────────────────────────────────
  // A child can access their own data; adults/admins can access any child in their family.
  // The family check is handled at the route-guard level (FamilyMemberGuard).
  // Here we only check that non-admins don't access other people's data.
  private assertAccessToChild(childId: string, user: JwtPayload): void {
    if (user.role === 'super_admin' || hasMinimumRole(user.role, 'adult')) return;
    if (user.sub !== childId) {
      throw new ForbiddenException('Access denied to this child\'s data');
    }
  }
}
