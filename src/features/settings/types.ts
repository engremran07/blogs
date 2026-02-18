/**
 * ============================================================================
 * MODULE:   components/site-settings/types.ts
 * PURPOSE:  Pure TypeScript types for the Site Settings module.
 *           Manages all site-level configuration across 17 categories.
 *
 *           DESIGN: Two tiers of fields —
 *             1. CORE  (non-nullable, always present with meaningful defaults)
 *                → booleans, numbers, enums, and strings with semantic defaults
 *             2. ON-REQUEST  (nullable, default null — admin inserts when needed)
 *                → content strings, URLs, credentials, custom code
 *
 *           No framework imports — works in Next.js, NestJS, or standalone.
 * ============================================================================
 */

// ─── Enums / Const Arrays ───────────────────────────────────────────────────

export const ANNOUNCEMENT_TYPES = ['info', 'warning', 'success', 'error'] as const;
export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number];

export const HEADER_STYLES = ['static', 'sticky', 'fixed'] as const;
export type HeaderStyle = (typeof HEADER_STYLES)[number];

export const SITEMAP_CHANGE_FREQS = [
  'always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never',
] as const;
export type SitemapChangeFreq = (typeof SITEMAP_CHANGE_FREQS)[number];

/**
 * Supported CAPTCHA providers — aligns with `captcha/types.ts`.
 * 'none' means CAPTCHA is not configured site-wide.
 */
export const CAPTCHA_PROVIDERS = [
  'none', 'turnstile', 'recaptcha-v3', 'recaptcha-v2', 'hcaptcha', 'custom',
] as const;
export type CaptchaProviderType = (typeof CAPTCHA_PROVIDERS)[number];

// ─── Site Configuration ─────────────────────────────────────────────────────

/**
 * All admin-configurable site-level settings.
 * Flat structure — maps directly to DB columns in SiteSettings model.
 *
 * ~110 fields organised into 17 categories:
 *   Identity, Appearance, Date/Locale, Top Bar, Announcement Banner,
 *   Navigation, Footer, Social Links, Contact, SEO, CAPTCHA,
 *   Reading/Content, Privacy/Legal, Email Sender, Third-Party Integrations,
 *   Media, PWA, Robots/Crawling, Maintenance, Custom Code.
 *
 * Fields marked `string | null` are "on-request" — null until the admin
 * explicitly configures them. This keeps fresh installs lightweight.
 */
export interface SiteConfig {
  // ── Identity ──────────────────────────────────────────────────────────
  /** Site name / brand (CORE — default: 'My Website') */
  siteName: string;
  /** Short tagline displayed below site name (on-request) */
  siteTagline: string | null;
  /** Site meta description for SEO (on-request) */
  siteDescription: string | null;
  /** Canonical URL of the site, no trailing slash (on-request) */
  siteUrl: string | null;
  /** URL or path to site logo (on-request) */
  logoUrl: string | null;
  /** URL or path to dark-mode logo variant (on-request) */
  logoDarkUrl: string | null;
  /** URL or path to favicon (CORE — default: '/favicon.ico') */
  faviconUrl: string;
  /** Default language / locale code (CORE — default: 'en') */
  language: string;
  /** IANA timezone (CORE — default: 'UTC') */
  timezone: string;

  // ── Appearance / Theme ────────────────────────────────────────────────
  /** Primary brand colour (CORE — default: '#3b82f6') */
  primaryColor: string;
  /** Secondary brand colour (CORE — default: '#64748b') */
  secondaryColor: string;
  /** Accent / highlight colour (CORE — default: '#f59e0b') */
  accentColor: string;
  /** Base body font family (CORE — default: 'system-ui, sans-serif') */
  fontFamily: string;
  /** Heading font family — null = inherit body font (on-request) */
  headingFontFamily: string | null;
  /** Allow users to toggle dark mode (CORE — default: true) */
  darkModeEnabled: boolean;
  /** Default to dark mode for first-time visitors (CORE — default: false) */
  darkModeDefault: boolean;
  /** Custom CSS injected globally (on-request) */
  customCss: string | null;
  /** Browser meta `theme-color` — null = use primaryColor (on-request) */
  themeColor: string | null;

