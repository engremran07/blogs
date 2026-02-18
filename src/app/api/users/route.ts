import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { auth } from "@/server/auth";
import { hashPassword, validatePasswordStrength } from "@/features/auth/server/password.util";
import { DEFAULT_USER_CONFIG } from "@/features/auth/server/constants";
import { createLogger } from "@/server/observability/logger";
import { z } from "zod";
import { USER_ROLES } from "@/features/auth/types";

const logger = createLogger("api/users");

const ADMIN_ROLES = ["ADMINISTRATOR", "SUPER_ADMIN"];

// ─── Validation schemas ─────────────────────────────────────────────────────
const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(USER_ROLES).optional(),
  sortBy: z.enum(["createdAt", "username", "email", "role"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const updateUserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
  username: z.string().trim().min(3).max(50).optional(),
  email: z.string().email().toLowerCase().optional(),
  displayName: z.string().trim().max(100).nullable().optional(),
  firstName: z.string().trim().max(100).nullable().optional(),
  lastName: z.string().trim().max(100).nullable().optional(),
  nickname: z.string().trim().max(100).nullable().optional(),
  role: z.enum(USER_ROLES).optional(),
  isEmailVerified: z.boolean().optional(),
  password: z.string().min(1).optional(),
  bio: z.string().max(1000).nullable().optional(),
  website: z.string().url().or(z.literal("")).nullable().optional(),
  phoneNumber: z.string().max(30).nullable().optional(),
  facebook: z.string().max(255).nullable().optional(),
  twitter: z.string().max(255).nullable().optional(),
  instagram: z.string().max(255).nullable().optional(),
  linkedin: z.string().max(255).nullable().optional(),
  github: z.string().max(255).nullable().optional(),
});

// ─── Safe-field select clause (never leak password/tokens) ──────────────────
const SAFE_SELECT = {
  id: true,
  username: true,
  email: true,
  displayName: true,
  firstName: true,
  lastName: true,
  nickname: true,
  bio: true,
  company: true,
  jobTitle: true,
  website: true,
  phoneNumber: true,
  facebook: true,
  twitter: true,
  instagram: true,
  linkedin: true,
  github: true,
  role: true,
  isEmailVerified: true,
  createdAt: true,
  _count: { select: { posts: true, comments: true } },
} as const;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // Single user by ID — any authenticated user can fetch a profile
    // (the admin layout uses this for the profile dropdown)
    if (id) {
      // Non-admin users can only fetch their own profile
      const callerRole = (session.user as { role?: string })?.role;
      const callerId = (session.user as { id?: string })?.id;
      if (!ADMIN_ROLES.includes(callerRole || "") && id !== callerId) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: SAFE_SELECT,
      });
      if (!user) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: user });
    }

    // ── List users (admin-only, server-side pagination) ─────────────────
    const callerRole = (session.user as { role?: string })?.role;
    if (!ADMIN_ROLES.includes(callerRole || "")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const params = listUsersSchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") || undefined,
      role: searchParams.get("role") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
    });

    if (!params.success) {
      return NextResponse.json(
        { success: false, error: "Invalid query parameters", details: params.error.flatten() },
        { status: 400 }
      );
    }

    const { page, limit, search, role: roleFilter, sortBy, sortOrder } = params.data;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (roleFilter) where.role = roleFilter;
    if (search) {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        select: SAFE_SELECT,
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: users,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    logger.error("[api/users] GET error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // ── Validate input with Zod ──────────────────────────────────────────
    const body = await req.json();
    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { id, password, role, username, email, ...fields } = validation.data;
    const callerRole = session.user.role;
    const callerId = (session.user as { id?: string })?.id;

    // ── Role hierarchy protection ───────────────────────────────────────
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true, username: true, email: true } });
    if (!target) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Non-SUPER_ADMIN cannot modify SUPER_ADMIN users
    if (target.role === "SUPER_ADMIN" && callerRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Cannot modify a Super Admin user" },
        { status: 403 }
      );
    }

    // Build safe update data — only allow explicit whitelisted fields
    const data: Record<string, unknown> = {};
    if (fields.firstName !== undefined) data.firstName = fields.firstName;
    if (fields.lastName !== undefined) data.lastName = fields.lastName;
    if (fields.nickname !== undefined) data.nickname = fields.nickname;
    if (fields.displayName !== undefined) data.displayName = fields.displayName;
    if (fields.bio !== undefined) data.bio = fields.bio;
    if (fields.website !== undefined) data.website = fields.website;
    if (fields.phoneNumber !== undefined) data.phoneNumber = fields.phoneNumber;
    if (fields.facebook !== undefined) data.facebook = fields.facebook;
    if (fields.twitter !== undefined) data.twitter = fields.twitter;
    if (fields.instagram !== undefined) data.instagram = fields.instagram;
    if (fields.linkedin !== undefined) data.linkedin = fields.linkedin;
    if (fields.github !== undefined) data.github = fields.github;
    if (fields.isEmailVerified !== undefined) data.isEmailVerified = fields.isEmailVerified;

    // ── Username uniqueness check ───────────────────────────────────────
    if (username !== undefined && username !== target.username) {
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { success: false, error: "Username already taken" },
          { status: 409 }
        );
      }
      data.username = username;
    }

    // ── Email uniqueness check ──────────────────────────────────────────
    if (email !== undefined && email !== target.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { success: false, error: "Email already in use" },
          { status: 409 }
        );
      }
      data.email = email;
    }

    // ── Role change protection ──────────────────────────────────────────
    if (role !== undefined && role !== target.role) {
      // Only SUPER_ADMIN can assign SUPER_ADMIN role
      if (role === "SUPER_ADMIN" && callerRole !== "SUPER_ADMIN") {
        return NextResponse.json(
          { success: false, error: "Only Super Admins can assign Super Admin role" },
          { status: 403 }
        );
      }
      // Prevent changing your own role
      if (id === callerId) {
        return NextResponse.json(
          { success: false, error: "Cannot change your own role" },
          { status: 403 }
        );
      }
      data.role = role;
    }

    // ── Hash password if provided — validate strength first ─────────────
    if (password && password.trim().length > 0) {
      validatePasswordStrength(password, DEFAULT_USER_CONFIG);
      data.password = await hashPassword(password);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: SAFE_SELECT,
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error: unknown) {
    // Surface ValidationError messages from password validation
    if ((error as { name?: string })?.name === "ValidationError") {
      return NextResponse.json(
        { success: false, error: (error as Error).message },
        { status: 400 }
      );
    }
    logger.error("[api/users] PATCH error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
    }

    const callerId = (session.user as { id?: string })?.id;
    if (id === callerId) {
      return NextResponse.json({ success: false, error: "Cannot delete your own account from admin" }, { status: 403 });
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!target) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (target.role === "SUPER_ADMIN") {
      const count = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
      if (count <= 1) {
        return NextResponse.json(
          { success: false, error: "Cannot delete the last Super Admin" },
          { status: 403 }
        );
      }
      if (session.user.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { success: false, error: "Only Super Admins can delete Super Admin users" },
          { status: 403 }
        );
      }
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "User deleted" });
  } catch (error) {
    logger.error("[api/users] DELETE error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
