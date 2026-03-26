import {
  Entity, PrimaryGeneratedColumn, Column,
} from 'typeorm';

@Entity('badges')
export class Badge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  key: string; // e.g. 'first_task', 'streak_7', 'homework_master'

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'icon_url', length: 500, nullable: true })
  iconUrl: string | null;

  @Column({ name: 'xp_reward', type: 'integer', default: 0 })
  xpReward: number;
}
