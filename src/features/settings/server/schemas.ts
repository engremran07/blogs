/**
 * ============================================================================
 * MODULE:   components/site-settings/schemas.ts
 * PURPOSE:  Zod validation schemas for the Site Settings module.
 *           Master schema + 17 targeted subset schemas for category updates.
 *
 *           ON-REQUEST fields accept `.nullable()` so admins can send `null`
 *           to explicitly clear a value back to its unset state.
 * ============================================================================
 */

import { z } from 'zod';
import {
  ANNOUNCEMENT_TYPES,
  HEADER_STYLES,
  SITEMAP_CHANGE_FREQS,
  CAPTCHA_PROVIDERS,
} from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Core string — always present, never null. */
const optStr = z.string().optional();

/** On-request string — can be set, cleared (null), or omitted (no change). */
const nullableStr = (max: number) => z.string().max(max).nullable().optional();

const optBool = z.boolean().optional();
const cssColor = z.string().max(30).nullable().optional();
const nullableUrl = z.string().url().nullable().optional();

// ─── Master Update Schema ───────────────────────────────────────────────────

export const updateSiteSettingsSchema = z.object({
  // Identity
  siteName: z.string().max(200).optional(),
  siteTagline: nullableStr(300),
  siteDescription: nullableStr(1000),
  siteUrl: nullableUrl,
  logoUrl: nullableStr(500),
  logoDarkUrl: nullableStr(500),
  faviconUrl: optStr,
  language: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),

  // Appearance / Theme
  primaryColor: z.string().max(30).optional(),
  secondaryColor: z.string().max(30).optional(),
  accentColor: z.string().max(30).optional(),
  fontFamily: z.string().max(200).optional(),
  headingFontFamily: nullableStr(200),
  darkModeEnabled: optBool,
  darkModeDefault: optBool,
  customCss: z.string().max(50000).nullable().optional(),
  themeColor: cssColor,

  // Date & Locale
  dateFormat: z.string().max(30).optional(),
  timeFormat: z.string().max(30).optional(),
  currencyCode: z.string().max(5).optional(),
  currencySymbol: z.string().max(5).optional(),

  // Top Bar
  topBarEnabled: optBool,
  topBarPhone: nullableStr(30),
  topBarEmail: z.string().email().nullable().optional(),
  topBarAddress: nullableStr(500),
  topBarText: nullableStr(500),
  topBarShowSocialLinks: optBool,
  topBarBusinessHours: nullableStr(200),
  topBarBackgroundColor: z.string().max(30).optional(),
  topBarTextColor: z.string().max(30).optional(),
  topBarCtaText: nullableStr(100),
  topBarCtaUrl: nullableUrl,
  topBarDismissible: optBool,

  // Announcement Banner
  announcementEnabled: optBool,
  announcementText: nullableStr(1000),
  announcementType: z.enum(ANNOUNCEMENT_TYPES).optional(),
  announcementUrl: nullableUrl,
  announcementDismissible: optBool,
  announcementBackgroundColor: cssColor,

  // Navigation / Header
  headerStyle: z.enum(HEADER_STYLES).optional(),
  navShowSearch: optBool,
  navShowLanguageSwitcher: optBool,
  navShowDarkModeToggle: optBool,

  // Footer
  footerText: nullableStr(2000),
  footerShowSocialLinks: optBool,
  footerShowContactInfo: optBool,
  footerSecondaryText: nullableStr(2000),

  // Social Links
  socialFacebook: nullableStr(300),
  socialTwitter: nullableStr(300),
  socialInstagram: nullableStr(300),
  socialLinkedin: nullableStr(300),
  socialYoutube: nullableStr(300),
  socialWhatsapp: nullableStr(300),
  socialTiktok: nullableStr(300),
  socialTelegram: nullableStr(300),
  socialGithub: nullableStr(300),
  socialPinterest: nullableStr(300),

  // Contact
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: nullableStr(30),
  contactAddress: nullableStr(500),

  // SEO
  seoTitleTemplate: nullableStr(200),
  seoDefaultImage: nullableStr(500),
  seoGoogleVerification: nullableStr(100),
  seoGoogleAnalyticsId: nullableStr(30),
  seoBingVerification: nullableStr(100),

  // CAPTCHA
  captchaProvider: z.enum(CAPTCHA_PROVIDERS).optional(),
  captchaSiteKey: nullableStr(200),
  captchaSecretKey: nullableStr(200),
  captchaThreshold: z.number().min(0).max(1).optional(),
  captchaOnContactForm: optBool,
  captchaOnComments: optBool,

  // Reading / Content
  postsPerPage: z.number().int().min(1).max(100).optional(),
  excerptLength: z.number().int().min(50).max(2000).optional(),
  showFullContentInListing: optBool,
  enableRss: optBool,
  rssFeedTitle: nullableStr(200),
  enableComments: optBool,
  enableSearch: optBool,

  // Privacy & Legal
  cookieConsentEnabled: optBool,
  cookieConsentMessage: z.string().max(2000).optional(),
  privacyPolicyUrl: nullableUrl,
  termsOfServiceUrl: nullableUrl,
  gdprEnabled: optBool,

  // Email Sender
  emailFromName: nullableStr(100),
  emailFromAddress: z.string().email().nullable().optional(),
  emailReplyTo: z.string().email().nullable().optional(),

  // Third-Party Integrations
  googleTagManagerId: nullableStr(30),
  facebookPixelId: nullableStr(30),
  hotjarId: nullableStr(20),
  clarityId: nullableStr(20),

  // Media
  maxUploadSizeMb: z.number().int().min(1).max(500).optional(),
  allowedFileTypes: z.string().max(500).optional(),
  imageOptimizationEnabled: optBool,

  // PWA
  pwaEnabled: optBool,
  pwaName: nullableStr(200),
  pwaShortName: nullableStr(30),
  pwaThemeColor: cssColor,
  pwaBackgroundColor: z.string().max(30).optional(),

  // Robots / Crawling
  robotsTxtCustom: z.string().max(5000).nullable().optional(),
  sitemapEnabled: optBool,
  sitemapChangeFreq: z.enum(SITEMAP_CHANGE_FREQS).optional(),

  // Maintenance
  maintenanceMode: optBool,
  maintenanceMessage: z.string().max(2000).optional(),
  maintenanceAllowedIps: z.string().max(2000).nullable().optional(),

  // Custom Code
  customHeadCode: z.string().max(10000).nullable().optional(),
  customFooterCode: z.string().max(10000).nullable().optional(),

  // Module Kill Switches
  adsEnabled: optBool,
  distributionEnabled: optBool,
});

