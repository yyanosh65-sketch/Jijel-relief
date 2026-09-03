-- Migration 0018: Granular Settlements + Community Facilities
-- Adds settlement_type enum and community_facilities table

DO $$ BEGIN
  CREATE TYPE "settlement_type" AS ENUM (
    'daira_center',
    'commune_center',
    'mechta',
    'dechra',
    'hamlet_isolated'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "community_facility_type" AS ENUM (
    'mosque_operational',
    'mosque_damaged',
    'zawiya_sanctuary',
    'water_spring',
    'oxygen_generator',
    'cold_chain_pharma'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "community_facilities" (
  "id"                       serial PRIMARY KEY,
  "name"                     text NOT NULL,
  "name_ar"                  text NOT NULL,
  "facility_type"            "community_facility_type" NOT NULL,
  "commune"                  varchar(80) NOT NULL,
  "commune_ar"               varchar(80),
  "daira"                    varchar(80),
  "lat"                      numeric(10,6) NOT NULL,
  "lng"                      numeric(10,6) NOT NULL,
  "has_water_tank"           boolean NOT NULL DEFAULT false,
  "has_power_generator"      boolean NOT NULL DEFAULT false,
  "shelter_capacity_people"  integer,
  "coordinator_phone"        varchar(20),
  "notes"                    text,
  "created_at"               timestamp with time zone DEFAULT now() NOT NULL
);
