DO $$ BEGIN
  CREATE TYPE "public"."convoy_vehicle_type" AS ENUM(
    'truck',
    'pickup_4x4',
    'van',
    'bus'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."convoy_cargo_type" AS ENUM(
    'food',
    'farm_equipment',
    'blankets',
    'medicine',
    'mixed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."convoy_entry_point" AS ENUM(
    'bejaia_west',
    'setif_south',
    'skikda_east'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."convoy_status" AS ENUM(
    'planned',
    'en_route',
    'arrived',
    'completed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "convoys" (
  "id" serial PRIMARY KEY NOT NULL,
  "departure_wilaya" text NOT NULL,
  "driver_name" text NOT NULL,
  "driver_phone" text NOT NULL,
  "driver_whatsapp" text,
  "vehicle_type" convoy_vehicle_type NOT NULL,
  "cargo_type" convoy_cargo_type NOT NULL,
  "eta" timestamp with time zone NOT NULL,
  "entry_point" convoy_entry_point NOT NULL,
  "status" convoy_status DEFAULT 'planned' NOT NULL,
  "welcoming_guide_name" text,
  "welcoming_guide_phone" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
