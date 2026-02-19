-- AlterTable: Add Admin Bar settings fields to site_settings
ALTER TABLE "site_settings" ADD COLUMN "adminBarEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN "adminBarShowBreadcrumbs" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN "adminBarShowNewButton" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN "adminBarShowSeoScore" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN "adminBarShowStatusToggle" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN "adminBarShowWordCount" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN "adminBarShowLastSaved" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN "adminBarShowSaveButton" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN "adminBarShowPublishButton" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN "adminBarShowPreviewButton" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN "adminBarShowViewSiteButton" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN "adminBarShowSiteNameDropdown" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN "adminBarShowUserDropdown" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN "adminBarShowEnvBadge" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN "adminBarBackgroundColor" TEXT NOT NULL DEFAULT '#0d0d18';
ALTER TABLE "site_settings" ADD COLUMN "adminBarAccentColor" TEXT NOT NULL DEFAULT '#6c63ff';
