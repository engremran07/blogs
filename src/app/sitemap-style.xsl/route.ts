import { generateXslStylesheet } from "@/features/sitemap/sitemap";

export async function GET() {
  return generateXslStylesheet();
}
