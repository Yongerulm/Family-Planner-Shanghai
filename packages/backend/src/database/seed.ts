/**
 * Database Seed Script
 * Erstellt eine Test-Familie mit Admin, erwachsenem Mitglied und Kind.
 *
 * Ausführen: pnpm --filter @family-planner/api seed
 * Oder direkt: npx ts-node -r tsconfig-paths/register src/database/seed.ts
 */
import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// Lade .env vor allem anderen
config({ path: join(__dirname, '..', '..', '..', '..', '.env') });
config({ path: join(__dirname, '..', '..', '..', '..', '.env.local') });

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);
const BCRYPT_PEPPER = process.env.BCRYPT_PEPPER ?? '';

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password + BCRYPT_PEPPER, BCRYPT_ROUNDS);
}

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    database: process.env.DB_NAME ?? 'family_planner',
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    synchronize: false,
    logging: false,
  });

  await ds.initialize();
  console.log('✅ Database connected');

  const qr = ds.createQueryRunner();
  await qr.startTransaction();

  try {
    // ─── Check if already seeded ──────────────────────────────────────────────
    const existingAdmin = await qr.query(
      `SELECT id FROM users WHERE email = 'admin@family.local' LIMIT 1`,
    );
    if (existingAdmin.length > 0) {
      console.log('⚠️  Seed data already exists. Skipping.');
      await qr.rollbackTransaction();
      await ds.destroy();
      return;
    }

    // ─── Admin User ───────────────────────────────────────────────────────────
    const adminId = crypto.randomUUID();
    const adminHash = await hashPassword('Admin1234!');
    await qr.query(
      `INSERT INTO users (id, email, password_hash, display_name, is_active, token_version)
       VALUES ($1, $2, $3, $4, true, 0)`,
      [adminId, 'admin@family.local', adminHash, 'Familie Admin'],
    );

    // ─── Adult User ───────────────────────────────────────────────────────────
    const adultId = crypto.randomUUID();
    const adultHash = await hashPassword('Adult1234!');
    await qr.query(
      `INSERT INTO users (id, email, password_hash, display_name, is_active, token_version)
       VALUES ($1, $2, $3, $4, true, 0)`,
      [adultId, 'erwachsener@family.local', adultHash, 'Mama / Papa'],
    );

    // ─── Child User ───────────────────────────────────────────────────────────
    const childId = crypto.randomUUID();
    const childHash = await hashPassword('Kind1234!');
    await qr.query(
      `INSERT INTO users (id, email, password_hash, display_name, is_active, token_version)
       VALUES ($1, $2, $3, $4, true, 0)`,
      [childId, 'kind@family.local', childHash, 'Kind'],
    );

    // ─── Familie ──────────────────────────────────────────────────────────────
    const familyId = crypto.randomUUID();
    const inviteCode = crypto.randomBytes(6).toString('hex').toUpperCase();
    await qr.query(
      `INSERT INTO families (id, name, invite_code, settings)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [familyId, 'Musterfamilie Shanghai', inviteCode, JSON.stringify({ timezone: 'Asia/Shanghai' })],
    );

    // ─── Familienmitgliedschaften ─────────────────────────────────────────────
    await qr.query(
      `INSERT INTO user_family_roles (user_id, family_id, role) VALUES ($1, $2, $3)`,
      [adminId, familyId, 'family_admin'],
    );
    await qr.query(
      `INSERT INTO user_family_roles (user_id, family_id, role) VALUES ($1, $2, $3)`,
      [adultId, familyId, 'adult'],
    );
    await qr.query(
      `INSERT INTO user_family_roles (user_id, family_id, role) VALUES ($1, $2, $3)`,
      [childId, familyId, 'child'],
    );

    // ─── cached_role updaten ──────────────────────────────────────────────────
    await qr.query(`UPDATE users SET cached_role = 'family_admin' WHERE id = $1`, [adminId]);
    await qr.query(`UPDATE users SET cached_role = 'adult' WHERE id = $1`, [adultId]);
    await qr.query(`UPDATE users SET cached_role = 'child' WHERE id = $1`, [childId]);

    // ─── User Stats initialisieren ────────────────────────────────────────────
    for (const userId of [adminId, adultId, childId]) {
      await qr.query(
        `INSERT INTO user_stats (user_id, total_xp, level) VALUES ($1, 0, 1)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId],
      );
    }

    // ─── Beispiel-Einkaufsliste ───────────────────────────────────────────────
    const listId = crypto.randomUUID();
    await qr.query(
      `INSERT INTO shopping_lists (id, family_id, name, is_archived)
       VALUES ($1, $2, 'Wocheneinkauf', false)`,
      [listId, familyId],
    );
    const groceries = ['Milch', 'Brot', 'Eier', 'Äpfel', 'Nudeln'];
    for (let i = 0; i < groceries.length; i++) {
      await qr.query(
        `INSERT INTO shopping_items (id, list_id, name, quantity, unit, sort_order, is_checked)
         VALUES ($1, $2, $3, null, null, $4, false)`,
        [crypto.randomUUID(), listId, groceries[i], i],
      );
    }

    await qr.commitTransaction();

    console.log('\n✅ Seed completed successfully!\n');
    console.log('─────────────────────────────────────────');
    console.log('Test-Accounts:');
    console.log('  Admin:       admin@family.local        / Admin1234!');
    console.log('  Erwachsener: erwachsener@family.local  / Adult1234!');
    console.log('  Kind:        kind@family.local          / Kind1234!');
    console.log('─────────────────────────────────────────');
    console.log(`Familie-ID:     ${familyId}`);
    console.log(`Invite-Code:    ${inviteCode}`);
    console.log('─────────────────────────────────────────\n');
    console.log('⚠️  WICHTIG: Ändere alle Passwörter nach dem ersten Login!');
  } catch (error) {
    await qr.rollbackTransaction();
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await qr.release();
    await ds.destroy();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
