-- AlterTable: Add customCapabilities column to users table
ALTER TABLE "users" ADD COLUMN "customCapabilities" TEXT[] DEFAULT ARRAY[]::TEXT[];
