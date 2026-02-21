// media-manager/image-processor.ts
// ─────────────────────────────────────────────────────────────────────────────
// Reference `ImageProcessor` implementation backed by **sharp**.
// sharp is a peer dependency — it is dynamically imported at runtime so
// the file compiles even without it installed.
//
// Consumers may replace this with Cloudinary, imgproxy, or any other
// implementation that satisfies the `ImageProcessor` interface.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ImageProcessor,
  ImageMetadata,
  ImageFormat,
  HashAlgorithm,
  MediaVariantMapWithWebP,
  VariantPresetConfig,
  MediaVariant,
} from "../types";

/* ====================================================================== *
 *  Minimal sharp type stubs (compile without installing sharp)           *
 * ====================================================================== */

interface SharpInstance {
  metadata(): Promise<{
    width?: number;
    height?: number;
    format?: string;
    size?: number;
    hasAlpha?: boolean;
    pages?: number;
    channels?: number;
    density?: number;
    space?: string;
  }>;
  resize(
    width: number,
    height: number,
    options?: Record<string, unknown>,
  ): SharpInstance;
  toFormat(format: string, options?: Record<string, unknown>): SharpInstance;
  toBuffer(): Promise<Buffer>;
  clone(): SharpInstance;
  webp(options?: Record<string, unknown>): SharpInstance;
  avif(options?: Record<string, unknown>): SharpInstance;
  jpeg(options?: Record<string, unknown>): SharpInstance;
  png(options?: Record<string, unknown>): SharpInstance;
}

type SharpFactory = (input: Buffer | Uint8Array) => SharpInstance;

/* ====================================================================== *
 *  Sharp-based image processor                                           *
 * ====================================================================== */

/**
 * Reference `ImageProcessor` implementation using sharp.
 *
 * ```ts
 * const processor = new SharpImageProcessor();
 * const meta = await processor.getMetadata(imageBuffer);
 * const { variants, buffers } = await processor.generateVariants(
 *   imageBuffer,
 *   VARIANT_PRESETS_CONFIG,
 *   { webp: true },
 * );
 * ```
 *
 * **Peer dependency:** `sharp` must be installed by the consuming project.
 */
export class SharpImageProcessor implements ImageProcessor {
  /** Lazily‑loaded sharp factory. */
  private _sharp: SharpFactory | null = null;

  /* ------------------------------------------------------------------ *
   *  getMetadata                                                        *
   * ------------------------------------------------------------------ */

  async getMetadata(buffer: Buffer | Uint8Array): Promise<ImageMetadata> {
    const sharp = await this.loadSharp();
    const img = sharp(Buffer.from(buffer));
    const meta = await img.metadata();

    return {
      width: meta.width ?? 0,
      height: meta.height ?? 0,
      format: meta.format ?? "unknown",
      size: buffer.byteLength,
      hasAlpha: meta.hasAlpha ?? false,
      isAnimated: (meta.pages ?? 1) > 1,
      channels: meta.channels,
      density: meta.density,
      space: meta.space,
    };
  }

  /* ------------------------------------------------------------------ *
   *  generateVariants                                                   *
   * ------------------------------------------------------------------ */

