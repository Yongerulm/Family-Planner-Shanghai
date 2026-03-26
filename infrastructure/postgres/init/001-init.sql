-- PostgreSQL Initialization Script
-- Family Planner Shanghai
-- Wird nur bei erstem Container-Start ausgeführt

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Für Volltextsuche
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- Für gen_random_uuid()

-- Separater App-User (nicht root)
-- Wird via Environment-Variables erstellt, hier nur Grants
-- GRANT ALL PRIVILEGES ON DATABASE family_planner TO family_app;

-- Kommentar: TypeORM Migrations übernehmen die Tabellenerstellung
-- Dieser Script setzt nur Extensions auf.

SELECT 'PostgreSQL initialized for Family Planner' AS status;