  // ── Date & Locale ─────────────────────────────────────────────────────
  /** Date format (CORE — default: 'YYYY-MM-DD') */
  dateFormat: string;
  /** Time format (CORE — default: 'HH:mm') */
  timeFormat: string;
  /** ISO 4217 currency code (CORE — default: 'USD') */
  currencyCode: string;
  /** Currency display symbol (CORE — default: '$') */
  currencySymbol: string;

  // ── Top Bar ───────────────────────────────────────────────────────────
  /** Master kill switch (CORE — default: false) */
  topBarEnabled: boolean;
  /** Phone number displayed in the top bar (on-request) */
  topBarPhone: string | null;
  /** Email displayed in the top bar (on-request) */
  topBarEmail: string | null;
  /** Physical address shown in the top bar (on-request) */
  topBarAddress: string | null;
  /** Custom text/announcement for the top bar (on-request) */
  topBarText: string | null;
  /** Show social-link icons in the top bar (CORE — default: false) */
  topBarShowSocialLinks: boolean;
  /** Business hours text (on-request) */
  topBarBusinessHours: string | null;
  /** Background colour (CORE — default: '#1a1a2e') */
  topBarBackgroundColor: string;
  /** Text colour (CORE — default: '#ffffff') */
  topBarTextColor: string;
  /** CTA button label (on-request — null = no button) */
  topBarCtaText: string | null;
  /** CTA button URL (on-request) */
  topBarCtaUrl: string | null;
  /** Allow visitors to dismiss/close the top bar (CORE — default: true) */
  topBarDismissible: boolean;

  // ── Announcement Banner ───────────────────────────────────────────────
  /** Enable site-wide announcement banner (CORE — default: false) */
  announcementEnabled: boolean;
  /** Announcement text (on-request) */
  announcementText: string | null;
  /** Announcement severity (CORE — default: 'info') */
  announcementType: AnnouncementType;
  /** URL the announcement links to on click (on-request) */
  announcementUrl: string | null;
  /** Allow visitors to dismiss the banner (CORE — default: true) */
  announcementDismissible: boolean;
  /** Background colour override — null = derive from type (on-request) */
  announcementBackgroundColor: string | null;

  // ── Navigation / Header ───────────────────────────────────────────────
  /** Header position behaviour (CORE — default: 'sticky') */
  headerStyle: HeaderStyle;
  /** Show search bar in navigation (CORE — default: true) */
  navShowSearch: boolean;
  /** Show language switcher in navigation (CORE — default: false) */
  navShowLanguageSwitcher: boolean;
  /** Show dark-mode toggle button in navigation (CORE — default: true) */
  navShowDarkModeToggle: boolean;

  // ── Footer ────────────────────────────────────────────────────────────
  /** Footer copyright / text (on-request — null = auto-generate) */
  footerText: string | null;
  /** Show social link icons in the footer (CORE — default: true) */
  footerShowSocialLinks: boolean;
  /** Show contact info in the footer (CORE — default: false) */
  footerShowContactInfo: boolean;
  /** Additional footer text below main footer (on-request) */
  footerSecondaryText: string | null;

  // ── Social Links (site-wide) ──────────────────────────────────────────
  socialFacebook: string | null;
  socialTwitter: string | null;
  socialInstagram: string | null;
  socialLinkedin: string | null;
  socialYoutube: string | null;
  socialWhatsapp: string | null;
  socialTiktok: string | null;
  socialTelegram: string | null;
  socialGithub: string | null;
  socialPinterest: string | null;

  // ── Contact (site-wide) ───────────────────────────────────────────────
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;

