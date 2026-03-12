import { generateSitemapIndex } from "@/features/sitemap/sitemap";

export const dynamic = "force-dynamic";

export async function GET() {
  return generateSitemapIndex();
}
