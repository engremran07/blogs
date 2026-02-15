/**
 * ============================================================================
 * MODULE:   components/site-settings/index.ts
 * PURPOSE:  Public barrel exports for the Site Settings module.
 * ============================================================================
 */

// ─── Types ──────────────────────────────────────────────────────────────────
export type {
  SiteConfig,
  SiteSystemSettings,
  SiteConfigConsumer,
  TopBarConfig,
  FooterConfig,
  SocialLinksConfig,
  SeoConfig,
  MaintenanceConfig,
  AppearanceConfig,
  ReadingConfig,
  PrivacyConfig,
  AnnouncementConfig,
  NavigationConfig,
  CaptchaConfig,
  CaptchaProviderType,
  PwaConfig,
  EmailSenderConfig,
  MediaConfig,
  DateLocaleConfig,
  RobotsConfig,
  IntegrationConfig,
  IdentityConfig,
  ContactConfig,
  CustomCodeConfig,
  ModuleKillSwitchConfig,
  AnnouncementType,
  HeaderStyle,
  SitemapChangeFreq,
  PrismaDelegate,
  SiteSettingsPrismaClient,
  ApiSuccess,
  ApiError,
  ApiResponse,
} from './types';

export {
  ANNOUNCEMENT_TYPES,
  HEADER_STYLES,
  SITEMAP_CHANGE_FREQS,
  CAPTCHA_PROVIDERS,
} from './types';

// ─── Constants ──────────────────────────────────────────────────────────────
export { DEFAULT_SITE_CONFIG } from './server/constants';

// ─── Schemas (Zod) ──────────────────────────────────────────────────────────
export {
  updateSiteSettingsSchema,
  updateTopBarSchema,
  updateFooterSchema,
  updateSocialLinksSchema,
  updateSeoSchema,
  updateMaintenanceSchema,
  updateAppearanceSchema,
  updateReadingSchema,
  updatePrivacySchema,
  updateAnnouncementSchema,
  updateNavigationSchema,
  updateCaptchaSchema,
  updatePwaSchema,
  updateEmailSenderSchema,
  updateMediaSchema,
  updateIntegrationsSchema,
  updateDateLocaleSchema,
  updateRobotsSchema,
  updateIdentitySchema,
  updateContactSchema,
  updateCustomCodeSchema,
  updateModuleKillSwitchSchema,
} from './server/schemas';

export type {
  UpdateSiteSettingsInput,
  UpdateTopBarInput,
  UpdateFooterInput,
  UpdateSocialLinksInput,
  UpdateSeoInput,
  UpdateMaintenanceInput,
  UpdateAppearanceInput,
  UpdateReadingInput,
  UpdatePrivacyInput,
  UpdateAnnouncementInput,
  UpdateNavigationInput,
  UpdateCaptchaInput,
  UpdatePwaInput,
  UpdateEmailSenderInput,
  UpdateMediaInput,
  UpdateIntegrationsInput,
  UpdateDateLocaleInput,
  UpdateRobotsInput,
  UpdateIdentityInput,
  UpdateContactInput,
  UpdateCustomCodeInput,
  UpdateModuleKillSwitchInput,
} from './server/schemas';

// ─── Service ────────────────────────────────────────────────────────────────
export { SiteSettingsService } from './server/site-settings.service';

// ─── Sub-module: Menu Builder ───────────────────────────────────────────────
export * from './menu-builder';

// ─── Sub-module: Theme ──────────────────────────────────────────────────────
export * from './theme';
