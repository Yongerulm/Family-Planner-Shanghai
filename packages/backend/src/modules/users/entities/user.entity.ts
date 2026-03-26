import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Family } from '../../families/entities/family.entity';
import { UserFamilyRole } from './user-family-role.entity';
import { RefreshToken } from './refresh-token.entity';
import { UserRole } from '../../../shared/types/common.types';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'family_id', type: 'uuid', nullable: true })
  familyId: string | null;

  @Index({ unique: true })
  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 50 })
  username: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ name: 'display_name', length: 100, nullable: true })
  displayName: string | null;

  @Column({ name: 'avatar_url', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'token_version', default: 0 })
  tokenVersion: number;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'jsonb', default: '{}' })
  settings: Record<string, unknown>;

  // Role within family (cached from UserFamilyRole for performance)
  @Column({
    name: 'cached_role',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  cachedRole: UserRole | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  // Relations
  @ManyToOne(() => Family, (family) => family.users, { nullable: true })
  @JoinColumn({ name: 'family_id' })
  family: Family | null;

  @OneToMany(() => UserFamilyRole, (role) => role.user)
  familyRoles: UserFamilyRole[];

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];
}
