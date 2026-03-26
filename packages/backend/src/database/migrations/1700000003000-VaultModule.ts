import { MigrationInterface, QueryRunner } from 'typeorm';

export class VaultModule1700000003000 implements MigrationInterface {
  name = 'VaultModule1700000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── vault_documents ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "vault_documents" (
        "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
        "family_id"        UUID         NOT NULL,
        "uploaded_by"      UUID         NOT NULL,
        "name"             VARCHAR(255) NOT NULL,
        "description"      TEXT,
        "category"         VARCHAR(100),
        "storage_key"      VARCHAR(500) NOT NULL,
        "storage_bucket"   VARCHAR(100) NOT NULL,
        "file_size_bytes"  BIGINT,
        "mime_type"        VARCHAR(100),
        "is_encrypted"     BOOLEAN      NOT NULL DEFAULT true,
        "encryption_iv"    VARCHAR(24),
        "checksum_sha256"  VARCHAR(64),
        "tags"             TEXT[],
        "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "deleted_at"       TIMESTAMPTZ,
        CONSTRAINT "PK_vault_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vault_documents_family" FOREIGN KEY ("family_id")
          REFERENCES "families"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_vault_documents_uploader" FOREIGN KEY ("uploaded_by")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_vault_family" ON "vault_documents" ("family_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_vault_active" ON "vault_documents" ("family_id") WHERE "deleted_at" IS NULL`);
    // storage_key darf KEINEN öffentlichen Index haben (Security by Design)

    // ─── Zeilen-Level-Sicherheit (Row-Level Security) ─────────────────────
    // Optional: RLS für zusätzliche DB-Level Sicherheit
    -- await queryRunner.query(`ALTER TABLE "vault_documents" ENABLE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "vault_documents"`);
  }
}