  async generateVariants(
    buffer: Buffer | Uint8Array,
    presets: Record<string, VariantPresetConfig>,
    options: { webp?: boolean; avif?: boolean } = {},
  ): Promise<{
    variants: MediaVariantMapWithWebP;
    buffers: Map<string, Buffer>;
  }> {
    const sharp = await this.loadSharp();
    const src = sharp(Buffer.from(buffer));
    const srcMeta = await src.metadata();
    const srcW = srcMeta.width ?? 0;
    const srcH = srcMeta.height ?? 0;

    const variants: MediaVariantMapWithWebP = {};
    const buffers = new Map<string, Buffer>();

    for (const [name, preset] of Object.entries(presets)) {
      // Skip if source is smaller than target
      const targetW = Math.min(preset.width, srcW || preset.width);
      const targetH = Math.min(preset.height, srcH || preset.height);

      const fit = this.mapFit(preset.fit ?? "inside");

      // --- original format variant ---
      const resized = src.clone().resize(targetW, targetH, {
        fit,
        withoutEnlargement: true,
      });

      const origBuf = await resized.clone().toBuffer();
      const origKey = name;

      const variant: MediaVariant = {
        url: "", // URL is set by the service after storage upload
        width: targetW,
        height: targetH,
        format: srcMeta.format ?? "jpeg",
        size: origBuf.byteLength,
      };

      variants[origKey as keyof MediaVariantMapWithWebP] = variant;
      buffers.set(origKey, origBuf);

      // --- WebP companion ---
      if (options.webp !== false) {
        const webpBuf = await resized
          .clone()
          .webp({ quality: preset.quality })
          .toBuffer();
        const webpKey = `${name}_webp`;

        variants[webpKey as keyof MediaVariantMapWithWebP] = {
          url: "",
          width: targetW,
          height: targetH,
          format: "webp",
          size: webpBuf.byteLength,
        };
        buffers.set(webpKey, webpBuf);
      }

      // --- AVIF companion ---
      if (options.avif) {
        const avifBuf = await resized
          .clone()
          .avif({ quality: preset.quality })
          .toBuffer();
        const avifKey = `${name}_avif`;

        // Store in buffers map (not in standard variant map type, but
        // consumers can read from the buffers map directly)
        buffers.set(avifKey, avifBuf);
      }
    }

    return { variants, buffers };
  }

  /* ------------------------------------------------------------------ *
   *  convertFormat                                                      *
   * ------------------------------------------------------------------ */

  async convertFormat(
    buffer: Buffer | Uint8Array,
    format: ImageFormat,
    quality = 80,
  ): Promise<Buffer> {
    const sharp = await this.loadSharp();
    const img = sharp(Buffer.from(buffer));

    switch (format) {
      case "webp":
        return img.webp({ quality }).toBuffer();
      case "avif":
        return img.avif({ quality }).toBuffer();
      case "jpeg":
        return img.jpeg({ quality, mozjpeg: true }).toBuffer();
      case "png":
        return img.png({ quality, compressionLevel: 9 }).toBuffer();
      default:
        return img.toFormat(format, { quality }).toBuffer();
    }
  }

  /* ------------------------------------------------------------------ *
   *  computeHash                                                        *
   * ------------------------------------------------------------------ */

  async computeHash(
    buffer: Buffer | Uint8Array,
    algorithm: HashAlgorithm = "sha256",
  ): Promise<string> {
    // Node.js crypto is always available in server‑side contexts
    const { createHash } = await import("crypto");
    return createHash(algorithm).update(Buffer.from(buffer)).digest("hex");
  }

  /* ------------------------------------------------------------------ *
   *  generateSrcSet                                                     *
   * ------------------------------------------------------------------ */

  generateSrcSet(variants: MediaVariantMapWithWebP): string {
    const entries: string[] = [];

    // Prefer WebP variants for srcset
    const presetNames = ["small", "medium", "large", "full"] as const;
    for (const name of presetNames) {
      const webpKey = `${name}_webp` as keyof MediaVariantMapWithWebP;
      const origKey = name as keyof MediaVariantMapWithWebP;

      const variant = variants[webpKey] ?? variants[origKey];
      if (variant?.url && variant.width > 0) {
        entries.push(`${variant.url} ${variant.width}w`);
      }
    }

    return entries.join(", ");
  }

  /* ------------------------------------------------------------------ *
   *  Internal helpers                                                   *
   * ------------------------------------------------------------------ */

  private async loadSharp(): Promise<SharpFactory> {
    if (this._sharp) return this._sharp;
    try {
      // Dynamic import — sharp may not be installed
      const mod = await import("sharp");
      this._sharp = (mod.default ?? mod) as SharpFactory;
      return this._sharp;
    } catch {
      throw new Error(
        "sharp is required for image processing. Install it with: npm install sharp",
      );
    }
  }

  private mapFit(fit: string): string {
    const MAP: Record<string, string> = {
      cover: "cover",
      contain: "contain",
      fill: "fill",
      inside: "inside",
      outside: "outside",
    };
    return MAP[fit] ?? "inside";
  }
}
