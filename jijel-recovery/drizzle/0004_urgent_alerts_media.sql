ALTER TABLE IF EXISTS "sos_alerts" RENAME TO "urgent_alerts";

ALTER TABLE "urgent_alerts"
  ADD COLUMN IF NOT EXISTS "media_urls" text[] DEFAULT '{}' NOT NULL;

ALTER TABLE "urgent_alerts"
  ADD COLUMN IF NOT EXISTS "voice_note_data" text;
