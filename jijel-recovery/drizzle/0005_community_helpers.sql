DO $$ BEGIN
  CREATE TYPE "public"."helper_skill" AS ENUM(
    'transport_4x4',
    'cargo_truck',
    'vet_livestock',
    'first_aid',
    'construction',
    'hosting',
    'general_volunteer'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."helper_status" AS ENUM(
    'pending',
    'verified',
    'rejected',
    'inactive'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "community_helpers" (
  "id" serial PRIMARY KEY NOT NULL,
  "full_name" text NOT NULL,
  "phone" text NOT NULL,
  "whatsapp_phone" text,
  "daira" text NOT NULL,
  "commune" text NOT NULL,
  "coordinates" geography(Point, 4326) NOT NULL,
  "skills" helper_skill[] NOT NULL,
  "availability_notes" text,
  "status" helper_status DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

INSERT INTO "community_helpers" (
  "full_name",
  "phone",
  "whatsapp_phone",
  "daira",
  "commune",
  "coordinates",
  "skills",
  "availability_notes",
  "status"
)
SELECT
  'أمين بوعزة',
  '0555781234',
  '0555781234',
  'Taher',
  'Taher',
  ST_SetSRID(ST_MakePoint(5.8944, 36.7783), 4326)::geography,
  ARRAY['transport_4x4', 'general_volunteer']::helper_skill[],
  'متاح من 08:00 حتى 20:00 — مسلك الطاهير وزيامة',
  'verified'
WHERE NOT EXISTS (SELECT 1 FROM "community_helpers" LIMIT 1);

INSERT INTO "community_helpers" (
  "full_name",
  "phone",
  "whatsapp_phone",
  "daira",
  "commune",
  "coordinates",
  "skills",
  "availability_notes",
  "status"
)
SELECT
  'ليلى حمداني',
  '0667123456',
  '0667123456',
  'Jijel',
  'Jijel',
  ST_SetSRID(ST_MakePoint(5.7667, 36.8211), 4326)::geography,
  ARRAY['vet_livestock', 'first_aid']::helper_skill[],
  'بيطري متطوعة — تدخلات عاجلة بالمواشي',
  'verified'
WHERE (SELECT COUNT(*) FROM "community_helpers") < 2;

INSERT INTO "community_helpers" (
  "full_name",
  "phone",
  "whatsapp_phone",
  "daira",
  "commune",
  "coordinates",
  "skills",
  "availability_notes",
  "status"
)
SELECT
  'رشيد قادري',
  '0771988001',
  '0771988001',
  'Texenna',
  'Texenna',
  ST_SetSRID(ST_MakePoint(5.7444, 36.6556), 4326)::geography,
  ARRAY['cargo_truck', 'construction']::helper_skill[],
  'شاحنة 6 roues + عتاد ترميم خفيف',
  'verified'
WHERE (SELECT COUNT(*) FROM "community_helpers") < 3;
