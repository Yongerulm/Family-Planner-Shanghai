import {
  Entity, PrimaryColumn, Column, UpdateDateColumn,
  OneToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_stats')
export class UserStats {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'total_xp', type: 'integer', default: 0 })
  totalXp: number;

  @Column({ type: 'integer', default: 1 })
  level: number;

  @Column({ name: 'current_streak', type: 'integer', default: 0 })
  currentStreak: number;

  @Column({ name: 'max_streak', type: 'integer', default: 0 })
  maxStreak: number;

  @Column({ name: 'last_active_date', type: 'date', nullable: true })
  lastActiveDate: string | null;

  @Column({ name: 'media_minutes_earned', type: 'integer', default: 0 })
  mediaMinutesEarned: number;

  @Column({ name: 'media_minutes_used', type: 'integer', default: 0 })
  mediaMinutesUsed: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
