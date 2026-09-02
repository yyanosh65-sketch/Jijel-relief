ALTER TYPE "need_category" ADD VALUE IF NOT EXISTS 'sos_orphan_family';

ALTER TABLE "needs" ADD COLUMN IF NOT EXISTS "facebook_url" text;
ALTER TABLE "urgent_alerts" ADD COLUMN IF NOT EXISTS "facebook_url" text;

CREATE TABLE IF NOT EXISTS "emergency_notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "commune" text NOT NULL,
  "commune_ar" text,
  "village" text,
  "phone" text,
  "facebook_url" text,
  "urgency" text,
  "category" text,
  "source_kind" text NOT NULL,
  "source_id" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "emergency_notifications_created_at_idx"
  ON "emergency_notifications" ("created_at" DESC);
