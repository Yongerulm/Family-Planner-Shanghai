import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Extensions (idempotent)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // ─── families ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "families" (
        "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
        "name"        VARCHAR(100) NOT NULL,
        "invite_code" VARCHAR(20)  NOT NULL,
        "settings"    JSONB       NOT NULL DEFAULT '{}',
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_families" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_families_invite_code" UNIQUE ("invite_code")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_families_invite_code" ON "families" ("invite_code")`,
    );

    // ─── users ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
        "family_id"      UUID,
        "email"          VARCHAR(255) NOT NULL,
        "username"       VARCHAR(50)  NOT NULL,
        "password_hash"  VARCHAR(255) NOT NULL,
        "display_name"   VARCHAR(100),
        "avatar_url"     VARCHAR(500),
        "date_of_birth"  DATE,
        "is_active"      BOOLEAN      NOT NULL DEFAULT true,
        "token_version"  INTEGER      NOT NULL DEFAULT 0,
        "cached_role"    VARCHAR(30),
        "last_login_at"  TIMESTAMPTZ,
        "settings"       JSONB        NOT NULL DEFAULT '{}',
        "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "deleted_at"     TIMESTAMPTZ,
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "FK_users_family" FOREIGN KEY ("family_id")
          REFERENCES "families"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_family_id" ON "users" ("family_id")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_users_deleted_at" ON "users" ("deleted_at") WHERE "deleted_at" IS NULL`,
    );

    // ─── user_family_roles ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "user_family_roles" (
        "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
        "user_id"    UUID        NOT NULL,
        "family_id"  UUID        NOT NULL,
        "role"       VARCHAR(30) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_user_family_roles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_family_roles_user_family" UNIQUE ("user_id", "family_id"),
        CONSTRAINT "CHK_user_family_roles_role" CHECK (
          "role" IN ('super_admin', 'family_admin', 'adult', 'child')
        ),
        CONSTRAINT "FK_user_family_roles_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_family_roles_family" FOREIGN KEY ("family_id")
          REFERENCES "families"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_ufr_user_id" ON "user_family_roles" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ufr_family_id" ON "user_family_roles" ("family_id")`,
    );

    // ─── refresh_tokens ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
        "user_id"     UUID         NOT NULL,
        "token_hash"  VARCHAR(255) NOT NULL,
        "device_info" JSONB,
        "expires_at"  TIMESTAMPTZ  NOT NULL,
        "revoked_at"  TIMESTAMPTZ,
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_refresh_tokens_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_rt_token_hash" ON "refresh_tokens" ("token_hash")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_rt_user_id" ON "refresh_tokens" ("user_id")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_rt_expires_at" ON "refresh_tokens" ("expires_at")`,
    );

    // ─── audit_logs ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
        "user_id"     UUID,
        "family_id"   UUID,
        "action"      VARCHAR(100) NOT NULL,
        "resource"    VARCHAR(100),
        "resource_id" UUID,
        "ip_address"  VARCHAR(45),
        "user_agent"  TEXT,
        "metadata"    JSONB,
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_user_id" ON "audit_logs" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_action" ON "audit_logs" ("action")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_created_at" ON "audit_logs" ("created_at" DESC)`,
    );

    // ─── sync_jobs ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "sync_jobs" (
        "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
        "user_id"      UUID         NOT NULL,
        "device_id"    VARCHAR(100),
        "last_sync_at" TIMESTAMPTZ,
        "sync_token"   VARCHAR(255),
        "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_sync_jobs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sync_jobs_user_device" UNIQUE ("user_id", "device_id"),
        CONSTRAINT "FK_sync_jobs_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // ─── settings ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "settings" (
        "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
        "scope"      VARCHAR(20)  NOT NULL,
        "scope_id"   UUID,
        "key"        VARCHAR(100) NOT NULL,
        "value"      JSONB        NOT NULL,
        "updated_by" UUID,
        "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_settings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_settings_scope_key" UNIQUE ("scope", "scope_id", "key"),
        CONSTRAINT "CHK_settings_scope" CHECK (
          "scope" IN ('system', 'family', 'user')
        )
      )
    `);

    // ─── notification_events ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "notification_events" (
        "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
        "user_id"      UUID         NOT NULL,
        "family_id"    UUID,
        "type"         VARCHAR(50)  NOT NULL,
        "title"        VARCHAR(200) NOT NULL,
        "body"         TEXT,
        "data"         JSONB,
        "is_read"      BOOLEAN      NOT NULL DEFAULT false,
        "read_at"      TIMESTAMPTZ,
        "push_sent"    BOOLEAN      NOT NULL DEFAULT false,
        "push_sent_at" TIMESTAMPTZ,
        "push_error"   TEXT,
        "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_notification_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_events_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_ne_user_id" ON "notification_events" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ne_user_unread" ON "notification_events" ("user_id", "is_read") WHERE "is_read" = false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ne_created_at" ON "notification_events" ("created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sync_jobs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_family_roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "families"`);
  }
}
