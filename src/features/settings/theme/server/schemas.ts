/**
 * ============================================================================
 * SUB-MODULE: site-settings/theme/schemas.ts
 * PURPOSE:    Zod validation schemas for ThemeConfig operations.
 * ============================================================================
 */

import { z } from 'zod';
import { COLOR_MODES, THEME_PRESET_CATEGORIES } from '../types';

// ─── Shared Fragments ───────────────────────────────────────────────────────

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex colour');
const cssColor = z.string().min(1);

const colorShadesSchema = z.object({
  50: hexColor, 100: hexColor, 200: hexColor, 300: hexColor, 400: hexColor,
  500: hexColor, 600: hexColor, 700: hexColor, 800: hexColor, 900: hexColor,
  950: hexColor,
});

const colorPaletteSchema = z.object({
  primary: colorShadesSchema,
  secondary: colorShadesSchema,
  accent: colorShadesSchema,
  neutral: colorShadesSchema,
  success: colorShadesSchema,
  warning: colorShadesSchema,
  danger: colorShadesSchema,
  info: colorShadesSchema,
});

const semanticColorsSchema = z.object({
  background: cssColor,
  foreground: cssColor,
  card: cssColor,
  cardForeground: cssColor,
  popover: cssColor,
  popoverForeground: cssColor,
  muted: cssColor,
  mutedForeground: cssColor,
  border: cssColor,
  input: cssColor,
  ring: cssColor,
  selection: cssColor,
  overlay: cssColor,
});

const gradientStopSchema = z.object({
  color: cssColor,
  position: z.string(),
});

const gradientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['linear', 'radial', 'conic']),
  direction: z.string().min(1),
  stops: z.array(gradientStopSchema).min(2).max(10),
});

const fontEntrySchema = z.object({
  name: z.string().min(1),
  family: z.string().min(1),
  importUrl: z.string().url().optional(),
  weights: z.array(z.number()).optional(),
  category: z.enum(['sans-serif', 'serif', 'monospace', 'display', 'handwriting']).optional(),
});

const typographySizeSchema = z.object({
  fontSize: z.string().min(1),
  lineHeight: z.string().min(1),
  letterSpacing: z.string().optional(),
  fontWeight: z.number().optional(),
});

const typographyScaleSchema = z.object({
  xs: typographySizeSchema, sm: typographySizeSchema, base: typographySizeSchema,
  lg: typographySizeSchema, xl: typographySizeSchema,
  '2xl': typographySizeSchema, '3xl': typographySizeSchema, '4xl': typographySizeSchema,
  '5xl': typographySizeSchema, '6xl': typographySizeSchema,
});

const borderRadiusSchema = z.object({
  none: z.string(), sm: z.string(), md: z.string(), lg: z.string(),
  xl: z.string(), '2xl': z.string(), full: z.string(),
});

const shadowSchema = z.object({
  none: z.string(), sm: z.string(), md: z.string(), lg: z.string(),
  xl: z.string(), '2xl': z.string(), inner: z.string(),
});

const motionSchema = z.object({
  durationFast: z.string(), durationBase: z.string(), durationSlow: z.string(),
  easeIn: z.string(), easeOut: z.string(), easeInOut: z.string(),
  respectReducedMotion: z.boolean(),
});

const zIndexSchema = z.object({
  hide: z.number(), base: z.number(), dropdown: z.number(), sticky: z.number(),
  fixed: z.number(), overlay: z.number(), modal: z.number(), popover: z.number(),
  toast: z.number(), tooltip: z.number(),
});

const containerSchema = z.object({
  sm: z.string(), md: z.string(), lg: z.string(), xl: z.string(), '2xl': z.string(),
});

// ─── Full Schema ────────────────────────────────────────────────────────────

export const themeConfigSchema = z.object({
  activePresetId: z.string().min(1),
  colorMode: z.enum(COLOR_MODES),
  customOverrides: z.boolean(),
  palette: colorPaletteSchema,
  semanticLight: semanticColorsSchema,
  semanticDark: semanticColorsSchema,
  gradients: z.array(gradientSchema).max(20),
  bodyFont: fontEntrySchema,
  headingFont: fontEntrySchema,
  monoFont: fontEntrySchema,
  typographyScale: typographyScaleSchema,
  spacing: z.record(z.string(), z.string()),
  borderRadius: borderRadiusSchema,
  shadows: shadowSchema,
  motion: motionSchema,
  zIndex: zIndexSchema,
  containerWidths: containerSchema,
  cssVariablePrefix: z.string().min(1).max(20),
  autoColorScheme: z.boolean(),
});

export type ThemeConfigInput = z.infer<typeof themeConfigSchema>;

// ─── Partial Update Schemas ─────────────────────────────────────────────────

export const updatePaletteSchema = z.object({
  palette: colorPaletteSchema.partial(),
}).strict();

export const updateSemanticLightSchema = z.object({
  semanticLight: semanticColorsSchema.partial(),
}).strict();

export const updateSemanticDarkSchema = z.object({
  semanticDark: semanticColorsSchema.partial(),
}).strict();

export const updateFontsSchema = z.object({
  bodyFont: fontEntrySchema.optional(),
  headingFont: fontEntrySchema.optional(),
  monoFont: fontEntrySchema.optional(),
}).strict();

export const updateGradientsSchema = z.object({
  gradients: z.array(gradientSchema).max(20),
}).strict();

export const updateColorModeSchema = z.object({
  colorMode: z.enum(COLOR_MODES),
  autoColorScheme: z.boolean().optional(),
}).strict();

export const loadThemePresetSchema = z.object({
  presetId: z.string().min(1),
}).strict();

export const updateBorderRadiusSchema = z.object({
  borderRadius: borderRadiusSchema.partial(),
}).strict();

export const updateShadowsSchema = z.object({
  shadows: shadowSchema.partial(),
}).strict();

export const updateMotionSchema = z.object({
  motion: motionSchema.partial(),
}).strict();

/** Generate shades from a single hex colour. */
export const generateShadesSchema = z.object({
  baseColor: hexColor,
  paletteKey: z.enum(['primary', 'secondary', 'accent', 'neutral', 'success', 'warning', 'danger', 'info']),
}).strict();

export type UpdatePaletteInput = z.infer<typeof updatePaletteSchema>;
export type UpdateFontsInput = z.infer<typeof updateFontsSchema>;
export type GenerateShadesInput = z.infer<typeof generateShadesSchema>;
