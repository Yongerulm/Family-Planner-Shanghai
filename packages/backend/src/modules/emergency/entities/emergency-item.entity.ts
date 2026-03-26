import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Family } from '../../families/entities/family.entity';
import { User } from '../../users/entities/user.entity';

export enum EmergencyCategory {
  FOOD = 'food',
  WATER = 'water',
  MEDICINE = 'medicine',
  DOCUMENTS = 'documents',
  TOOLS = 'tools',
  COMMUNICATION = 'communication',
  FIRST_AID = 'first_aid',
  OTHER = 'other',
}

@Entity('emergency_items')
export class EmergencyItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'family_id', type: 'uuid' })
  familyId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'enum', enum: EmergencyCategory, default: EmergencyCategory.OTHER })
  category: EmergencyCategory;

  @Column({ type: 'numeric', precision: 10, scale: 3, nullable: true })
  quantity: number | null;

  @Column({ length: 50, nullable: true })
  unit: string | null;

  @Column({ name: 'min_quantity', type: 'numeric', precision: 10, scale: 3, nullable: true })
  minQuantity: number | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'last_checked_at', type: 'timestamptz', nullable: true })
  lastCheckedAt: Date | null;

  @Column({ name: 'last_checked_by', type: 'uuid', nullable: true })
  lastCheckedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Family, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'family_id' })
  family: Family;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'last_checked_by' })
  lastCheckedByUser: User | null;
}
