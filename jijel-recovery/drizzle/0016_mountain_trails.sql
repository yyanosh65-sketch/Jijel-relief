DO $$ BEGIN
  CREATE TYPE "public"."trail_clearance" AS ENUM(
    'sedan_passable',
    'high_clearance_only',
    'strict_4x4_required',
    'completely_blocked'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "mountain_trails" (
  "id" serial PRIMARY KEY NOT NULL,
  "road_code" varchar(50) NOT NULL,
  "settlement_id" integer,
  "clearance_level" "public"."trail_clearance" NOT NULL,
  "audio_voice_note_url" text,
  "notes" text,
  "reported_by_phone" varchar(20),
  "lat" varchar(30) NOT NULL,
  "lng" varchar(30) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "mountain_trails_road_code_idx"
  ON "mountain_trails" ("road_code");

CREATE INDEX IF NOT EXISTS "mountain_trails_settlement_id_idx"
  ON "mountain_trails" ("settlement_id");

CREATE INDEX IF NOT EXISTS "mountain_trails_clearance_level_idx"
  ON "mountain_trails" ("clearance_level");
