-- Add many-to-many relation between pages and tags (implicit Prisma relation table)
CREATE TABLE "_PageTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PageTags_A_fkey" FOREIGN KEY ("A") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PageTags_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "_PageTags_AB_unique" ON "_PageTags"("A", "B");
CREATE INDEX "_PageTags_B_index" ON "_PageTags"("B");

-- Drop legacy adsEnabled column from ad_settings (removed from schema)
ALTER TABLE "ad_settings" DROP COLUMN IF EXISTS "adsEnabled";
