import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShoppingModule1700000001000 implements MigrationInterface {
  name = 'ShoppingModule1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── shopping_lists ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "shopping_lists" (
        "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
        "family_id"   UUID         NOT NULL,
        "name"        VARCHAR(100) NOT NULL,
        "is_archived" BOOLEAN      NOT NULL DEFAULT false,
        "created_by"  UUID,
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_shopping_lists" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shopping_lists_family" FOREIGN KEY ("family_id")
          REFERENCES "families"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_shopping_lists_creator" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_shopping_lists_family_id" ON "shopping_lists" ("family_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_shopping_lists_archived" ON "shopping_lists" ("family_id", "is_archived")`,
    );

    // ─── shopping_items ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "shopping_items" (
        "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
        "list_id"     UUID         NOT NULL,
        "name"        VARCHAR(200) NOT NULL,
        "quantity"    VARCHAR(50),
        "category"    VARCHAR(50),
        "is_checked"  BOOLEAN      NOT NULL DEFAULT false,
        "checked_by"  UUID,
        "checked_at"  TIMESTAMPTZ,
        "sort_order"  INTEGER      NOT NULL DEFAULT 0,
        "created_by"  UUID,
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_shopping_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shopping_items_list" FOREIGN KEY ("list_id")
          REFERENCES "shopping_lists"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_shopping_items_checker" FOREIGN KEY ("checked_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_shopping_items_list_id" ON "shopping_items" ("list_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_shopping_items_checked" ON "shopping_items" ("list_id", "is_checked")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "shopping_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shopping_lists"`);
  }
}
