import { MigrationInterface, QueryRunner } from 'typeorm';

export class TasksNotesCalendar1700000002000 implements MigrationInterface {
  name = 'TasksNotesCalendar1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── todo_lists ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "todo_lists" (
        "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
        "family_id"   UUID,
        "owner_id"    UUID,
        "name"        VARCHAR(100) NOT NULL,
        "is_private"  BOOLEAN      NOT NULL DEFAULT false,
        "created_by"  UUID,
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_todo_lists" PRIMARY KEY ("id"),
        CONSTRAINT "FK_todo_lists_family" FOREIGN KEY ("family_id")
          REFERENCES "families"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_todo_lists_owner" FOREIGN KEY ("owner_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_todo_lists_scope" CHECK (
          ("family_id" IS NOT NULL AND "owner_id" IS NULL) OR
          ("family_id" IS NULL AND "owner_id" IS NOT NULL)
        )
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_todo_lists_family" ON "todo_lists" ("family_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_todo_lists_owner" ON "todo_lists" ("owner_id")`);

    // ─── todo_items ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "todo_items" (
        "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
        "list_id"          UUID         NOT NULL,
        "title"            VARCHAR(300) NOT NULL,
        "description"      TEXT,
        "assigned_to"      UUID,
        "due_date"         TIMESTAMPTZ,
        "is_completed"     BOOLEAN      NOT NULL DEFAULT false,
        "completed_at"     TIMESTAMPTZ,
        "priority"         SMALLINT     NOT NULL DEFAULT 0,
        "sort_order"       INTEGER      NOT NULL DEFAULT 0,
        "reminder_job_id"  VARCHAR(255),
        "created_by"       UUID,
        "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "deleted_at"       TIMESTAMPTZ,
        CONSTRAINT "PK_todo_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_todo_items_list" FOREIGN KEY ("list_id")
          REFERENCES "todo_lists"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_todo_items_assignee" FOREIGN KEY ("assigned_to")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_todo_items_list" ON "todo_items" ("list_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_todo_items_assigned" ON "todo_items" ("assigned_to")`);
    await queryRunner.query(`CREATE INDEX "IDX_todo_items_due" ON "todo_items" ("due_date") WHERE "due_date" IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_todo_items_active" ON "todo_items" ("list_id", "is_completed") WHERE "deleted_at" IS NULL`);

    // ─── notes ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "notes" (
        "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
        "family_id"   UUID,
        "owner_id"    UUID,
        "title"       VARCHAR(200),
        "content"     TEXT         NOT NULL DEFAULT '',
        "is_private"  BOOLEAN      NOT NULL DEFAULT false,
        "color"       VARCHAR(10),
        "created_by"  UUID         NOT NULL,
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "deleted_at"  TIMESTAMPTZ,
        CONSTRAINT "PK_notes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notes_family" FOREIGN KEY ("family_id")
          REFERENCES "families"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notes_owner" FOREIGN KEY ("owner_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notes_creator" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_notes_family" ON "notes" ("family_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_notes_owner" ON "notes" ("owner_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_notes_active" ON "notes" ("family_id") WHERE "deleted_at" IS NULL`);
    // GIN-Index für Volltextsuche
    await queryRunner.query(`
      CREATE INDEX "IDX_notes_fts" ON "notes"
      USING gin(to_tsvector('german', coalesce("title", '') || ' ' || "content"))
    `);

    // ─── calendar_events ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "calendar_events" (
        "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
        "family_id"        UUID         NOT NULL,
        "created_by"       UUID         NOT NULL,
        "title"            VARCHAR(200) NOT NULL,
        "description"      TEXT,
        "location"         VARCHAR(300),
        "start_at"         TIMESTAMPTZ  NOT NULL,
        "end_at"           TIMESTAMPTZ  NOT NULL,
        "all_day"          BOOLEAN      NOT NULL DEFAULT false,
        "recurrence_rule"  VARCHAR(500),
        "color"            VARCHAR(10),
        "external_id"      VARCHAR(255),
        "external_source"  VARCHAR(50),
        "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "deleted_at"       TIMESTAMPTZ,
        CONSTRAINT "PK_calendar_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_calendar_events_family" FOREIGN KEY ("family_id")
          REFERENCES "families"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_calendar_events_creator" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_calendar_family" ON "calendar_events" ("family_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_calendar_start" ON "calendar_events" ("start_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_calendar_range" ON "calendar_events" ("family_id", "start_at", "end_at") WHERE "deleted_at" IS NULL`);

    // ─── event_reminders ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "event_reminders" (
        "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
        "event_id"   UUID        NOT NULL,
        "user_id"    UUID        NOT NULL,
        "remind_at"  TIMESTAMPTZ NOT NULL,
        "job_id"     VARCHAR(255),
        "is_sent"    BOOLEAN     NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_event_reminders" PRIMARY KEY ("id"),
        CONSTRAINT "FK_event_reminders_event" FOREIGN KEY ("event_id")
          REFERENCES "calendar_events"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_event_reminders_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_er_event_id" ON "event_reminders" ("event_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_er_user_id" ON "event_reminders" ("user_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "event_reminders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "calendar_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "todo_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "todo_lists"`);
  }
}
