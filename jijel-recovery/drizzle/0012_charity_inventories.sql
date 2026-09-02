DO $$ BEGIN
  CREATE TYPE "public"."charity_item_category" AS ENUM(
    'water_equipment',
    'fodder',
    'building_materials',
    'food'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."charity_availability" AS ENUM(
    'available',
    'limited',
    'reserved',
    'depleted'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."charity_inventory_status" AS ENUM(
    'pending',
    'approved',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "charity_inventories" (
  "id" serial PRIMARY KEY NOT NULL,
  "charity_name" text NOT NULL,
  "charity_name_ar" text,
  "representative_name" text NOT NULL,
  "representative_phone" text NOT NULL,
  "representative_whatsapp" text,
  "daira" text NOT NULL,
  "commune" text NOT NULL,
  "commune_ar" text NOT NULL,
  "category" "charity_item_category" NOT NULL,
  "item_title" text NOT NULL,
  "available_quantity" integer NOT NULL,
  "unit" text NOT NULL,
  "coverage_radius_km" integer,
  "target_douars" text[] DEFAULT '{}' NOT NULL,
  "availability" "charity_availability" DEFAULT 'available' NOT NULL,
  "verified" boolean DEFAULT false NOT NULL,
  "status" "charity_inventory_status" DEFAULT 'approved' NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "charity_inventories_commune_idx"
  ON "charity_inventories" ("commune");

CREATE INDEX IF NOT EXISTS "charity_inventories_category_idx"
  ON "charity_inventories" ("category");

CREATE INDEX IF NOT EXISTS "charity_inventories_status_idx"
  ON "charity_inventories" ("status", "availability");
