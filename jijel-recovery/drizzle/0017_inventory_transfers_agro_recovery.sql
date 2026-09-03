DO $$ BEGIN
  CREATE TYPE "public"."transfer_status" AS ENUM(
    'available_surplus',
    'matched_in_transit',
    'received'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."agro_category" AS ENUM(
    'olive_saplings',
    'beehives',
    'livestock_feed_hay',
    'irrigation_hoses',
    'veterinary_supplies'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "inventory_transfers" (
  "id" serial PRIMARY KEY NOT NULL,
  "source_hub_name" varchar(120) NOT NULL,
  "source_commune" varchar(80) NOT NULL,
  "item_category" varchar(80) NOT NULL,
  "surplus_quantity" integer NOT NULL,
  "needed_in_exchange" varchar(150),
  "status" "public"."transfer_status" DEFAULT 'available_surplus' NOT NULL,
  "coordinator_phone" varchar(20) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "agro_recovery_pledges" (
  "id" serial PRIMARY KEY NOT NULL,
  "donor_organization" varchar(150) NOT NULL,
  "donor_wilaya" varchar(50) NOT NULL,
  "category" "public"."agro_category" NOT NULL,
  "quantity_offered" integer NOT NULL,
  "target_commune" varchar(80),
  "status" varchar(30) DEFAULT 'ready_for_dispatch' NOT NULL,
  "contact_phone" varchar(20) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "inventory_transfers_status_idx"
  ON "inventory_transfers" ("status");

CREATE INDEX IF NOT EXISTS "inventory_transfers_source_commune_idx"
  ON "inventory_transfers" ("source_commune");

CREATE INDEX IF NOT EXISTS "agro_recovery_pledges_category_idx"
  ON "agro_recovery_pledges" ("category");

CREATE INDEX IF NOT EXISTS "agro_recovery_pledges_status_idx"
  ON "agro_recovery_pledges" ("status");
