/**
 * Dynamic OG Image Generator
 *
 * Generates enterprise-grade social share images on-the-fly using
 * Next.js ImageResponse (Satori + resvg-wasm). Designed as a fallback
 * when a blog post has no featured image.
 *
 * Usage:  /api/og?title=My+Post&author=John&category=Tech&siteName=MyBlog
 *
 * Supported query params:
 *   title      – Post title (required)
 *   author     – Author name
 *   category   – Primary category badge
 *   siteName   – Site brand name
 *   date       – Published date string
 *   readTime   – Reading time in minutes
 */
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const title = searchParams.get("title") || "Untitled Post";
  const author = searchParams.get("author") || "";
  const category = searchParams.get("category") || "";
  const siteName = searchParams.get("siteName") || "MyBlog";
  const date = searchParams.get("date") || "";
  const readTime = searchParams.get("readTime") || "";

  // Truncate title for consistent layout
  const displayTitle = title.length > 90 ? title.slice(0, 87) + "…" : title;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          fontFamily: "system-ui, -apple-system, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Background gradient with mesh pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)",
            display: "flex",
          }}
        />

        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-80px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            left: "-100px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Accent line at top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "5px",
            background: "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 64px",
            flex: 1,
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Top row: site name + category badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Site brand */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "22px",
                  fontWeight: 700,
                }}
              >
                {siteName.charAt(0).toUpperCase()}
              </div>
              <span
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "white",
                  letterSpacing: "-0.01em",
                }}
              >
                {siteName}
              </span>
            </div>

            {/* Category badge */}
            {category && (
              <div
                style={{
                  background: "rgba(59,130,246,0.15)",
                  border: "1px solid rgba(59,130,246,0.3)",
                  borderRadius: "9999px",
                  padding: "6px 20px",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#93c5fd",
                  display: "flex",
                }}
              >
                {category}
              </div>
            )}
          </div>

          {/* Title */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0px",
              flex: 1,
              justifyContent: "center",
              paddingTop: "16px",
              paddingBottom: "16px",
            }}
          >
            <h1
              style={{
                fontSize: displayTitle.length > 60 ? "42px" : "52px",
                fontWeight: 800,
                color: "white",
                lineHeight: 1.2,
                letterSpacing: "-0.025em",
                margin: 0,
                display: "flex",
                flexWrap: "wrap",
              }}
            >
              {displayTitle}
            </h1>
          </div>

          {/* Bottom row: author + date + read time */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
            }}
          >
            {author && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* Author avatar circle */}
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: 700,
                  }}
                >
                  {author.charAt(0).toUpperCase()}
                </div>
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#e2e8f0",
                  }}
                >
                  {author}
                </span>
              </div>
            )}

            {/* Divider */}
            {author && (date || readTime) && (
              <div
                style={{
                  width: "1px",
                  height: "20px",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                }}
              />
            )}

            {date && (
              <span style={{ fontSize: "16px", color: "#94a3b8", display: "flex" }}>
                {date}
              </span>
            )}

            {readTime && (
              <span style={{ fontSize: "16px", color: "#94a3b8", display: "flex" }}>
                {readTime} min read
              </span>
            )}
          </div>
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)",
            display: "flex",
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
