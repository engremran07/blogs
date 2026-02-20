import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/prisma";

/**
 * GET /api/admin-bar/meta?type=post&slug=my-post
 * GET /api/admin-bar/meta?type=page&slug=about
 *
 * Returns lightweight metadata for the AdminBar context zone
 * when viewing a public post or page (no EditorContext available).
 *
 * Auth-gated: requires EDITOR / ADMINISTRATOR / SUPER_ADMIN.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }
  const role = session.user.role;
  if (!["EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "post" | "page"
  const slug = searchParams.get("slug");

  if (!type || !slug) {
    return NextResponse.json(
      { success: false, error: "Missing type or slug" },
      { status: 400 },
    );
  }

  try {
    if (type === "post") {
      const post = await prisma.post.findUnique({
        where: { slug },
        select: {
          id: true,
          postNumber: true,
          title: true,
          slug: true,
          status: true,
          wordCount: true,
          readingTime: true,
          publishedAt: true,
          updatedAt: true,
          createdAt: true,
        },
      });

      if (!post) {
        return NextResponse.json(
          { success: false, error: "Post not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          id: String(post.postNumber ?? post.id),
          editId: post.postNumber ?? post.id,
          title: post.title,
          slug: post.slug,
          status: post.status,
          wordCount: post.wordCount ?? 0,
          readingTime: post.readingTime ?? 0,
          publishedAt: post.publishedAt?.toISOString() ?? null,
          updatedAt: post.updatedAt?.toISOString() ?? null,
        },
      });
    }

    if (type === "page") {
      const page = await prisma.page.findUnique({
        where: { slug },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          wordCount: true,
          readingTime: true,
          publishedAt: true,
          updatedAt: true,
          createdAt: true,
        },
      });

      if (!page) {
        return NextResponse.json(
          { success: false, error: "Page not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          id: page.id,
          editId: page.id,
          title: page.title,
          slug: page.slug,
          status: page.status,
          wordCount: page.wordCount ?? 0,
          readingTime: page.readingTime ?? 0,
          publishedAt: page.publishedAt?.toISOString() ?? null,
          updatedAt: page.updatedAt?.toISOString() ?? null,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid type — expected 'post' or 'page'" },
      { status: 400 },
    );
  } catch (error) {
    console.error("[admin-bar/meta] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