  // ── SEO Defaults ──────────────────────────────────────────────────────
  /** Title template — use %s for page title (on-request — null = '%s') */
  seoTitleTemplate: string | null;
  /** Default Open Graph image URL (on-request) */
  seoDefaultImage: string | null;
  /** Google Search Console verification code (on-request) */
  seoGoogleVerification: string | null;
  /** Google Analytics measurement ID (on-request) */
  seoGoogleAnalyticsId: string | null;
  /** Bing Webmaster Tools verification code (on-request) */
  seoBingVerification: string | null;

  // ── CAPTCHA (site-wide provider configuration) ────────────────────────
  /** Master kill-switch for CAPTCHA module (CORE — default: false) */
  captchaEnabled: boolean;
  /** Default CAPTCHA type selected in admin (CORE — default: 'turnstile') */
  captchaType: string;
  /** Which CAPTCHA provider to use site-wide (CORE — default: 'none') */
  captchaProvider: CaptchaProviderType;
  /** Public site key for the selected provider (on-request) */
  captchaSiteKey: string | null;
  /** Server-side secret key for verification (on-request) */
  captchaSecretKey: string | null;
  /** Score threshold for v3-style providers, 0.0–1.0 (CORE — default: 0.5) */
  captchaThreshold: number;
  /** Require CAPTCHA on contact forms (CORE — default: false) */
  captchaOnContactForm: boolean;
  /** Require CAPTCHA on comment submissions (CORE — default: false) */
  captchaOnComments: boolean;
  /** Enable Cloudflare Turnstile provider */
  enableTurnstile: boolean;
  /** Enable Google reCAPTCHA v3 provider */
  enableRecaptchaV3: boolean;
  /** Enable Google reCAPTCHA v2 provider */
  enableRecaptchaV2: boolean;
  /** Enable hCaptcha provider */
  enableHcaptcha: boolean;
  /** Enable in-house CAPTCHA (final fallback) */
  enableInhouse: boolean;
  /** Cloudflare Turnstile public site key */
  turnstileSiteKey: string | null;
  /** Google reCAPTCHA v3 public site key */
  recaptchaV3SiteKey: string | null;
  /** Google reCAPTCHA v2 public site key */
  recaptchaV2SiteKey: string | null;
  /** hCaptcha public site key */
  hcaptchaSiteKey: string | null;
  /** In-house captcha code length (CORE — default: 6) */
  inhouseCodeLength: number;
  /** Require CAPTCHA on login form */
  requireCaptchaLogin: boolean;
  /** Require CAPTCHA on registration form */
  requireCaptchaRegister: boolean;
  /** Require CAPTCHA on comment form */
  requireCaptchaComment: boolean;
  /** Require CAPTCHA on contact form */
  requireCaptchaContact: boolean;

  // ── Reading / Content ─────────────────────────────────────────────────
  /** Posts displayed per page (CORE — default: 10) */
  postsPerPage: number;
  /** Excerpt length in characters (CORE — default: 300) */
  excerptLength: number;
  /** Show full content in listings instead of excerpts (CORE — default: false) */
  showFullContentInListing: boolean;
  /** Enable RSS feed generation (CORE — default: true) */
  enableRss: boolean;
  /** Custom RSS feed title — null = use siteName (on-request) */
  rssFeedTitle: string | null;
  /** Enable comments site-wide (CORE — default: true) */
  enableComments: boolean;
  /** Enable site-wide search (CORE — default: true) */
  enableSearch: boolean;
  /** Allow new users to register accounts (CORE — default: true) */
  enableRegistration: boolean;

  // ── Privacy & Legal ───────────────────────────────────────────────────
  /** Show cookie consent banner (CORE — default: false) */
  cookieConsentEnabled: boolean;
  /** Cookie consent banner text (CORE — default: standard message) */
  cookieConsentMessage: string;
  /** URL to privacy policy page (on-request) */
  privacyPolicyUrl: string | null;
  /** URL to terms of service page (on-request) */
  termsOfServiceUrl: string | null;
  /** Enable GDPR-related features (CORE — default: false) */
  gdprEnabled: boolean;

