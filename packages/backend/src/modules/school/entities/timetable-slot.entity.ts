import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum Weekday {
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

@Entity('timetable_slots')
export class TimetableSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'child_id', type: 'uuid' })
  childId: string;

  @Column({ type: 'smallint' })
  weekday: Weekday;

  @Column({ name: 'period_number', type: 'smallint' })
  periodNumber: number;

  @Column({ length: 100 })
  subject: string;

  @Column({ length: 100, nullable: true })
  teacher: string | null;

  @Column({ length: 50, nullable: true })
  room: string | null;

  @Column({ name: 'starts_at', type: 'time', nullable: true })
  startsAt: string | null; // HH:MM

  @Column({ name: 'ends_at', type: 'time', nullable: true })
  endsAt: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_id' })
  child: User;
}
