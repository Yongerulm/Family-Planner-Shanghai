import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Family } from '../../families/entities/family.entity';
import { User } from '../../users/entities/user.entity';

@Entity('vault_documents')
export class VaultDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'family_id', type: 'uuid' })
  familyId: string;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedBy: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 100, nullable: true })
  category: string | null;

  // MinIO Object Key (nie direkt dem Client exponieren)
  @Column({ name: 'storage_key', length: 500 })
  storageKey: string;

  @Column({ name: 'storage_bucket', length: 100 })
  storageBucket: string;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes: number | null;

  @Column({ name: 'mime_type', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: 'is_encrypted', default: true })
  isEncrypted: boolean;

  // AES-GCM IV (12 Bytes als Hex = 24 Zeichen)
  // SICHERHEITSHINWEIS: IV ist kein Secret, darf in DB gespeichert werden
  @Column({ name: 'encryption_iv', length: 24, nullable: true })
  encryptionIv: string | null;

  // SHA-256 Checksum der entschlüsselten Datei
  @Column({ name: 'checksum_sha256', length: 64, nullable: true })
  checksumSha256: string | null;

  @Column({ type: 'text', array: true, nullable: true })
  tags: string[] | null;

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

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;
}
