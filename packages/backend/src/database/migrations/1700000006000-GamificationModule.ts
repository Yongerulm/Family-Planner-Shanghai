import { MigrationInterface, QueryRunner } from 'typeorm';

export class GamificationModule1700000006000 implements MigrationInterface {
  name = 'GamificationModule1700000006000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE xp_ledger (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        points      INTEGER NOT NULL,
        action      VARCHAR(100) NOT NULL,
        resource_id UUID,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_xp_ledger_user_id ON xp_ledger(user_id);

      CREATE TABLE user_stats (
        user_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        total_xp              INTEGER NOT NULL DEFAULT 0,
        level                 INTEGER NOT NULL DEFAULT 1,
        current_streak        INTEGER NOT NULL DEFAULT 0,
        max_streak            INTEGER NOT NULL DEFAULT 0,
        last_active_date      DATE,
        media_minutes_earned  INTEGER NOT NULL DEFAULT 0,
        media_minutes_used    INTEGER NOT NULL DEFAULT 0,
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE badges (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key         VARCHAR(100) NOT NULL UNIQUE,
        name        VARCHAR(200) NOT NULL,
        description TEXT,
        icon_url    VARCHAR(500),
        xp_reward   INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE user_badges (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        badge_id    UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
        earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, badge_id)
      );

      -- Seed default badges
      INSERT INTO badges (key, name, description, xp_reward) VALUES
        ('first_task',       'First Steps',        'Complete your first task',       25),
        ('first_homework',   'Studious',           'Complete your first homework',   25),
        ('streak_3',         '3-Day Streak',       'Active 3 days in a row',         50),
        ('streak_7',         'Week Warrior',       'Active 7 days in a row',         100),
        ('streak_30',        'Month Master',       'Active 30 days in a row',        500),
        ('shopping_helper',  'Shopping Helper',    'Contribute to 10 shopping lists', 75);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS user_badges;
      DROP TABLE IF EXISTS badges;
      DROP TABLE IF EXISTS user_stats;
      DROP TABLE IF EXISTS xp_ledger;
    `);
  }
}
