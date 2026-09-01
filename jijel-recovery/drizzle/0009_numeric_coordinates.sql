-- Migrate PostGIS geography coordinates to numeric lat/lng columns.

ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "lat" numeric(10, 6);
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "lng" numeric(10, 6);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'locations'
      AND column_name = 'coordinates'
  ) THEN
    UPDATE "locations"
    SET
      "lat" = ST_Y("coordinates"::geometry),
      "lng" = ST_X("coordinates"::geometry)
    WHERE "coordinates" IS NOT NULL;

    ALTER TABLE "locations" DROP COLUMN "coordinates";
  END IF;
END $$;

ALTER TABLE "locations" ALTER COLUMN "lat" SET NOT NULL;
ALTER TABLE "locations" ALTER COLUMN "lng" SET NOT NULL;

ALTER TABLE "urgent_alerts" ADD COLUMN IF NOT EXISTS "lat" numeric(10, 6);
ALTER TABLE "urgent_alerts" ADD COLUMN IF NOT EXISTS "lng" numeric(10, 6);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'urgent_alerts'
      AND column_name = 'coordinates'
  ) THEN
    UPDATE "urgent_alerts"
    SET
      "lat" = ST_Y("coordinates"::geometry),
      "lng" = ST_X("coordinates"::geometry)
    WHERE "coordinates" IS NOT NULL;

    ALTER TABLE "urgent_alerts" DROP COLUMN "coordinates";
  END IF;
END $$;

ALTER TABLE "urgent_alerts" ALTER COLUMN "lat" SET NOT NULL;
ALTER TABLE "urgent_alerts" ALTER COLUMN "lng" SET NOT NULL;

ALTER TABLE "emergency_facilities" ADD COLUMN IF NOT EXISTS "lat" numeric(10, 6);
ALTER TABLE "emergency_facilities" ADD COLUMN IF NOT EXISTS "lng" numeric(10, 6);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'emergency_facilities'
      AND column_name = 'coordinates'
  ) THEN
    UPDATE "emergency_facilities"
    SET
      "lat" = ST_Y("coordinates"::geometry),
      "lng" = ST_X("coordinates"::geometry)
    WHERE "coordinates" IS NOT NULL;

    ALTER TABLE "emergency_facilities" DROP COLUMN "coordinates";
  END IF;
END $$;

ALTER TABLE "emergency_facilities" ALTER COLUMN "lat" SET NOT NULL;
ALTER TABLE "emergency_facilities" ALTER COLUMN "lng" SET NOT NULL;

ALTER TABLE "community_helpers" ADD COLUMN IF NOT EXISTS "lat" numeric(10, 6);
ALTER TABLE "community_helpers" ADD COLUMN IF NOT EXISTS "lng" numeric(10, 6);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'community_helpers'
      AND column_name = 'coordinates'
  ) THEN
    UPDATE "community_helpers"
    SET
      "lat" = ST_Y("coordinates"::geometry),
      "lng" = ST_X("coordinates"::geometry)
    WHERE "coordinates" IS NOT NULL;

    ALTER TABLE "community_helpers" DROP COLUMN "coordinates";
  END IF;
END $$;

ALTER TABLE "community_helpers" ALTER COLUMN "lat" SET NOT NULL;
ALTER TABLE "community_helpers" ALTER COLUMN "lng" SET NOT NULL;
