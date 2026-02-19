/**
 * ============================================================================
 * MODULE:   components/site-settings/constants.ts
 * PURPOSE:  All hard defaults for the Site Settings module.
 *           ~110 fields with sensible production defaults.
 *
 *           DESIGN: Two tiers —
 *             CORE fields  → meaningful non-null defaults
 *             ON-REQUEST fields → null (admin inserts when needed)
 * ============================================================================
 */

import type { SiteConfig } from '../types';

// ─── Default Full Config ────────────────────────────────────────────────────

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  // Identity
  siteName: 'My Website',
  siteTagline: null,
  siteDescription: null,
  siteUrl: null,
  logoUrl: null,
  logoDarkUrl: null,
  faviconUrl: '/favicon.ico',
  language: 'en',
  timezone: 'UTC',

  // Appearance / Theme
  primaryColor: '#3b82f6',
  secondaryColor: '#64748b',
  accentColor: '#f59e0b',
  fontFamily: 'system-ui, sans-serif',
  headingFontFamily: null,
  darkModeEnabled: true,
  darkModeDefault: false,
  customCss: null,
  themeColor: null,

  // Date & Locale
  dateFormat: 'YYYY-MM-DD',
  timeFormat: 'HH:mm',
  currencyCode: 'USD',
  currencySymbol: '$',

  // Top Bar
  topBarEnabled: false,
  topBarPhone: null,
  topBarEmail: null,
  topBarAddress: null,
  topBarText: null,
  topBarShowSocialLinks: false,
  topBarBusinessHours: null,
  topBarBackgroundColor: '#1a1a2e',
  topBarTextColor: '#ffffff',
  topBarCtaText: null,
  topBarCtaUrl: null,
  topBarDismissible: false,

  // Announcement Banner
  announcementEnabled: false,
  announcementText: null,
  announcementType: 'info',
  announcementUrl: null,
  announcementDismissible: true,
  announcementBackgroundColor: null,

  // Navigation / Header
  headerStyle: 'sticky',
  navShowSearch: true,
  navShowLanguageSwitcher: false,
  navShowDarkModeToggle: true,

  // Footer
  footerText: null,
  footerShowSocialLinks: true,
  footerShowContactInfo: false,
  footerSecondaryText: null,

  // Social Links (site-wide)
  socialFacebook: null,
  socialTwitter: null,
  socialInstagram: null,
  socialLinkedin: null,
  socialYoutube: null,
  socialWhatsapp: null,
  socialTiktok: null,
  socialTelegram: null,
  socialGithub: null,
  socialPinterest: null,

  // Contact (site-wide)
  contactEmail: null,
  contactPhone: null,
  contactAddress: null,

  // SEO Defaults
  seoTitleTemplate: null,
  seoDefaultImage: null,
  seoGoogleVerification: null,
  seoGoogleAnalyticsId: null,
  seoBingVerification: null,

  // CAPTCHA
  captchaEnabled: false,
  captchaType: 'turnstile',
  captchaProvider: 'none',
  captchaSiteKey: null,
  captchaSecretKey: null,
  captchaThreshold: 0.5,
  captchaOnContactForm: false,
  captchaOnComments: false,
  enableTurnstile: true,
  enableRecaptchaV3: false,
  enableRecaptchaV2: false,
  enableHcaptcha: false,
  enableInhouse: true,
  turnstileSiteKey: null,
  recaptchaV3SiteKey: null,
  recaptchaV2SiteKey: null,
  hcaptchaSiteKey: null,
  inhouseCodeLength: 6,
  requireCaptchaLogin: false,
  requireCaptchaRegister: false,
  requireCaptchaComment: false,
  requireCaptchaContact: false,

  // Reading / Content
  postsPerPage: 10,
  excerptLength: 300,
  showFullContentInListing: false,
  enableRss: true,
  rssFeedTitle: null,
  enableComments: true,
  enableSearch: true,
  enableRegistration: true,

  // Privacy & Legal
  cookieConsentEnabled: false,
  cookieConsentMessage: 'This website uses cookies to ensure you get the best experience. By continuing to browse, you agree to our use of cookies.',
  privacyPolicyUrl: null,
  termsOfServiceUrl: null,
  gdprEnabled: false,

  // Email Sender Defaults
  emailFromName: null,
  emailFromAddress: null,
  emailReplyTo: null,

  // SMTP
  smtpHost: null,
  smtpPort: 587,
  smtpUser: null,
  smtpPassword: null,
  smtpSecure: true,

  // Email Notifications
  emailNotifyOnComment: true,
  emailNotifyOnUser: true,
  emailNotifyOnContact: true,
  emailWelcomeEnabled: true,
  emailDigestEnabled: false,
  emailDigestFrequency: 'weekly',

  // Third-Party Integrations
  googleTagManagerId: null,
  facebookPixelId: null,
  hotjarId: null,
  clarityId: null,

  // Media
  maxUploadSizeMb: 10,
  allowedFileTypes: 'jpg,jpeg,png,gif,webp,svg,pdf,doc,docx',
  imageOptimizationEnabled: true,

  // PWA
  pwaEnabled: false,
  pwaName: null,
  pwaShortName: null,
  pwaThemeColor: null,
  pwaBackgroundColor: '#ffffff',

  // Robots / Crawling
  robotsTxtCustom: null,
  sitemapEnabled: true,
  sitemapChangeFreq: 'weekly',

  // Maintenance Mode
  maintenanceMode: false,
  maintenanceMessage: 'We are currently performing maintenance. Please check back soon.',
  maintenanceAllowedIps: null,

  // Custom Code Injection
  customHeadCode: null,
  customFooterCode: null,

  // Module Kill Switches
  adsEnabled: false,
  distributionEnabled: false,

  // Admin Bar
  adminBarEnabled: true,
  adminBarShowBreadcrumbs: true,
  adminBarShowNewButton: true,
  adminBarShowSeoScore: true,
  adminBarShowStatusToggle: true,
  adminBarShowWordCount: true,
  adminBarShowLastSaved: true,
  adminBarShowSaveButton: true,
  adminBarShowPublishButton: true,
  adminBarShowPreviewButton: true,
  adminBarShowViewSiteButton: true,
  adminBarShowSiteNameDropdown: true,
  adminBarShowUserDropdown: true,
  adminBarShowEnvBadge: true,
  adminBarBackgroundColor: '#0d0d18',
  adminBarAccentColor: '#6c63ff',
};
