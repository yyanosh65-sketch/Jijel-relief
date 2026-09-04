-- Migration 0020: Volunteer availability flag for live macro stats

ALTER TABLE "volunteers"
  ADD COLUMN IF NOT EXISTS "is_available" boolean NOT NULL DEFAULT true;
