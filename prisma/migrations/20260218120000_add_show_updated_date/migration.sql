-- Add showUpdatedDate column to site_settings
ALTER TABLE "site_settings" ADD COLUMN "showUpdatedDate" BOOLEAN NOT NULL DEFAULT true;
