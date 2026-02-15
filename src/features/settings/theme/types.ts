/**
 * ============================================================================
 * SUB-MODULE: site-settings/theme/types.ts
 * PURPOSE:    Extended design-token system for theming.
 *
 *             Enriches the parent AppearanceConfig with:
 *               - Full colour palettes (50-950 shades per colour)
 *               - Gradient definitions
 *               - Shadow system (sm → 2xl + inner + none)
 *               - Spacing scale (0 → 96)
 *               - Border-radius tokens
 *               - Typography scale with fluid sizes
 *               - Surface / semantic colour mappings
 *               - Theme presets (light, dark, high-contrast, etc.)
 *               - CSS custom-property generation config
 *
 *             No framework imports — works standalone.
 * ============================================================================
 */

// ─── Colour System ──────────────────────────────────────────────────────────

/**
 * Full shade scale for a single colour.
 * Keys mirror Tailwind: 50, 100, 200, …, 900, 950.
 */
export interface ColorShades {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;  // "base" shade
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

/** Named colour palette (primary, secondary, accent, etc.). */
export interface ColorPalette {
  primary: ColorShades;
  secondary: ColorShades;
  accent: ColorShades;
  neutral: ColorShades;
  success: ColorShades;
  warning: ColorShades;
  danger: ColorShades;
  info: ColorShades;
}

/** A single gradient definition. */
export interface GradientDefinition {
  id: string;
  name: string;
  type: 'linear' | 'radial' | 'conic';
  /** CSS gradient angle / position, e.g. '135deg', 'circle at center'. */
  direction: string;
  stops: Array<{ color: string; position: string }>;
}

/** Semantic colour mappings for UI surfaces. */
export interface SemanticColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  ring: string;
  selection: string;
  /** Overlay colour for modals, drawers, etc. */
  overlay: string;
}

// ─── Shadow System ──────────────────────────────────────────────────────────

export interface ShadowScale {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  inner: string;
}

// ─── Border Radius ──────────────────────────────────────────────────────────

export interface BorderRadiusScale {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  full: string;
}

// ─── Spacing ────────────────────────────────────────────────────────────────

/** Spacing scale key → px/rem value. Only the most-used breakpoints. */
export interface SpacingScale {
  0: string;
  0.5: string;
  1: string;
  1.5: string;
  2: string;
  2.5: string;
  3: string;
  3.5: string;
  4: string;
  5: string;
  6: string;
  7: string;
  8: string;
  9: string;
  10: string;
  12: string;
  14: string;
  16: string;
  20: string;
  24: string;
  28: string;
  32: string;
  36: string;
  40: string;
  44: string;
  48: string;
  52: string;
  56: string;
  60: string;
  64: string;
  72: string;
  80: string;
  96: string;
}

// ─── Typography ─────────────────────────────────────────────────────────────

/** A single font entry (from Google Fonts, system, or custom). */
export interface FontEntry {
  name: string;
  /** CSS font-family string including fallbacks. */
  family: string;
  /** Google Fonts URL or null for system / custom fonts. */
  importUrl?: string;
  weights?: number[];
  category?: 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting';
}

/** Typography scale (maps semantic names to sizes + line heights). */
export interface TypographyScale {
  xs: TypographySizeEntry;
  sm: TypographySizeEntry;
  base: TypographySizeEntry;
  lg: TypographySizeEntry;
  xl: TypographySizeEntry;
  '2xl': TypographySizeEntry;
  '3xl': TypographySizeEntry;
  '4xl': TypographySizeEntry;
  '5xl': TypographySizeEntry;
  '6xl': TypographySizeEntry;
}

export interface TypographySizeEntry {
  fontSize: string;
  lineHeight: string;
  letterSpacing?: string;
  fontWeight?: number;
}

// ─── Motion / Transitions ───────────────────────────────────────────────────

export interface MotionConfig {
  /** Duration scale. */
  durationFast: string;
  durationBase: string;
  durationSlow: string;
  /** Easing functions. */
  easeIn: string;
  easeOut: string;
  easeInOut: string;
  /** Whether to respect prefers-reduced-motion. */
  respectReducedMotion: boolean;
}

// ─── Z-Index Scale ──────────────────────────────────────────────────────────

export interface ZIndexScale {
  hide: number;
  base: number;
  dropdown: number;
  sticky: number;
  fixed: number;
  overlay: number;
  modal: number;
  popover: number;
  toast: number;
  tooltip: number;
}

// ─── Theme Config (top-level) ───────────────────────────────────────────────

/** Complete theme configuration stored in site settings. */
export interface ThemeConfig {
  /** Active theme preset ID, or 'custom'. */
  activePresetId: string;
  /** Display mode: 'light' | 'dark' | 'system'. */
  colorMode: ColorMode;
  /** Whether admin has overridden preset colours. */
  customOverrides: boolean;

  // ── Colours ────────────────────────────────────────────────────
  palette: ColorPalette;
  semanticLight: SemanticColors;
  semanticDark: SemanticColors;
  gradients: GradientDefinition[];

  // ── Typography ─────────────────────────────────────────────────
  bodyFont: FontEntry;
  headingFont: FontEntry;
  monoFont: FontEntry;
  typographyScale: TypographyScale;

  // ── Spacing / Layout ───────────────────────────────────────────
  spacing: SpacingScale;
  borderRadius: BorderRadiusScale;
  shadows: ShadowScale;

  // ── Motion ─────────────────────────────────────────────────────
  motion: MotionConfig;

  // ── Z-Index ────────────────────────────────────────────────────
  zIndex: ZIndexScale;

  // ── Container widths ───────────────────────────────────────────
  containerWidths: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };

  // ── Misc ───────────────────────────────────────────────────────
  /** CSS custom-property prefix (default: '--site'). */
  cssVariablePrefix: string;
  /** Enable @media prefers-color-scheme auto-switching. */
  autoColorScheme: boolean;
}

export const COLOR_MODES = ['light', 'dark', 'system'] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

// ─── Theme Preset ───────────────────────────────────────────────────────────

/** A factory-defined theme configuration. */
export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  category: ThemePresetCategory;
  thumbnail?: string;
  tags?: string[];
  config: Omit<ThemeConfig, 'activePresetId' | 'customOverrides'>;
}

export const THEME_PRESET_CATEGORIES = [
  'light', 'dark', 'high-contrast', 'colorful', 'pastel',
  'professional', 'playful', 'editorial', 'minimal',
] as const;
export type ThemePresetCategory = (typeof THEME_PRESET_CATEGORIES)[number];

// ─── Prisma Interface ───────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ThemePrismaClient {
  siteSettings: {
    findFirst(args?: any): Promise<any>;
    update(args: any): Promise<any>;
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── API Response Envelope ──────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string | string[];
    statusCode: number;
  };
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
