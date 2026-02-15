/**
 * ============================================================================
 * SUB-MODULE: site-settings/theme/constants.ts
 * PURPOSE:    Default theme, presets, shade generator, and design-token values.
 * ============================================================================
 */

import type {
  ColorShades,
  ColorPalette,
  SemanticColors,
  ShadowScale,
  BorderRadiusScale,
  SpacingScale,
  TypographyScale,
  MotionConfig,
  ZIndexScale,
  FontEntry,
  GradientDefinition,
  ThemeConfig,
  ThemePreset,
} from '../types';

// ─── Shade Generator ────────────────────────────────────────────────────────

/**
 * Generate a full shade scale from a single base hex colour (#rrggbb).
 * Uses simple HSL lightness interpolation — good enough for admin preview.
 * For pixel-perfect palettes, import a library like `chroma-js`.
 */
export function generateShades(baseHex: string): ColorShades {
  const { h, s, l } = hexToHSL(baseHex);
  return {
    50:  hslToHex(h, Math.min(s + 5, 100), Math.min(l + 44, 98)),
    100: hslToHex(h, Math.min(s + 5, 100), Math.min(l + 38, 96)),
    200: hslToHex(h, Math.min(s + 3, 100), Math.min(l + 28, 92)),
    300: hslToHex(h, s, Math.min(l + 18, 86)),
    400: hslToHex(h, Math.max(s - 3, 0), Math.min(l + 8, 76)),
    500: hslToHex(h, s, l),
    600: hslToHex(h, Math.min(s + 3, 100), Math.max(l - 8, 15)),
    700: hslToHex(h, Math.min(s + 5, 100), Math.max(l - 18, 12)),
    800: hslToHex(h, Math.min(s + 5, 100), Math.max(l - 28, 10)),
    900: hslToHex(h, Math.min(s + 3, 100), Math.max(l - 36, 8)),
    950: hslToHex(h, Math.min(s + 5, 100), Math.max(l - 44, 4)),
  };
}

// ─── Colour Helpers ─────────────────────────────────────────────────────────

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  const sl = s / 100;
  const ll = l / 100;
  const a = sl * Math.min(ll, 1 - ll);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const colour = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * colour).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// ─── Default Palette ────────────────────────────────────────────────────────

export const DEFAULT_PALETTE: ColorPalette = {
  primary:   generateShades('#3b82f6'),
  secondary: generateShades('#64748b'),
  accent:    generateShades('#f59e0b'),
  neutral:   generateShades('#6b7280'),
  success:   generateShades('#22c55e'),
  warning:   generateShades('#eab308'),
  danger:    generateShades('#ef4444'),
  info:      generateShades('#06b6d4'),
};

// ─── Default Semantic Colours ───────────────────────────────────────────────

