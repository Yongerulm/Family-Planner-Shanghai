import { MigrationInterface, QueryRunner } from 'typeorm';

export class FreezerEmergencyWeather1700000007000 implements MigrationInterface {
  name = 'FreezerEmergencyWeather1700000007000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- ─── Freezer ─────────────────────────────────────────────────────────

      CREATE TABLE freezer_locations (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        name        VARCHAR(100) NOT NULL,
        description TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_freezer_locations_family_id ON freezer_locations(family_id);

      CREATE TABLE freezer_items (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        location_id UUID NOT NULL REFERENCES freezer_locations(id) ON DELETE CASCADE,
        name        VARCHAR(200) NOT NULL,
        quantity    NUMERIC(10, 3),
        unit        VARCHAR(50),
        frozen_on   DATE,
        best_before DATE,
        notes       TEXT,
        added_by    UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_freezer_items_location_id ON freezer_items(location_id);
      CREATE INDEX idx_freezer_items_best_before  ON freezer_items(best_before) WHERE best_before IS NOT NULL;

      -- ─── Emergency Preparedness ───────────────────────────────────────────

      CREATE TYPE emergency_category AS ENUM (
        'food', 'water', 'medicine', 'documents', 'tools', 'communication', 'first_aid', 'other'
      );

      CREATE TABLE emergency_items (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        name            VARCHAR(200) NOT NULL,
        category        emergency_category NOT NULL DEFAULT 'other',
        quantity        NUMERIC(10, 3),
        unit            VARCHAR(50),
        min_quantity    NUMERIC(10, 3),
        expiry_date     DATE,
        notes           TEXT,
        last_checked_at TIMESTAMPTZ,
        last_checked_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_emergency_items_family_id  ON emergency_items(family_id);
      CREATE INDEX idx_emergency_items_expiry     ON emergency_items(expiry_date) WHERE expiry_date IS NOT NULL;

      -- ─── Weather ──────────────────────────────────────────────────────────

      CREATE TABLE weather_snapshots (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id       UUID NOT NULL,
        temperature     NUMERIC(6, 2) NOT NULL,
        feels_like      NUMERIC(6, 2),
        humidity        INTEGER,
        wind_speed      NUMERIC(6, 2),
        wind_direction  INTEGER,
        pressure        INTEGER,
        condition       VARCHAR(100),
        condition_code  INTEGER,
        icon_code       VARCHAR(20),
        precipitation   NUMERIC(6, 2),
        uv_index        INTEGER,
        aqi             INTEGER,
        source          VARCHAR(50) NOT NULL,
        recorded_at     TIMESTAMPTZ NOT NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_weather_snapshots_family_recorded ON weather_snapshots(family_id, recorded_at DESC);

      -- Auto-purge snapshots older than 7 days via pg scheduled job would go here;
      -- instead the application layer runs pruneOldSnapshots() periodically.
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS weather_snapshots;
      DROP TABLE IF EXISTS emergency_items;
      DROP TYPE IF EXISTS emergency_category;
      DROP TABLE IF EXISTS freezer_items;
      DROP TABLE IF EXISTS freezer_locations;
    `);
  }
}
