/**
 * ============================================================================
 * SUB-MODULE: site-settings/theme/theme.service.ts
 * PURPOSE:    Backend service for managing the site-wide theme.
 *             CRUD for colours, fonts, gradients, design tokens.
 *             CSS custom-property generation for runtime injection.
 * ============================================================================
 */

import type {
  ThemeConfig,
  ColorPalette,
  SemanticColors,
  GradientDefinition,
  FontEntry,
  ThemePrismaClient,
  ColorMode,
} from '../types';
import type { ApiResponse } from '../types';
import {
  DEFAULT_THEME_CONFIG,
  generateShades,
  getThemePresetById,
  THEME_PRESETS,
} from './constants';

// ─── Service ────────────────────────────────────────────────────────────────

export class ThemeService {
  private cached: ThemeConfig | null = null;

  constructor(private readonly prisma: ThemePrismaClient) {}

  // ─── Read ─────────────────────────────────────────────────────────────

  /** Get the current theme config (cached). */
  async getTheme(): Promise<ThemeConfig> {
    if (this.cached) return this.cached;
    const row = await this.prisma.siteSettings.findFirst();
    const raw = row?.themeConfig ?? DEFAULT_THEME_CONFIG;
    this.cached = { ...DEFAULT_THEME_CONFIG, ...raw } as ThemeConfig;
    return this.cached;
  }

  /** Get theme wrapped in ApiResponse. */
  async getThemeResponse(): Promise<ApiResponse<ThemeConfig>> {
    try {
      const theme = await this.getTheme();
      return this.ok(theme);
    } catch (e) {
      return this.err(e);
    }
  }

  // ─── Colour Operations ────────────────────────────────────────────────

  /** Update the full palette or specific palette keys. */
  async updatePalette(
    updates: Partial<ColorPalette>,
    _updatedBy?: string,
  ): Promise<ApiResponse<ThemeConfig>> {
    try {
      const theme = await this.getTheme();
      theme.palette = { ...theme.palette, ...updates };
      theme.customOverrides = true;
      await this.save(theme);
      return this.ok(theme);
    } catch (e) {
      return this.err(e);
    }
  }

  /** Generate a full shade scale from a base hex and apply it to a palette key. */
  async generateAndApplyShades(
    paletteKey: keyof ColorPalette,
    baseHex: string,
  ): Promise<ApiResponse<ThemeConfig>> {
    try {
      const theme = await this.getTheme();
      theme.palette[paletteKey] = generateShades(baseHex);
      theme.customOverrides = true;
      await this.save(theme);
      return this.ok(theme);
    } catch (e) {
      return this.err(e);
    }
  }

  /** Update semantic colours for a specific mode. */
  async updateSemanticColors(
    mode: 'light' | 'dark',
    updates: Partial<SemanticColors>,
  ): Promise<ApiResponse<ThemeConfig>> {
    try {
      const theme = await this.getTheme();
      if (mode === 'light') {
        theme.semanticLight = { ...theme.semanticLight, ...updates };
      } else {
        theme.semanticDark = { ...theme.semanticDark, ...updates };
      }
      theme.customOverrides = true;
      await this.save(theme);
      return this.ok(theme);
    } catch (e) {
      return this.err(e);
    }
  }

  /** Set the active colour mode. */
  async setColorMode(mode: ColorMode): Promise<ApiResponse<ThemeConfig>> {
    try {
      const theme = await this.getTheme();
      theme.colorMode = mode;
      await this.save(theme);
      return this.ok(theme);
    } catch (e) {
      return this.err(e);
    }
  }

  // ─── Gradient Operations ──────────────────────────────────────────────

  /** Add a gradient to the theme. */
  async addGradient(gradient: GradientDefinition): Promise<ApiResponse<ThemeConfig>> {
    try {
      const theme = await this.getTheme();
      if (theme.gradients.length >= 20) {
        return this.error('MAX_GRADIENTS', 'Maximum 20 gradients allowed', 400);
      }
      theme.gradients.push(gradient);
      await this.save(theme);
      return this.ok(theme);
    } catch (e) {
      return this.err(e);
    }
  }

  /** Remove a gradient by ID. */
  async removeGradient(gradientId: string): Promise<ApiResponse<ThemeConfig>> {
    try {
      const theme = await this.getTheme();
      theme.gradients = theme.gradients.filter((g) => g.id !== gradientId);
      await this.save(theme);
      return this.ok(theme);
    } catch (e) {
      return this.err(e);
    }
  }

