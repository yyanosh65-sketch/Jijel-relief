-- Wilaya multi-tenancy (eastern relief belt)
-- Safe to re-run: IF NOT EXISTS / duplicate_object guards

DO $$ BEGIN
  CREATE TYPE "wilaya_code" AS ENUM (
    '18_jijel',
    '06_bejaia',
    '21_skikda',
    '19_setif'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "locations"
  ADD COLUMN IF NOT EXISTS "wilaya" "wilaya_code" NOT NULL DEFAULT '18_jijel';

ALTER TABLE "needs"
  ADD COLUMN IF NOT EXISTS "wilaya" "wilaya_code" NOT NULL DEFAULT '18_jijel';

ALTER TABLE "volunteers"
  ADD COLUMN IF NOT EXISTS "is_available" boolean NOT NULL DEFAULT true;

ALTER TABLE "volunteers"
  ADD COLUMN IF NOT EXISTS "wilaya" "wilaya_code" NOT NULL DEFAULT '18_jijel';
