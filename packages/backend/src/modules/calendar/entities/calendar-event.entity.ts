import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Family } from '../../families/entities/family.entity';
import { User } from '../../users/entities/user.entity';
import { EventReminder } from './event-reminder.entity';

@Entity('calendar_events')
export class CalendarEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'family_id', type: 'uuid' })
  familyId: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 300, nullable: true })
  location: string | null;

  @Index()
  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt: Date;

  @Index()
  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt: Date;

  @Column({ name: 'all_day', default: false })
  allDay: boolean;

  // iCal RRULE Format z.B. "FREQ=WEEKLY;BYDAY=MO,WE,FR"
  @Column({ name: 'recurrence_rule', length: 500, nullable: true })
  recurrenceRule: string | null;

  @Column({ length: 10, nullable: true })
  color: string | null;

  // Für optionale Google Calendar Sync
  @Column({ name: 'external_id', length: 255, nullable: true })
  externalId: string | null;

  @Column({ name: 'external_source', length: 50, nullable: true })
  externalSource: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  // Relations
  @ManyToOne(() => Family, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'family_id' })
  family: Family;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => EventReminder, (reminder) => reminder.event, { cascade: true })
  reminders: EventReminder[];
}
