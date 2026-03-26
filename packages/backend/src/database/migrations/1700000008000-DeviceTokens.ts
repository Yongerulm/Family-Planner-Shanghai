import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the device_tokens table for push notification token storage.
 *
 * Design decisions:
 * - Unique constraint on (user_id, device_id): one row per physical device per user
 * - Index on (user_id, platform): fast lookup when dispatching push per user
 * - push_token VARCHAR(512): FCM tokens can be very long; APNs tokens are 64 hex chars
 */
export class DeviceTokens1700000008000 implements MigrationInterface {
  name = 'DeviceTokens1700000008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "device_tokens" (
        "id"          UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"     UUID        NOT NULL,
        "device_id"   VARCHAR(64) NOT NULL,
        "platform"    VARCHAR(8)  NOT NULL,
        "push_token"  VARCHAR(512) NOT NULL,
        "app_version" VARCHAR(32),
        "created_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

        CONSTRAINT "PK_device_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_device_tokens_user_device" UNIQUE ("user_id", "device_id"),
        CONSTRAINT "CHK_device_tokens_platform" CHECK ("platform" IN ('apns', 'fcm'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_device_tokens_user_platform"
        ON "device_tokens" ("user_id", "platform")
    `);

    // Note: no FK to users table intentionally — device tokens should survive
    // soft-deleted users temporarily and be cleaned up by a background job
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_device_tokens_user_platform"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "device_tokens"`);
  }
}
