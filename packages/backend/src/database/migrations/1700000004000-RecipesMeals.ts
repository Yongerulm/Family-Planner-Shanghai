import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecipesMeals1700000004000 implements MigrationInterface {
  name = 'RecipesMeals1700000004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE recipes (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        name        VARCHAR(200) NOT NULL,
        description TEXT,
        prep_time_min INTEGER,
        cook_time_min INTEGER,
        servings    INTEGER,
        image_url   VARCHAR(500),
        tags        TEXT[],
        created_by  UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_recipes_family_id ON recipes(family_id);

      CREATE TABLE recipe_ingredients (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        name        VARCHAR(200) NOT NULL,
        quantity    NUMERIC(10, 3),
        unit        VARCHAR(50),
        sort_order  INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);

      CREATE TYPE meal_slot AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

      CREATE TABLE meal_plans (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        week_start  DATE NOT NULL,
        name        VARCHAR(100),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_meal_plans_family_id ON meal_plans(family_id);

      CREATE TABLE meal_plan_entries (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id     UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
        recipe_id   UUID REFERENCES recipes(id) ON DELETE SET NULL,
        date        DATE NOT NULL,
        slot        meal_slot NOT NULL,
        custom_meal VARCHAR(200),
        notes       TEXT
      );

      CREATE INDEX idx_meal_plan_entries_plan_id ON meal_plan_entries(plan_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS meal_plan_entries;
      DROP TABLE IF EXISTS meal_plans;
      DROP TYPE IF EXISTS meal_slot;
      DROP TABLE IF EXISTS recipe_ingredients;
      DROP TABLE IF EXISTS recipes;
    `);
  }
}
