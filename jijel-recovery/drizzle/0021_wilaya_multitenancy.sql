-- Migration 0021: Wilaya multi-tenancy (eastern relief belt)
-- Enum: wilaya_code / wilayaCodeEnum
-- Columns on settlements(locations), needs, volunteers

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
  ADD COLUMN IF NOT EXISTS "wilaya" "wilaya_code" NOT NULL DEFAULT '18_jijel';