export type UpdateSiteSettingsInput = z.infer<typeof updateSiteSettingsSchema>;

// ─── Subset Schemas (convenience for targeted updates) ──────────────────────

export const updateTopBarSchema = z.object({
  topBarEnabled: optBool,
  topBarPhone: nullableStr(30),
  topBarEmail: z.string().email().nullable().optional(),
  topBarAddress: nullableStr(500),
  topBarText: nullableStr(500),
  topBarShowSocialLinks: optBool,
  topBarBusinessHours: nullableStr(200),
  topBarBackgroundColor: z.string().max(30).optional(),
  topBarTextColor: z.string().max(30).optional(),
  topBarCtaText: nullableStr(100),
  topBarCtaUrl: nullableUrl,
  topBarDismissible: optBool,
});
export type UpdateTopBarInput = z.infer<typeof updateTopBarSchema>;

export const updateFooterSchema = z.object({
  footerText: nullableStr(2000),
  footerShowSocialLinks: optBool,
  footerShowContactInfo: optBool,
  footerSecondaryText: nullableStr(2000),
});
export type UpdateFooterInput = z.infer<typeof updateFooterSchema>;

export const updateSocialLinksSchema = z.object({
  socialFacebook: nullableStr(300),
  socialTwitter: nullableStr(300),
  socialInstagram: nullableStr(300),
  socialLinkedin: nullableStr(300),
  socialYoutube: nullableStr(300),
  socialWhatsapp: nullableStr(300),
  socialTiktok: nullableStr(300),
  socialTelegram: nullableStr(300),
  socialGithub: nullableStr(300),
  socialPinterest: nullableStr(300),
});
export type UpdateSocialLinksInput = z.infer<typeof updateSocialLinksSchema>;

export const updateSeoSchema = z.object({
  seoTitleTemplate: nullableStr(200),
  seoDefaultImage: nullableStr(500),
  seoGoogleVerification: nullableStr(100),
  seoGoogleAnalyticsId: nullableStr(30),
  seoBingVerification: nullableStr(100),
});
export type UpdateSeoInput = z.infer<typeof updateSeoSchema>;

export const updateMaintenanceSchema = z.object({
  maintenanceMode: optBool,
  maintenanceMessage: z.string().max(2000).optional(),
  maintenanceAllowedIps: z.string().max(2000).nullable().optional(),
});
export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>;

export const updateAppearanceSchema = z.object({
  primaryColor: z.string().max(30).optional(),
  secondaryColor: z.string().max(30).optional(),
  accentColor: z.string().max(30).optional(),
  fontFamily: z.string().max(200).optional(),
  headingFontFamily: nullableStr(200),
  darkModeEnabled: optBool,
  darkModeDefault: optBool,
  customCss: z.string().max(50000).nullable().optional(),
  themeColor: cssColor,
});
export type UpdateAppearanceInput = z.infer<typeof updateAppearanceSchema>;