  /** Replace all gradients. */
  async setGradients(gradients: GradientDefinition[]): Promise<ApiResponse<ThemeConfig>> {
    try {
      const theme = await this.getTheme();
      theme.gradients = gradients.slice(0, 20);
      await this.save(theme);
      return this.ok(theme);
    } catch (e) {
      return this.err(e);
    }
  }

  // ─── Font Operations ──────────────────────────────────────────────────

  /** Update fonts (body, heading, mono). */
  async updateFonts(
    updates: { bodyFont?: FontEntry; headingFont?: FontEntry; monoFont?: FontEntry },
  ): Promise<ApiResponse<ThemeConfig>> {
    try {
      const theme = await this.getTheme();
      if (updates.bodyFont) theme.bodyFont = updates.bodyFont;
      if (updates.headingFont) theme.headingFont = updates.headingFont;
      if (updates.monoFont) theme.monoFont = updates.monoFont;
      theme.customOverrides = true;
      await this.save(theme);
      return this.ok(theme);
    } catch (e) {
      return this.err(e);
    }
  }

  // ─── Design Token Operations ──────────────────────────────────────────

  /** Update border radius scale. */
  async updateBorderRadius(
    updates: Record<string, string>,
  ): Promise<ApiResponse<ThemeConfig>> {
    try {
      const theme = await this.getTheme();
      theme.borderRadius = { ...theme.borderRadius, ...updates } as typeof theme.borderRadius;
      await this.save(theme);
      return this.ok(theme);
    } catch (e) {
      return this.err(e);
    }
  }

  /** Update shadow scale. */
  async updateShadows(
    updates: Record<string, string>,
  ): Promise<ApiResponse<ThemeConfig>> {
    try {
      const theme = await this.getTheme();
      theme.shadows = { ...theme.shadows, ...updates } as typeof theme.shadows;
      await this.save(theme);
      return this.ok(theme);
    } catch (e) {
      return this.err(e);
    }
  }

  /** Update motion config. */
  async updateMotion(
    updates: Partial<typeof DEFAULT_THEME_CONFIG.motion>,
  ): Promise<ApiResponse<ThemeConfig>> {
    try {
      const theme = await this.getTheme();
      theme.motion = { ...theme.motion, ...updates };
      await this.save(theme);
      return this.ok(theme);
    } catch (e) {
      return this.err(e);
    }
  }

  // ─── Presets ──────────────────────────────────────────────────────────

  /** Load a theme preset, replacing current config. */
  async loadPreset(presetId: string): Promise<ApiResponse<ThemeConfig>> {
    try {
      const preset = getThemePresetById(presetId);
      if (!preset) return this.error('PRESET_NOT_FOUND', `Theme preset "${presetId}" not found`, 404);

      const theme: ThemeConfig = {
        ...preset.config,
        activePresetId: presetId,
        customOverrides: false,
      };
      await this.save(theme);
      return this.ok(theme);
    } catch (e) {
      return this.err(e);
    }
  }