export const DEFAULT_SEMANTIC_LIGHT: SemanticColors = {
  background: '#ffffff',
  foreground: '#0f172a',
  card: '#ffffff',
  cardForeground: '#0f172a',
  popover: '#ffffff',
  popoverForeground: '#0f172a',
  muted: '#f1f5f9',
  mutedForeground: '#64748b',
  border: '#e2e8f0',
  input: '#e2e8f0',
  ring: '#3b82f6',
  selection: '#bfdbfe',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const DEFAULT_SEMANTIC_DARK: SemanticColors = {
  background: '#0f172a',
  foreground: '#f8fafc',
  card: '#1e293b',
  cardForeground: '#f8fafc',
  popover: '#1e293b',
  popoverForeground: '#f8fafc',
  muted: '#1e293b',
  mutedForeground: '#94a3b8',
  border: '#334155',
  input: '#334155',
  ring: '#3b82f6',
  selection: '#1e3a5f',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

// ─── Default Gradients ──────────────────────────────────────────────────────

export const DEFAULT_GRADIENTS: GradientDefinition[] = [
  {
    id: 'brand-gradient',
    name: 'Brand Gradient',
    type: 'linear',
    direction: '135deg',
    stops: [
      { color: '#3b82f6', position: '0%' },
      { color: '#8b5cf6', position: '100%' },
    ],
  },
  {
    id: 'warm-gradient',
    name: 'Warm Gradient',
    type: 'linear',
    direction: '135deg',
    stops: [
      { color: '#f59e0b', position: '0%' },
      { color: '#ef4444', position: '100%' },
    ],
  },
  {
    id: 'nature-gradient',
    name: 'Nature Gradient',
    type: 'linear',
    direction: '135deg',
    stops: [
      { color: '#22c55e', position: '0%' },
      { color: '#06b6d4', position: '100%' },
    ],
  },
  {
    id: 'sunset-gradient',
    name: 'Sunset Gradient',
    type: 'linear',
    direction: '180deg',
    stops: [
      { color: '#f97316', position: '0%' },
      { color: '#ec4899', position: '50%' },
      { color: '#8b5cf6', position: '100%' },
    ],
  },
];

// ─── Default Fonts ──────────────────────────────────────────────────────────

export const DEFAULT_BODY_FONT: FontEntry = {
  name: 'Inter',
  family: "'Inter', system-ui, -apple-system, sans-serif",
  importUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  weights: [300, 400, 500, 600, 700],
  category: 'sans-serif',
};

export const DEFAULT_HEADING_FONT: FontEntry = {
  name: 'Inter',
  family: "'Inter', system-ui, -apple-system, sans-serif",
  weights: [600, 700, 800],
  category: 'sans-serif',
};

export const DEFAULT_MONO_FONT: FontEntry = {
  name: 'JetBrains Mono',
  family: "'JetBrains Mono', 'Fira Code', monospace",
  importUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap',
  weights: [400, 700],
  category: 'monospace',
};

// ─── Default Typography Scale ───────────────────────────────────────────────

export const DEFAULT_TYPOGRAPHY_SCALE: TypographyScale = {
  xs:   { fontSize: '0.75rem',  lineHeight: '1rem' },
  sm:   { fontSize: '0.875rem', lineHeight: '1.25rem' },
  base: { fontSize: '1rem',     lineHeight: '1.5rem' },
  lg:   { fontSize: '1.125rem', lineHeight: '1.75rem' },
  xl:   { fontSize: '1.25rem',  lineHeight: '1.75rem' },
  '2xl': { fontSize: '1.5rem',  lineHeight: '2rem' },
  '3xl': { fontSize: '1.875rem', lineHeight: '2.25rem' },
  '4xl': { fontSize: '2.25rem',  lineHeight: '2.5rem', letterSpacing: '-0.02em' },
  '5xl': { fontSize: '3rem',     lineHeight: '1',      letterSpacing: '-0.02em' },
  '6xl': { fontSize: '3.75rem',  lineHeight: '1',      letterSpacing: '-0.02em' },
};

// ─── Default Spacing ────────────────────────────────────────────────────────

export const DEFAULT_SPACING: SpacingScale = {
  0: '0px', 0.5: '0.125rem', 1: '0.25rem', 1.5: '0.375rem',
  2: '0.5rem', 2.5: '0.625rem', 3: '0.75rem', 3.5: '0.875rem',
  4: '1rem', 5: '1.25rem', 6: '1.5rem', 7: '1.75rem',
  8: '2rem', 9: '2.25rem', 10: '2.5rem', 12: '3rem',
  14: '3.5rem', 16: '4rem', 20: '5rem', 24: '6rem',
  28: '7rem', 32: '8rem', 36: '9rem', 40: '10rem',
  44: '11rem', 48: '12rem', 52: '13rem', 56: '14rem',
  60: '15rem', 64: '16rem', 72: '18rem', 80: '20rem', 96: '24rem',
};

// ─── Default Border Radius ──────────────────────────────────────────────────

export const DEFAULT_BORDER_RADIUS: BorderRadiusScale = {
  none: '0px',
  sm: '0.125rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  full: '9999px',
};

// ─── Default Shadows ────────────────────────────────────────────────────────

export const DEFAULT_SHADOWS: ShadowScale = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0,0,0,0.05)',
  md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
  xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
  '2xl': '0 25px 50px -12px rgba(0,0,0,0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0,0,0,0.06)',
};

