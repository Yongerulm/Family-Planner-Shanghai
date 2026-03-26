import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { FreezerLocation } from './freezer-location.entity';
import { User } from '../../users/entities/user.entity';

@Entity('freezer_items')
export class FreezerItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'location_id', type: 'uuid' })
  locationId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'numeric', precision: 10, scale: 3, nullable: true })
  quantity: number | null;

  @Column({ length: 50, nullable: true })
  unit: string | null; // e.g. 'g', 'kg', 'Stück', 'Packung'

  @Column({ name: 'frozen_on', type: 'date', nullable: true })
  frozenOn: string | null;

  @Column({ name: 'best_before', type: 'date', nullable: true })
  bestBefore: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'added_by', type: 'uuid', nullable: true })
  addedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => FreezerLocation, (l) => l.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location: FreezerLocation;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'added_by' })
  addedByUser: User | null;
}