  /** List available presets. */
  listPresets() {
    return THEME_PRESETS.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      tags: p.tags,
    }));
  }

  /** Reset to default theme. */
  async resetToDefaults(): Promise<ApiResponse<ThemeConfig>> {
    try {
      const theme = { ...DEFAULT_THEME_CONFIG };
      await this.save(theme);
      return this.ok(theme);
    } catch (e) {
      return this.err(e);
    }
  }

  // ─── CSS Variable Generation ──────────────────────────────────────────

  /**
   * Generate CSS custom properties for the current theme.
   * Can be injected in `<style>` tags or used with `next/font`.
   */
  async generateCssVariables(): Promise<ApiResponse<string>> {
    try {
      const theme = await this.getTheme();
      const prefix = theme.cssVariablePrefix || '--site';
      const lines: string[] = [];

      // Palette
      for (const [name, shades] of Object.entries(theme.palette)) {
        for (const [shade, value] of Object.entries(shades)) {
          lines.push(`  ${prefix}-color-${name}-${shade}: ${value};`);
        }
      }

      // Semantic (light)
      for (const [key, value] of Object.entries(theme.semanticLight)) {
        lines.push(`  ${prefix}-${camelToKebab(key)}: ${value};`);
      }

      // Typography
      lines.push(`  ${prefix}-font-body: ${theme.bodyFont.family};`);
      lines.push(`  ${prefix}-font-heading: ${theme.headingFont.family};`);
      lines.push(`  ${prefix}-font-mono: ${theme.monoFont.family};`);

      for (const [size, entry] of Object.entries(theme.typographyScale)) {
        lines.push(`  ${prefix}-text-${size}: ${entry.fontSize};`);
        lines.push(`  ${prefix}-leading-${size}: ${entry.lineHeight};`);
      }

      // Border radius
      for (const [key, value] of Object.entries(theme.borderRadius)) {
        lines.push(`  ${prefix}-radius-${key}: ${value};`);
      }

      // Shadows
      for (const [key, value] of Object.entries(theme.shadows)) {
        lines.push(`  ${prefix}-shadow-${key}: ${value};`);
      }

      // Motion
      lines.push(`  ${prefix}-duration-fast: ${theme.motion.durationFast};`);
      lines.push(`  ${prefix}-duration-base: ${theme.motion.durationBase};`);
      lines.push(`  ${prefix}-duration-slow: ${theme.motion.durationSlow};`);
      lines.push(`  ${prefix}-ease-in: ${theme.motion.easeIn};`);
      lines.push(`  ${prefix}-ease-out: ${theme.motion.easeOut};`);
      lines.push(`  ${prefix}-ease-in-out: ${theme.motion.easeInOut};`);

      // Container
      for (const [key, value] of Object.entries(theme.containerWidths)) {
        lines.push(`  ${prefix}-container-${key}: ${value};`);
      }

      // Gradients
      for (const grad of theme.gradients) {
        const stops = grad.stops.map((s) => `${s.color} ${s.position}`).join(', ');
        const fn = grad.type === 'linear' ? 'linear-gradient' : grad.type === 'radial' ? 'radial-gradient' : 'conic-gradient';
        lines.push(`  ${prefix}-gradient-${grad.id}: ${fn}(${grad.direction}, ${stops});`);
      }

      // Z-Index
      for (const [key, value] of Object.entries(theme.zIndex)) {
        lines.push(`  ${prefix}-z-${key}: ${value};`);
      }

      const lightCss = `:root {\n${lines.join('\n')}\n}`;

      // Dark mode overrides
      const darkLines: string[] = [];
      for (const [key, value] of Object.entries(theme.semanticDark)) {
        darkLines.push(`  ${prefix}-${camelToKebab(key)}: ${value};`);
      }
      const darkCss = theme.autoColorScheme
        ? `@media (prefers-color-scheme: dark) {\n  :root {\n  ${darkLines.join('\n  ')}\n  }\n}`
        : `[data-theme="dark"] {\n${darkLines.join('\n')}\n}`;

      // Font imports
      const imports: string[] = [];
      if (theme.bodyFont.importUrl) imports.push(`@import url('${theme.bodyFont.importUrl}');`);
      if (theme.headingFont.importUrl && theme.headingFont.importUrl !== theme.bodyFont.importUrl) {
        imports.push(`@import url('${theme.headingFont.importUrl}');`);
      }
      if (theme.monoFont.importUrl) imports.push(`@import url('${theme.monoFont.importUrl}');`);

      // Reduced motion
      const motionCss = theme.motion.respectReducedMotion
        ? `@media (prefers-reduced-motion: reduce) {\n  *, *::before, *::after {\n    animation-duration: 0.01ms !important;\n    animation-iteration-count: 1 !important;\n    transition-duration: 0.01ms !important;\n    scroll-behavior: auto !important;\n  }\n}`
        : '';

      const fullCss = [
        imports.join('\n'),
        lightCss,
        darkCss,
        motionCss,
      ].filter(Boolean).join('\n\n');

      return this.ok(fullCss);
    } catch (e) {
      return this.err(e);
    }
  }

  // ─── Cache ────────────────────────────────────────────────────────────

  invalidateCache(): void {
    this.cached = null;
  }

  // ─── Private ──────────────────────────────────────────────────────────

  private async save(theme: ThemeConfig): Promise<void> {
    const row = await this.prisma.siteSettings.findFirst();
    if (!row) throw new Error('SiteSettings row not found — run seed first');
    await this.prisma.siteSettings.update({
      where: { id: row.id },
      data: { themeConfig: JSON.parse(JSON.stringify(theme)) },
    });
    this.cached = theme;
  }

  private ok<T>(data: T): ApiResponse<T> {
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  private error<T>(code: string, message: string, statusCode: number): ApiResponse<T> {
    return {
      success: false,
      error: { code, message, statusCode },
      timestamp: new Date().toISOString(),
    };
  }

  private err<T>(e: unknown): ApiResponse<T> {
    return this.error(
      'THEME_SERVICE_ERROR',
      e instanceof Error ? e.message : 'Unknown error in theme service',
      500,
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}
