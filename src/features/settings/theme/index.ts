/**
 * ============================================================================
 * SUB-MODULE: site-settings/theme/index.ts
 * PURPOSE:    Barrel exports for the Theme sub-module.
 * ============================================================================
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type {
  ColorShades,
  ColorPalette,
  GradientDefinition,
  SemanticColors,
  ShadowScale,
  BorderRadiusScale,
  SpacingScale,
  FontEntry,
  TypographyScale,
  TypographySizeEntry,
  MotionConfig,
  ZIndexScale,
  ThemeConfig,
  ColorMode,
  ThemePreset,
  ThemePresetCategory,
  ThemePrismaClient,
} from './types';

export { COLOR_MODES, THEME_PRESET_CATEGORIES } from './types';

// ─── Constants & Presets ────────────────────────────────────────────────────

export {
  generateShades,
  DEFAULT_PALETTE,
  DEFAULT_SEMANTIC_LIGHT,
  DEFAULT_SEMANTIC_DARK,
  DEFAULT_GRADIENTS,
  DEFAULT_BODY_FONT,
  DEFAULT_HEADING_FONT,
  DEFAULT_MONO_FONT,
  DEFAULT_TYPOGRAPHY_SCALE,
  DEFAULT_SPACING,
  DEFAULT_BORDER_RADIUS,
  DEFAULT_SHADOWS,
  DEFAULT_MOTION,
  DEFAULT_ZINDEX,
  DEFAULT_CONTAINER_WIDTHS,
  DEFAULT_THEME_CONFIG,
  THEME_PRESETS,
  getThemePresetById,
  getThemePresetsByCategory,
} from './server/constants';

// ─── Schemas ────────────────────────────────────────────────────────────────

export {
  themeConfigSchema,
  updatePaletteSchema,
  updateSemanticLightSchema,
  updateSemanticDarkSchema,
  updateFontsSchema,
  updateGradientsSchema,
  updateColorModeSchema,
  loadThemePresetSchema,
  updateBorderRadiusSchema,
  updateShadowsSchema,
  updateMotionSchema,
  generateShadesSchema,
} from './server/schemas';

export type {
  ThemeConfigInput,
  UpdatePaletteInput,
  UpdateFontsInput,
  GenerateShadesInput,
} from './server/schemas';

// ─── Service ────────────────────────────────────────────────────────────────

export { ThemeService } from './server/theme.service';
