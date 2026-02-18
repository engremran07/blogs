-- Phase 3 editor fields: add advanced editor toggles to editor_settings
ALTER TABLE "editor_settings" ADD COLUMN "enableSlashCommands" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "editor_settings" ADD COLUMN "enableCaseChange" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "editor_settings" ADD COLUMN "enableFormatPainter" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "editor_settings" ADD COLUMN "enableFocusMode" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "editor_settings" ADD COLUMN "enableContentTemplates" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "editor_settings" ADD COLUMN "enableAutosaveIndicator" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "editor_settings" ADD COLUMN "enableButtonBlock" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "editor_settings" ADD COLUMN "enableSpacerBlock" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "editor_settings" ADD COLUMN "enableGallery" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "editor_settings" ADD COLUMN "enableBookmarkCard" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "editor_settings" ADD COLUMN "enableAudioEmbed" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "editor_settings" ADD COLUMN "enableFileAttach" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "editor_settings" ADD COLUMN "enableDropCap" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "editor_settings" ADD COLUMN "enableFootnotes" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "editor_settings" ADD COLUMN "enableMathBlocks" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "editor_settings" ADD COLUMN "enableAnchorLinks" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "editor_settings" ADD COLUMN "enableKeyboardShortcutsHelp" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "editor_settings" ADD COLUMN "enableAdBlock" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "editor_settings" ADD COLUMN "enableSeoScore" BOOLEAN NOT NULL DEFAULT true;

-- Distribution config persistence: add JSON field to site_settings
ALTER TABLE "site_settings" ADD COLUMN "distributionConfig" JSONB;
