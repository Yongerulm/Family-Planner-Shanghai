import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('grades')
export class Grade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'child_id', type: 'uuid' })
  childId: string;

  @Column({ length: 100 })
  subject: string;

  @Column({ type: 'numeric', precision: 4, scale: 2 })
  value: number;

  @Column({ length: 200, nullable: true })
  label: string | null; // e.g. "Klassenarbeit 2"

  @Column({ type: 'date', nullable: true })
  date: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ name: 'school_year', length: 20, nullable: true })
  schoolYear: string | null; // e.g. "2023/24"

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_id' })
  child: User;
}
