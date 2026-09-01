ALTER TABLE "needs"
  ADD COLUMN IF NOT EXISTS "media_urls" text[] DEFAULT '{}' NOT NULL;

ALTER TABLE "needs"
  ADD COLUMN IF NOT EXISTS "voice_note_data" text;

ALTER TABLE "needs"
  ADD COLUMN IF NOT EXISTS "contact_whatsapp" text;