// ─── Default Motion ─────────────────────────────────────────────────────────

export const DEFAULT_MOTION: MotionConfig = {
  durationFast: '150ms',
  durationBase: '200ms',
  durationSlow: '300ms',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  respectReducedMotion: true,
};

// ─── Default Z-Index ────────────────────────────────────────────────────────

export const DEFAULT_ZINDEX: ZIndexScale = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  overlay: 1040,
  modal: 1050,
  popover: 1060,
  toast: 1070,
  tooltip: 1080,
};

// ─── Container Widths ───────────────────────────────────────────────────────

export const DEFAULT_CONTAINER_WIDTHS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// ─── Complete Default Theme Config ──────────────────────────────────────────

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  activePresetId: 'default-light',
  colorMode: 'system',
  customOverrides: false,
  palette: DEFAULT_PALETTE,
  semanticLight: DEFAULT_SEMANTIC_LIGHT,
  semanticDark: DEFAULT_SEMANTIC_DARK,
  gradients: DEFAULT_GRADIENTS,
  bodyFont: DEFAULT_BODY_FONT,
  headingFont: DEFAULT_HEADING_FONT,
  monoFont: DEFAULT_MONO_FONT,
  typographyScale: DEFAULT_TYPOGRAPHY_SCALE,
  spacing: DEFAULT_SPACING,
  borderRadius: DEFAULT_BORDER_RADIUS,
  shadows: DEFAULT_SHADOWS,
  motion: DEFAULT_MOTION,
  zIndex: DEFAULT_ZINDEX,
  containerWidths: DEFAULT_CONTAINER_WIDTHS,
  cssVariablePrefix: '--site',
  autoColorScheme: true,
};

