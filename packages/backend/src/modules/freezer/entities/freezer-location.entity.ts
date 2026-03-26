import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { Family } from '../../families/entities/family.entity';
import { FreezerItem } from './freezer-item.entity';

@Entity('freezer_locations')
export class FreezerLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'family_id', type: 'uuid' })
  familyId: string;

  @Column({ length: 100 })
  name: string; // e.g. 'Tiefkühlschrank Keller', 'Kühlschrank oben'

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Family, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'family_id' })
  family: Family;

  @OneToMany(() => FreezerItem, (i) => i.location)
  items: FreezerItem[];
}
