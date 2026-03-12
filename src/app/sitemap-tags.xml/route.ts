import { generateTagsSitemap } from "@/features/sitemap/sitemap";

export const dynamic = "force-dynamic";

export async function GET() {
  return generateTagsSitemap();
}
