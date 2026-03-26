import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchoolModule1700000005000 implements MigrationInterface {
  name = 'SchoolModule1700000005000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE timetable_slots (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        child_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        weekday       SMALLINT NOT NULL CHECK (weekday BETWEEN 1 AND 6),
        period_number SMALLINT NOT NULL CHECK (period_number BETWEEN 1 AND 12),
        subject       VARCHAR(100) NOT NULL,
        teacher       VARCHAR(100),
        room          VARCHAR(50),
        starts_at     TIME,
        ends_at       TIME
      );

      CREATE INDEX idx_timetable_slots_child_id ON timetable_slots(child_id);

      CREATE TABLE homework (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        child_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject     VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        due_date    DATE NOT NULL,
        is_done     BOOLEAN NOT NULL DEFAULT FALSE,
        done_at     TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_homework_child_id ON homework(child_id);
      CREATE INDEX idx_homework_due_date ON homework(due_date) WHERE is_done = FALSE;

      CREATE TABLE exams (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        child_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject     VARCHAR(100) NOT NULL,
        date        DATE NOT NULL,
        time        TIME,
        topics      TEXT,
        notes       TEXT,
        grade       NUMERIC(4, 2),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_exams_child_id ON exams(child_id);

      CREATE TABLE grades (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        child_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject     VARCHAR(100) NOT NULL,
        value       NUMERIC(4, 2) NOT NULL,
        label       VARCHAR(200),
        date        DATE,
        comment     TEXT,
        school_year VARCHAR(20),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_grades_child_id ON grades(child_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS grades;
      DROP TABLE IF EXISTS exams;
      DROP TABLE IF EXISTS homework;
      DROP TABLE IF EXISTS timetable_slots;
    `);
  }
}
