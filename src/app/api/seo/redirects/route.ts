import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { auth } from "@/server/auth";
import { z } from "zod";

const upsertSchema = z.object({
  fromPath: z.string().min(1).max(2000).regex(/^\//, "fromPath must start with /"),
  toPath: z.string().min(1).max(2000),
  statusCode: z.number().int().refine((v) => v === 301 || v === 302, "Must be 301 or 302").default(301),
  isActive: z.boolean().default(true),
  note: z.string().max(500).optional(),
});

// GET /api/seo/redirects — list all redirects
export async function GET() {
  const session = await auth();
  if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR"].includes(session.user.role ?? "")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const redirects = await prisma.seoRedirect.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: redirects });
}

// POST /api/seo/redirects — create or update a redirect
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR"].includes(session.user.role ?? "")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { fromPath, toPath, statusCode, isActive, note } = parsed.data;

  // Prevent redirect loops
  if (fromPath === toPath) {
    return NextResponse.json({ success: false, error: "fromPath and toPath must differ" }, { status: 400 });
  }

  const redirect = await prisma.seoRedirect.upsert({
    where: { fromPath },
    create: { fromPath, toPath, statusCode, isActive, note },
    update: { toPath, statusCode, isActive, note },
  });

  return NextResponse.json({ success: true, data: redirect });
}

// DELETE /api/seo/redirects?id=<id> — delete a redirect
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR"].includes(session.user.role ?? "")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });

  await prisma.seoRedirect.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
