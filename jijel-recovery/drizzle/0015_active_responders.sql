DO $$ BEGIN
  CREATE TYPE "public"."responder_role" AS ENUM(
    'doctor',
    'paramedic',
    'psychologist',
    'food_distribution',
    'clearing_debris',
    'logistics_driver',
    'general_volunteer'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."responder_status" AS ENUM(
    'en_route',
    'on_site',
    'completed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "active_responders" (
  "id" serial PRIMARY KEY NOT NULL,
  "need_id" integer,
  "settlement_id" integer,
  "full_name" varchar(120) NOT NULL,
  "phone" varchar(20) NOT NULL,
  "role" "public"."responder_role" NOT NULL,
  "organization_name" varchar(150),
  "status" "public"."responder_status" DEFAULT 'on_site' NOT NULL,
  "eta_minutes" integer,
  "supplies_brought" text,
  "checked_in_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "active_responders"
    ADD CONSTRAINT "active_responders_need_id_needs_id_fk"
    FOREIGN KEY ("need_id") REFERENCES "public"."needs"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "active_responders_need_id_idx"
  ON "active_responders" ("need_id");

CREATE INDEX IF NOT EXISTS "active_responders_settlement_id_idx"
  ON "active_responders" ("settlement_id");

CREATE INDEX IF NOT EXISTS "active_responders_status_idx"
  ON "active_responders" ("status");