export const updateReadingSchema = z.object({
  postsPerPage: z.number().int().min(1).max(100).optional(),
  excerptLength: z.number().int().min(50).max(2000).optional(),
  showFullContentInListing: optBool,
  enableRss: optBool,
  rssFeedTitle: nullableStr(200),
  enableComments: optBool,
  enableSearch: optBool,
});
export type UpdateReadingInput = z.infer<typeof updateReadingSchema>;

export const updatePrivacySchema = z.object({
  cookieConsentEnabled: optBool,
  cookieConsentMessage: z.string().max(2000).optional(),
  privacyPolicyUrl: nullableUrl,
  termsOfServiceUrl: nullableUrl,
  gdprEnabled: optBool,
});
export type UpdatePrivacyInput = z.infer<typeof updatePrivacySchema>;

export const updateAnnouncementSchema = z.object({
  announcementEnabled: optBool,
  announcementText: nullableStr(1000),
  announcementType: z.enum(ANNOUNCEMENT_TYPES).optional(),
  announcementUrl: nullableUrl,
  announcementDismissible: optBool,
  announcementBackgroundColor: cssColor,
});
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;

export const updateNavigationSchema = z.object({
  headerStyle: z.enum(HEADER_STYLES).optional(),
  navShowSearch: optBool,
  navShowLanguageSwitcher: optBool,
  navShowDarkModeToggle: optBool,
});
export type UpdateNavigationInput = z.infer<typeof updateNavigationSchema>;

export const updateCaptchaSchema = z.object({
  captchaProvider: z.enum(CAPTCHA_PROVIDERS).optional(),
  captchaSiteKey: nullableStr(200),
  captchaSecretKey: nullableStr(200),
  captchaThreshold: z.number().min(0).max(1).optional(),
  captchaOnContactForm: optBool,
  captchaOnComments: optBool,
});
export type UpdateCaptchaInput = z.infer<typeof updateCaptchaSchema>;

export const updatePwaSchema = z.object({
  pwaEnabled: optBool,
  pwaName: nullableStr(200),
  pwaShortName: nullableStr(30),
  pwaThemeColor: cssColor,
  pwaBackgroundColor: z.string().max(30).optional(),
});
export type UpdatePwaInput = z.infer<typeof updatePwaSchema>;

export const updateEmailSenderSchema = z.object({
  emailFromName: nullableStr(100),
  emailFromAddress: z.string().email().nullable().optional(),
  emailReplyTo: z.string().email().nullable().optional(),
});
export type UpdateEmailSenderInput = z.infer<typeof updateEmailSenderSchema>;

export const updateMediaSchema = z.object({
  maxUploadSizeMb: z.number().int().min(1).max(500).optional(),
  allowedFileTypes: z.string().max(500).optional(),
  imageOptimizationEnabled: optBool,
});
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;

export const updateIntegrationsSchema = z.object({
  seoGoogleAnalyticsId: nullableStr(30),
  googleTagManagerId: nullableStr(30),
  facebookPixelId: nullableStr(30),
  hotjarId: nullableStr(20),
  clarityId: nullableStr(20),
});
export type UpdateIntegrationsInput = z.infer<typeof updateIntegrationsSchema>;

export const updateDateLocaleSchema = z.object({
  language: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  dateFormat: z.string().max(30).optional(),
  timeFormat: z.string().max(30).optional(),
  currencyCode: z.string().max(5).optional(),
  currencySymbol: z.string().max(5).optional(),
});
export type UpdateDateLocaleInput = z.infer<typeof updateDateLocaleSchema>;

export const updateRobotsSchema = z.object({
  robotsTxtCustom: z.string().max(5000).nullable().optional(),
  sitemapEnabled: optBool,
  sitemapChangeFreq: z.enum(SITEMAP_CHANGE_FREQS).optional(),
});
export type UpdateRobotsInput = z.infer<typeof updateRobotsSchema>;

export const updateIdentitySchema = z.object({
  siteName: z.string().max(200).optional(),
  siteTagline: nullableStr(300),
  siteDescription: nullableStr(1000),
  siteUrl: nullableUrl,
  logoUrl: nullableStr(500),
  logoDarkUrl: nullableStr(500),
  faviconUrl: optStr,
  language: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
});
export type UpdateIdentityInput = z.infer<typeof updateIdentitySchema>;

export const updateContactSchema = z.object({
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: nullableStr(30),
  contactAddress: nullableStr(500),
});
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

export const updateCustomCodeSchema = z.object({
  customHeadCode: z.string().max(10000).nullable().optional(),
  customFooterCode: z.string().max(10000).nullable().optional(),
});
export type UpdateCustomCodeInput = z.infer<typeof updateCustomCodeSchema>;

export const updateModuleKillSwitchSchema = z.object({
  adsEnabled: optBool,
  distributionEnabled: optBool,
});
export type UpdateModuleKillSwitchInput = z.infer<typeof updateModuleKillSwitchSchema>;
