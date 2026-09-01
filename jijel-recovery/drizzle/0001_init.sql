CREATE EXTENSION IF NOT EXISTS postgis;

DO $$ BEGIN
  CREATE TYPE "public"."need_category" AS ENUM(
    'food',
    'water',
    'shelter',
    'medical',
    'clothing',
    'transport',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."need_urgency" AS ENUM(
    'low',
    'medium',
    'high',
    'critical'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."need_status" AS ENUM(
    'open',
    'partial',
    'fulfilled',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."pledge_status" AS ENUM(
    'pending',
    'confirmed',
    'delivered',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "locations" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "daira" text NOT NULL,
  "address" text,
  "coordinates" geography(Point, 4326) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "needs" (
  "id" serial PRIMARY KEY NOT NULL,
  "location_id" integer NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "category" "need_category" NOT NULL,
  "urgency" "need_urgency" NOT NULL,
  "status" "need_status" DEFAULT 'open' NOT NULL,
  "quantity_needed" integer NOT NULL,
  "quantity_fulfilled" integer DEFAULT 0 NOT NULL,
  "contact_name" text,
  "contact_phone" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "pledges" (
  "id" serial PRIMARY KEY NOT NULL,
  "need_id" integer NOT NULL,
  "contributor_name" text NOT NULL,
  "contributor_contact" text,
  "quantity" integer NOT NULL,
  "notes" text,
  "status" "pledge_status" DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "needs"
    ADD CONSTRAINT "needs_location_id_locations_id_fk"
    FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "pledges"
    ADD CONSTRAINT "pledges_need_id_needs_id_fk"
    FOREIGN KEY ("need_id") REFERENCES "public"."needs"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
