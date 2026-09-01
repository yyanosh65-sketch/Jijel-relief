-- Intelligence & emergency extensions

DO $$ BEGIN
  CREATE TYPE "public"."sos_emergency_type" AS ENUM(
    'fire_flare',
    'livestock_trap',
    'medical',
    'water_cutoff'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."sos_alert_status" AS ENUM(
    'active',
    'acknowledged',
    'resolved'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "sos_alerts" (
  "id" serial PRIMARY KEY NOT NULL,
  "emergency_type" "sos_emergency_type" NOT NULL,
  "description" text NOT NULL,
  "reporter_name" text NOT NULL,
  "reporter_phone" text,
  "daira" text NOT NULL,
  "commune" text NOT NULL,
  "village" text,
  "coordinates" geography(Point, 4326) NOT NULL,
  "status" "sos_alert_status" DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
