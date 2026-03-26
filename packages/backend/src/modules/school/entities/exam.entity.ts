import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('exams')
export class Exam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'child_id', type: 'uuid' })
  childId: string;

  @Column({ length: 100 })
  subject: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time', nullable: true })
  time: string | null;

  @Column({ type: 'text', nullable: true })
  topics: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'numeric', precision: 4, scale: 2, nullable: true })
  grade: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_id' })
  child: User;
}