  // ── Email Sender Defaults ─────────────────────────────────────────────
  /** Default "From" name — null = use siteName (on-request) */
  emailFromName: string | null;
  /** Default "From" email address (on-request) */
  emailFromAddress: string | null;
  /** Reply-to email — null = use emailFromAddress (on-request) */
  emailReplyTo: string | null;

  // ── SMTP Configuration ────────────────────────────────────────────────
  /** SMTP server hostname */
  smtpHost: string | null;
  /** SMTP port (default: 587) */
  smtpPort: number;
  /** SMTP username */
  smtpUser: string | null;
  /** SMTP password (stored encrypted) */
  smtpPassword: string | null;
  /** Use TLS for SMTP (default: true) */
  smtpSecure: boolean;

  // ── Email Notifications ───────────────────────────────────────────────
  /** Send admin email on new comment */
  emailNotifyOnComment: boolean;
  /** Send admin email on new user registration */
  emailNotifyOnUser: boolean;
  /** Send admin email on contact form submission */
  emailNotifyOnContact: boolean;
  /** Send welcome email to new users */
  emailWelcomeEnabled: boolean;
  /** Enable email digest */
  emailDigestEnabled: boolean;
  /** Email digest frequency: daily | weekly | monthly */
  emailDigestFrequency: string;

  // ── Third-Party Integrations ──────────────────────────────────────────
  /** Google Tag Manager container ID (on-request) */
  googleTagManagerId: string | null;
  /** Facebook Pixel ID (on-request) */
  facebookPixelId: string | null;
  /** Hotjar site ID (on-request) */
  hotjarId: string | null;
  /** Microsoft Clarity project ID (on-request) */
  clarityId: string | null;

  // ── Media ─────────────────────────────────────────────────────────────
  /** Maximum file upload size in MB (CORE — default: 10) */
  maxUploadSizeMb: number;
  /** Allowed file extensions, comma-separated (CORE — default: standard set) */
  allowedFileTypes: string;
  /** Enable server-side image optimisation (CORE — default: true) */
  imageOptimizationEnabled: boolean;

  // ── PWA (Progressive Web App) ─────────────────────────────────────────
  /** Enable PWA features (CORE — default: false) */
  pwaEnabled: boolean;
  /** PWA app name — null = use siteName (on-request) */
  pwaName: string | null;
  /** PWA short name for home screen (on-request) */
  pwaShortName: string | null;
  /** PWA theme colour — null = use primaryColor (on-request) */
  pwaThemeColor: string | null;
  /** PWA background colour for splash screen (CORE — default: '#ffffff') */
  pwaBackgroundColor: string;

  // ── Robots / Crawling ─────────────────────────────────────────────────
  /** Custom robots.txt content — null = auto-generate (on-request) */
  robotsTxtCustom: string | null;
  /** Enable sitemap.xml generation (CORE — default: true) */
  sitemapEnabled: boolean;
  /** Default sitemap changefreq value (CORE — default: 'weekly') */
  sitemapChangeFreq: SitemapChangeFreq;

  // ── Maintenance Mode ──────────────────────────────────────────────────
  /** Master kill switch (CORE — default: false) */
  maintenanceMode: boolean;
  /** Message displayed during maintenance (CORE — default: standard message) */
  maintenanceMessage: string;
  /** Comma-separated IPs that bypass maintenance (on-request) */
  maintenanceAllowedIps: string | null;

  // ── Custom Code Injection ─────────────────────────────────────────────
  /** Custom HTML/JS injected into <head> (on-request) */
  customHeadCode: string | null;
  /** Custom HTML/JS injected before </body> (on-request) */
  customFooterCode: string | null;

