DO $$ BEGIN
  CREATE TYPE "public"."facility_type" AS ENUM(
    'civil_protection',
    'veterinary_clinic',
    'forest_conservancy'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "emergency_facilities" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "facility_type" "facility_type" NOT NULL,
  "commune" text NOT NULL,
  "coordinates" geography(Point, 4326) NOT NULL,
  "hotline_phone" text NOT NULL,
  "secondary_phone" text,
  "available_services" text[] NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
