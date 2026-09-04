-- Migration 0019: Volunteer fleet registration

DO $$ BEGIN
  CREATE TYPE "volunteer_vehicle" AS ENUM (
    'suv_4x4',
    'truck',
    'sedan',
    'on_foot'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "volunteer_specialty" AS ENUM (
    'general_relief',
    'medical',
    'veterinary',
    'debris_clearing'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "volunteers" (
  "id"           serial PRIMARY KEY,
  "full_name"    varchar(120) NOT NULL,
  "phone"        varchar(20) NOT NULL,
  "commune"      varchar(80) NOT NULL,
  "vehicle_type" "volunteer_vehicle" NOT NULL,
  "specialty"    "volunteer_specialty" NOT NULL,
  "status"       varchar(30) NOT NULL DEFAULT 'pending',
  "created_at"   timestamp with time zone DEFAULT now() NOT NULL
);