  // ── Module Kill Switches ──────────────────────────────────────────────
  /** Enable ads module (CORE — default: false) */
  adsEnabled: boolean;
  /** Enable distribution module (CORE — default: false) */
  distributionEnabled: boolean;
}

// ─── Convenience Sub-types ──────────────────────────────────────────────────

/** Extracts only top-bar fields from SiteConfig. */
export interface TopBarConfig {
  topBarEnabled: boolean;
  topBarPhone: string | null;
  topBarEmail: string | null;
  topBarAddress: string | null;
  topBarText: string | null;
  topBarShowSocialLinks: boolean;
  topBarBusinessHours: string | null;
  topBarBackgroundColor: string;
  topBarTextColor: string;
  topBarCtaText: string | null;
  topBarCtaUrl: string | null;
  topBarDismissible: boolean;
}

/** Extracts identity fields from SiteConfig. */
export interface IdentityConfig {
  siteName: string;
  siteTagline: string | null;
  siteDescription: string | null;
  siteUrl: string | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string;
  language: string;
  timezone: string;
}

/** Extracts contact fields from SiteConfig. */
export interface ContactConfig {
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
}

/** Extracts custom code injection fields from SiteConfig. */
export interface CustomCodeConfig {
  customHeadCode: string | null;
  customFooterCode: string | null;
}

/** Extracts module kill switch fields from SiteConfig. */
export interface ModuleKillSwitchConfig {
  adsEnabled: boolean;
  distributionEnabled: boolean;
  captchaEnabled: boolean;
}

/** Extracts only footer fields from SiteConfig. */
export interface FooterConfig {
  footerText: string | null;
  footerShowSocialLinks: boolean;
  footerShowContactInfo: boolean;
  footerSecondaryText: string | null;
}

/** Extracts only social-link fields from SiteConfig. */
export interface SocialLinksConfig {
  socialFacebook: string | null;
  socialTwitter: string | null;
  socialInstagram: string | null;
  socialLinkedin: string | null;
  socialYoutube: string | null;
  socialWhatsapp: string | null;
  socialTiktok: string | null;
  socialTelegram: string | null;
  socialGithub: string | null;
  socialPinterest: string | null;
}

/** Extracts only SEO fields from SiteConfig. */
export interface SeoConfig {
  siteName: string;
  siteDescription: string | null;
  siteUrl: string | null;
  seoTitleTemplate: string | null;
  seoDefaultImage: string | null;
  seoGoogleVerification: string | null;
  seoGoogleAnalyticsId: string | null;
  seoBingVerification: string | null;
}

/** Extracts maintenance mode fields. */
export interface MaintenanceConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceAllowedIps: string | null;
}

/** Extracts appearance / theme fields. */
export interface AppearanceConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  headingFontFamily: string | null;
  darkModeEnabled: boolean;
  darkModeDefault: boolean;
  customCss: string | null;
  themeColor: string | null;
}

/** Extracts reading / content fields. */
export interface ReadingConfig {
  postsPerPage: number;
  excerptLength: number;
  showFullContentInListing: boolean;
  enableRss: boolean;
  rssFeedTitle: string | null;
  enableComments: boolean;
  enableSearch: boolean;
  enableRegistration: boolean;
}

/** Extracts privacy / legal fields. */
export interface PrivacyConfig {
  cookieConsentEnabled: boolean;
  cookieConsentMessage: string;
  privacyPolicyUrl: string | null;
  termsOfServiceUrl: string | null;
  gdprEnabled: boolean;
}

/** Extracts announcement banner fields. */
export interface AnnouncementConfig {
  announcementEnabled: boolean;
  announcementText: string | null;
  announcementType: AnnouncementType;
  announcementUrl: string | null;
  announcementDismissible: boolean;
  announcementBackgroundColor: string | null;
}

/** Extracts navigation / header fields. */
export interface NavigationConfig {
  headerStyle: HeaderStyle;
  navShowSearch: boolean;
  navShowLanguageSwitcher: boolean;
  navShowDarkModeToggle: boolean;
}

