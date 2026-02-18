-- AlterTable: Add auto-increment postNumber to posts
ALTER TABLE "posts" ADD COLUMN "postNumber" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "posts_postNumber_key" ON "posts"("postNumber");

-- CreateIndex  
CREATE INDEX "posts_postNumber_idx" ON "posts"("postNumber");
