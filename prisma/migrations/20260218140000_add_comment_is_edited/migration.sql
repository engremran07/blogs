-- Add isEdited column to comments table
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "isEdited" BOOLEAN NOT NULL DEFAULT false;