/** Extracts CAPTCHA provider configuration (site-wide). */
export interface CaptchaConfig {
  captchaEnabled: boolean;
  captchaType: string;
  captchaProvider: CaptchaProviderType;
  captchaSiteKey: string | null;
  captchaSecretKey: string | null;
  captchaThreshold: number;
  captchaOnContactForm: boolean;
  captchaOnComments: boolean;
  enableTurnstile: boolean;
  enableRecaptchaV3: boolean;
  enableRecaptchaV2: boolean;
  enableHcaptcha: boolean;
  enableInhouse: boolean;
  turnstileSiteKey: string | null;
  recaptchaV3SiteKey: string | null;
  recaptchaV2SiteKey: string | null;
  hcaptchaSiteKey: string | null;
  inhouseCodeLength: number;
  requireCaptchaLogin: boolean;
  requireCaptchaRegister: boolean;
  requireCaptchaComment: boolean;
  requireCaptchaContact: boolean;
}

/** Extracts PWA fields. */
export interface PwaConfig {
  pwaEnabled: boolean;
  pwaName: string | null;
  pwaShortName: string | null;
  pwaThemeColor: string | null;
  pwaBackgroundColor: string;
}

/** Extracts email sender defaults. */
export interface EmailSenderConfig {
  emailFromName: string | null;
  emailFromAddress: string | null;
  emailReplyTo: string | null;
}

/** Extracts SMTP configuration. */
export interface SmtpConfig {
  smtpHost: string | null;
  smtpPort: number;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpSecure: boolean;
}

/** Extracts email notification toggles. */
export interface EmailNotificationConfig {
  emailNotifyOnComment: boolean;
  emailNotifyOnUser: boolean;
  emailNotifyOnContact: boolean;
  emailWelcomeEnabled: boolean;
}

/** Extracts email digest settings. */
export interface EmailDigestConfig {
  emailDigestEnabled: boolean;
  emailDigestFrequency: string;
}

/** Extracts media upload fields. */
export interface MediaConfig {
  maxUploadSizeMb: number;
  allowedFileTypes: string;
  imageOptimizationEnabled: boolean;
}

/** Extracts date & locale fields. */
export interface DateLocaleConfig {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  currencyCode: string;
  currencySymbol: string;
}

/** Extracts robots / crawling fields. */
export interface RobotsConfig {
  robotsTxtCustom: string | null;
  sitemapEnabled: boolean;
  sitemapChangeFreq: SitemapChangeFreq;
}

/** Extracts third-party integration IDs. */
export interface IntegrationConfig {
  seoGoogleAnalyticsId: string | null;
  googleTagManagerId: string | null;
  facebookPixelId: string | null;
  hotjarId: string | null;
  clarityId: string | null;
}

// ─── DB-backed Settings Row ─────────────────────────────────────────────────

/**
 * Shape of the SiteSettings Prisma model (singleton row).
 * All fields required — defaults applied on creation.
 */
export interface SiteSystemSettings extends SiteConfig {
  id: string;
  updatedBy: string | null;
  updatedAt: Date;
}

// ─── Config Consumer ────────────────────────────────────────────────────────

/** Implement this to receive live config updates when admin changes site settings. */
export interface SiteConfigConsumer {
  updateSiteConfig(cfg: SiteConfig): void;
}

// ─── Minimal Prisma Interface ───────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PrismaDelegate {
  findUnique(args: any): Promise<any>;
  findFirst(args?: any): Promise<any>;
  findMany(args?: any): Promise<any[]>;
  create(args: any): Promise<any>;
  update(args: any): Promise<any>;
  updateMany(args: any): Promise<any>;
  delete(args: any): Promise<any>;
  deleteMany(args: any): Promise<any>;
  count(args?: any): Promise<number>;
}

export interface SiteSettingsPrismaClient {
  siteSettings: PrismaDelegate;
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
