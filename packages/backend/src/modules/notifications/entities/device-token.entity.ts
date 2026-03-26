import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type DevicePlatform = 'apns' | 'fcm';

/**
 * Stores push notification device tokens per user per device.
 *
 * - One user can have multiple devices (phone + tablet)
 * - Tokens are upserted by (userId + deviceId) — deviceId is a client-generated UUID
 *   that persists across app reinstalls (stored in SecureStore on mobile)
 * - Stale tokens (Unregistered / BadDeviceToken from APNs/FCM) are deleted on push failure
 */
@Entity('device_tokens')
@Index(['userId', 'platform'])
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** Client-generated stable device identifier (UUID stored in SecureStore) */
  @Column({ name: 'device_id', length: 64 })
  deviceId: string;

  @Column({ type: 'varchar', length: 8 })
  platform: DevicePlatform;

  /** APNs hex device token (64 chars) or FCM registration token */
  @Column({ name: 'push_token', length: 512 })
  pushToken: string;

  /** App version for debugging stale tokens after updates */
  @Column({ name: 'app_version', length: 32, nullable: true })
  appVersion: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
