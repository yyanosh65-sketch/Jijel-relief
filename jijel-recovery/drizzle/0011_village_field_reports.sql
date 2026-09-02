DO $$ BEGIN
  CREATE TYPE "public"."field_road_passability" AS ENUM('paved', 'rough_4x4', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."field_infrastructure_status" AS ENUM('normal', 'intermittent', 'cut_off', 'unknown');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "village_field_reports" (
  "id" serial PRIMARY KEY NOT NULL,
  "village_name_ar" text NOT NULL,
  "commune" text NOT NULL,
  "commune_ar" text NOT NULL,
  "daira" text NOT NULL,
  "daira_ar" text NOT NULL,
  "lat" numeric(10, 6) NOT NULL,
  "lng" numeric(10, 6) NOT NULL,
  "reporter_name" text NOT NULL,
  "reporter_phone" text NOT NULL,
  "affected_families" integer,
  "population_estimate" integer,
  "road_passability" "field_road_passability" NOT NULL,
  "water_status" "field_infrastructure_status" DEFAULT 'unknown' NOT NULL,
  "fodder_status" "field_infrastructure_status" DEFAULT 'unknown' NOT NULL,
  "electricity_status" "field_infrastructure_status" DEFAULT 'unknown' NOT NULL,
  "urgent_needs" text[] DEFAULT '{}' NOT NULL,
  "notes" text,
  "media_urls" text[] DEFAULT '{}' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "village_field_reports_location_idx"
  ON "village_field_reports" ("village_name_ar", "commune_ar", "daira_ar");
