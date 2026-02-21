import { NextRequest, NextResponse } from "next/server";
import { autocompleteService } from "@/server/wiring";
import {
  autocompleteSchema,
  tagCloudSchema,
} from "@/features/tags/server/schemas";
import type { AutocompleteQuery } from "@/features/tags/types";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("api/tags/autocomplete");

/**
 * Public GET handler for tag autocomplete / tag cloud.
 *
 * Query params:
 *   action=cloud  → tag cloud (weighted list)
 *   action=initial → popular/seed tags (no query required)
 *   (default)      → autocomplete search (requires ?q=)
 *
 * Examples:
 *   GET /api/tags/autocomplete?q=java&limit=10
 *   GET /api/tags/autocomplete?action=cloud&limit=50
 *   GET /api/tags/autocomplete?action=initial
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // ── Tag Cloud ──────────────────────────────────────────────────────
    if (action === "cloud") {
      const parsed = tagCloudSchema.safeParse({
        minWeight: searchParams.get("minWeight"),
        maxWeight: searchParams.get("maxWeight"),
        limit: searchParams.get("limit"),
        parentId: searchParams.get("parentId"),
      });

      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation failed",
            details: parsed.error.flatten().fieldErrors,
          },
          { status: 400 },
        );
      }

      const cloud = await autocompleteService.getTagCloud(parsed.data);
      return NextResponse.json({ success: true, data: cloud });
    }

    // ── Initial / Popular Tags ─────────────────────────────────────────
    if (action === "initial") {
      const limit = Math.min(
        100,
        Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
      );
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const result = await autocompleteService.getInitialSuggestions(
        limit,
        page,
      );
      return NextResponse.json({ success: true, ...result });
    }

    // ── Default: Autocomplete Search ───────────────────────────────────
    const parsed = autocompleteSchema.safeParse({
      q: searchParams.get("q") || "",
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      mode: searchParams.get("mode"),
      parentId: searchParams.get("parentId"),
      includeCount: searchParams.get("includeCount"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await autocompleteService.autocomplete(
      parsed.data as AutocompleteQuery,
    );
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error("[api/tags/autocomplete] GET error:", { error });
    return NextResponse.json(
      { success: false, error: "Autocomplete failed" },
      { status: 500 },
    );
  }
}