// ─── Theme Presets ──────────────────────────────────────────────────────────

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default-light',
    name: 'Default Light',
    description: 'Clean blue-based light theme with balanced neutrals.',
    category: 'light',
    tags: ['clean', 'modern', 'professional'],
    config: {
      colorMode: 'light',
      palette: DEFAULT_PALETTE,
      semanticLight: DEFAULT_SEMANTIC_LIGHT,
      semanticDark: DEFAULT_SEMANTIC_DARK,
      gradients: DEFAULT_GRADIENTS,
      bodyFont: DEFAULT_BODY_FONT,
      headingFont: DEFAULT_HEADING_FONT,
      monoFont: DEFAULT_MONO_FONT,
      typographyScale: DEFAULT_TYPOGRAPHY_SCALE,
      spacing: DEFAULT_SPACING,
      borderRadius: DEFAULT_BORDER_RADIUS,
      shadows: DEFAULT_SHADOWS,
      motion: DEFAULT_MOTION,
      zIndex: DEFAULT_ZINDEX,
      containerWidths: DEFAULT_CONTAINER_WIDTHS,
      cssVariablePrefix: '--site',
      autoColorScheme: true,
    },
  },
  {
    id: 'midnight-dark',
    name: 'Midnight Dark',
    description: 'Deep dark theme with vibrant accent colours for night modes.',
    category: 'dark',
    tags: ['dark', 'midnight', 'sleek'],
    config: {
      colorMode: 'dark',
      palette: {
        ...DEFAULT_PALETTE,
        primary: generateShades('#6366f1'),
        accent: generateShades('#f472b6'),
        neutral: generateShades('#475569'),
      },
      semanticLight: DEFAULT_SEMANTIC_LIGHT,
      semanticDark: {
        ...DEFAULT_SEMANTIC_DARK,
        background: '#020617',
        foreground: '#f1f5f9',
        card: '#0f172a',
        cardForeground: '#f1f5f9',
        muted: '#1e293b',
        border: '#1e293b',
      },
      gradients: [
        { id: 'dark-brand', name: 'Dark Brand', type: 'linear', direction: '135deg', stops: [{ color: '#6366f1', position: '0%' }, { color: '#a855f7', position: '100%' }] },
        ...DEFAULT_GRADIENTS.slice(1),
      ],
      bodyFont: DEFAULT_BODY_FONT,
      headingFont: DEFAULT_HEADING_FONT,
      monoFont: DEFAULT_MONO_FONT,
      typographyScale: DEFAULT_TYPOGRAPHY_SCALE,
      spacing: DEFAULT_SPACING,
      borderRadius: DEFAULT_BORDER_RADIUS,
      shadows: {
        ...DEFAULT_SHADOWS,
        md: '0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.3)',
        lg: '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.3)',
      },
      motion: DEFAULT_MOTION,
      zIndex: DEFAULT_ZINDEX,
      containerWidths: DEFAULT_CONTAINER_WIDTHS,
      cssVariablePrefix: '--site',
      autoColorScheme: true,
    },
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'WCAG AAA compliant theme with maximum contrast ratios.',
    category: 'high-contrast',
    tags: ['accessible', 'a11y', 'wcag', 'aaa'],
    config: {
      colorMode: 'light',
      palette: {
        primary: generateShades('#0056b3'),
        secondary: generateShades('#333333'),
        accent: generateShades('#cc6600'),
        neutral: generateShades('#555555'),
        success: generateShades('#006600'),
        warning: generateShades('#996600'),
        danger: generateShades('#cc0000'),
        info: generateShades('#005580'),
      },
      semanticLight: {
        background: '#ffffff',
        foreground: '#000000',
        card: '#ffffff',
        cardForeground: '#000000',
        popover: '#ffffff',
        popoverForeground: '#000000',
        muted: '#f0f0f0',
        mutedForeground: '#333333',
        border: '#000000',
        input: '#000000',
        ring: '#0056b3',
        selection: '#b3d4fc',
        overlay: 'rgba(0, 0, 0, 0.6)',
      },
      semanticDark: {
        background: '#000000',
        foreground: '#ffffff',
        card: '#1a1a1a',
        cardForeground: '#ffffff',
        popover: '#1a1a1a',
        popoverForeground: '#ffffff',
        muted: '#333333',
        mutedForeground: '#cccccc',
        border: '#ffffff',
        input: '#ffffff',
        ring: '#66b3ff',
        selection: '#003366',
        overlay: 'rgba(0, 0, 0, 0.8)',
      },
      gradients: [],
      bodyFont: { name: 'System', family: 'system-ui, -apple-system, sans-serif', weights: [400, 700], category: 'sans-serif' },
      headingFont: { name: 'System', family: 'system-ui, -apple-system, sans-serif', weights: [700, 800], category: 'sans-serif' },
      monoFont: DEFAULT_MONO_FONT,
      typographyScale: {
        ...DEFAULT_TYPOGRAPHY_SCALE,
        base: { fontSize: '1.125rem', lineHeight: '1.75rem' },
      },
      spacing: DEFAULT_SPACING,
      borderRadius: { ...DEFAULT_BORDER_RADIUS, md: '0.25rem', lg: '0.375rem' },
      shadows: DEFAULT_SHADOWS,
      motion: { ...DEFAULT_MOTION, respectReducedMotion: true },
      zIndex: DEFAULT_ZINDEX,
      containerWidths: DEFAULT_CONTAINER_WIDTHS,
      cssVariablePrefix: '--site',
      autoColorScheme: true,
    },
  },
  {
    id: 'pastel-dream',
    name: 'Pastel Dream',
    description: 'Soft, muted pastel palette for friendly, approachable brands.',
    category: 'pastel',
    tags: ['soft', 'pastel', 'friendly', 'calm'],
    config: {
      colorMode: 'light',
      palette: {
        primary: generateShades('#7c9dec'),
        secondary: generateShades('#a78bba'),
        accent: generateShades('#f0b27a'),
        neutral: generateShades('#b0b5c0'),
        success: generateShades('#7dc9a0'),
        warning: generateShades('#e8c860'),
        danger: generateShades('#e88c8c'),
        info: generateShades('#7bbcd4'),
      },
      semanticLight: {
        background: '#faf8f5',
        foreground: '#3d3d3d',
        card: '#ffffff',
        cardForeground: '#3d3d3d',
        popover: '#ffffff',
        popoverForeground: '#3d3d3d',
        muted: '#f0ede8',
        mutedForeground: '#8a8a8a',
        border: '#e5e1db',
        input: '#e5e1db',
        ring: '#7c9dec',
        selection: '#d4e0f9',
        overlay: 'rgba(0, 0, 0, 0.3)',
      },
      semanticDark: DEFAULT_SEMANTIC_DARK,
      gradients: [
        { id: 'pastel-blend', name: 'Pastel Blend', type: 'linear', direction: '135deg', stops: [{ color: '#7c9dec', position: '0%' }, { color: '#a78bba', position: '50%' }, { color: '#f0b27a', position: '100%' }] },
      ],
      bodyFont: {
        name: 'Nunito',
        family: "'Nunito', 'Segoe UI', sans-serif",
        importUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap',
        weights: [300, 400, 600, 700],
        category: 'sans-serif',
      },
      headingFont: {
        name: 'Nunito',
        family: "'Nunito', 'Segoe UI', sans-serif",
        weights: [600, 700],
        category: 'sans-serif',
      },
      monoFont: DEFAULT_MONO_FONT,
      typographyScale: DEFAULT_TYPOGRAPHY_SCALE,
      spacing: DEFAULT_SPACING,
      borderRadius: { ...DEFAULT_BORDER_RADIUS, md: '0.5rem', lg: '0.75rem', xl: '1rem' },
      shadows: {
        ...DEFAULT_SHADOWS,
        md: '0 4px 14px -3px rgba(0,0,0,0.06)',
        lg: '0 10px 25px -5px rgba(0,0,0,0.08)',
      },
      motion: DEFAULT_MOTION,
      zIndex: DEFAULT_ZINDEX,
      containerWidths: DEFAULT_CONTAINER_WIDTHS,
      cssVariablePrefix: '--site',
      autoColorScheme: false,
    },
  },
  {
    id: 'corporate-pro',
    name: 'Corporate Professional',
    description: 'Authoritative palette with navy and gold for corporate branding.',
    category: 'professional',
    tags: ['corporate', 'business', 'formal', 'enterprise'],
    config: {
      colorMode: 'light',
      palette: {
        primary: generateShades('#1e3a5f'),
        secondary: generateShades('#4a5568'),
        accent: generateShades('#c9a227'),
        neutral: generateShades('#718096'),
        success: generateShades('#2f855a'),
        warning: generateShades('#d69e2e'),
        danger: generateShades('#c53030'),
        info: generateShades('#2b6cb0'),
      },
      semanticLight: {
        background: '#f7f8fa',
        foreground: '#1a202c',
        card: '#ffffff',
        cardForeground: '#1a202c',
        popover: '#ffffff',
        popoverForeground: '#1a202c',
        muted: '#edf2f7',
        mutedForeground: '#718096',
        border: '#e2e8f0',
        input: '#e2e8f0',
        ring: '#1e3a5f',
        selection: '#bee3f8',
        overlay: 'rgba(0, 0, 0, 0.5)',
      },
      semanticDark: {
        ...DEFAULT_SEMANTIC_DARK,
        background: '#1a202c',
        foreground: '#f7fafc',
        card: '#2d3748',
      },
      gradients: [
        { id: 'corp-gradient', name: 'Corporate', type: 'linear', direction: '135deg', stops: [{ color: '#1e3a5f', position: '0%' }, { color: '#c9a227', position: '100%' }] },
      ],
      bodyFont: {
        name: 'Source Sans Pro',
        family: "'Source Sans Pro', 'Segoe UI', sans-serif",
        importUrl: 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@300;400;600;700&display=swap',
        weights: [300, 400, 600, 700],
        category: 'sans-serif',
      },
      headingFont: {
        name: 'Playfair Display',
        family: "'Playfair Display', Georgia, serif",
        importUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&display=swap',
        weights: [600, 700, 800],
        category: 'serif',
      },
      monoFont: DEFAULT_MONO_FONT,
      typographyScale: DEFAULT_TYPOGRAPHY_SCALE,
      spacing: DEFAULT_SPACING,
      borderRadius: { ...DEFAULT_BORDER_RADIUS, md: '0.25rem', lg: '0.375rem' },
      shadows: DEFAULT_SHADOWS,
      motion: DEFAULT_MOTION,
      zIndex: DEFAULT_ZINDEX,
      containerWidths: DEFAULT_CONTAINER_WIDTHS,
      cssVariablePrefix: '--site',
      autoColorScheme: true,
    },
  },
  {
    id: 'neon-pop',
    name: 'Neon Pop',
    description: 'Bold neon colours on dark backgrounds for creative / gaming sites.',
    category: 'colorful',
    tags: ['neon', 'bold', 'creative', 'gaming', 'vibrant'],
    config: {
      colorMode: 'dark',
      palette: {
        primary: generateShades('#00ff88'),
        secondary: generateShades('#ff006e'),
        accent: generateShades('#ffbe0b'),
        neutral: generateShades('#64748b'),
        success: generateShades('#00ff88'),
        warning: generateShades('#ffbe0b'),
        danger: generateShades('#ff006e'),
        info: generateShades('#00b4d8'),
      },
      semanticLight: DEFAULT_SEMANTIC_LIGHT,
      semanticDark: {
        background: '#0a0a0a',
        foreground: '#f0f0f0',
        card: '#141414',
        cardForeground: '#f0f0f0',
        popover: '#141414',
        popoverForeground: '#f0f0f0',
        muted: '#1f1f1f',
        mutedForeground: '#a0a0a0',
        border: '#2a2a2a',
        input: '#2a2a2a',
        ring: '#00ff88',
        selection: '#003322',
        overlay: 'rgba(0, 0, 0, 0.8)',
      },
      gradients: [
        { id: 'neon-glow', name: 'Neon Glow', type: 'linear', direction: '135deg', stops: [{ color: '#00ff88', position: '0%' }, { color: '#00b4d8', position: '50%' }, { color: '#ff006e', position: '100%' }] },
      ],
      bodyFont: {
        name: 'Space Grotesk',
        family: "'Space Grotesk', system-ui, sans-serif",
        importUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
        weights: [300, 400, 500, 600, 700],
        category: 'sans-serif',
      },
      headingFont: {
        name: 'Space Grotesk',
        family: "'Space Grotesk', system-ui, sans-serif",
        weights: [600, 700],
        category: 'sans-serif',
      },
      monoFont: DEFAULT_MONO_FONT,
      typographyScale: DEFAULT_TYPOGRAPHY_SCALE,
      spacing: DEFAULT_SPACING,
      borderRadius: { ...DEFAULT_BORDER_RADIUS, md: '0.5rem', lg: '0.75rem' },
      shadows: {
        ...DEFAULT_SHADOWS,
        md: '0 4px 14px -3px rgba(0,255,136,0.15)',
        lg: '0 10px 25px -5px rgba(0,255,136,0.2)',
      },
      motion: DEFAULT_MOTION,
      zIndex: DEFAULT_ZINDEX,
      containerWidths: DEFAULT_CONTAINER_WIDTHS,
      cssVariablePrefix: '--site',
      autoColorScheme: false,
    },
  },
];

// ─── Preset Helpers ─────────────────────────────────────────────────────────

export const getThemePresetById = (id: string): ThemePreset | undefined =>
  THEME_PRESETS.find((p) => p.id === id);

export const getThemePresetsByCategory = (category: string): ThemePreset[] =>
  THEME_PRESETS.filter((p) => p.category === category);
