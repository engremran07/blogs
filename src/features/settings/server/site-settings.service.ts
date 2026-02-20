/**
 * ============================================================================
 * MODULE:   components/site-settings/site-settings.service.ts
 * PURPOSE:  DB-backed dynamic site settings â€” fully configurable at runtime.
 *
 * Features:
 *   - Singleton `SiteSettings` row in the database
 *   - Cached in-memory, invalidated on update
 *   - Kill switches: top bar, announcement, maintenance mode, dark mode,
 *     comments, RSS, search, CAPTCHA
 *   - 17 convenience sub-config extractors with dedicated getters + updaters
 *   - Consumer propagation â€” any service can subscribe to config changes
 *   - ~110 configurable fields across 17 categories
 *   - ON-REQUEST fields default to null â€” lightweight fresh installs
 * ============================================================================
 */

import type {
  SiteConfig,
  SiteSystemSettings,
  SiteConfigConsumer,
  SiteSettingsPrismaClient,
  ApiResponse,
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
  AdminBarConfig,
} from "../types";
import { DEFAULT_SITE_CONFIG } from "./constants";
import { updateSiteSettingsSchema } from "./schemas";

// â”€â”€â”€ Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class SiteSettingsService {
  private consumers: SiteConfigConsumer[] = [];
  private cached: SiteSystemSettings | null = null;

  constructor(private readonly prisma: SiteSettingsPrismaClient) {}

  // â”€â”€â”€ Consumer Registration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Register a service to receive config updates when admin changes settings. */
  registerConsumer(consumer: SiteConfigConsumer): void {
    this.consumers.push(consumer);
  }

  // â”€â”€â”€ Read Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Get current settings (cached). Creates default row if none exists. */
  async getSettings(): Promise<SiteSystemSettings> {
    if (this.cached) return this.cached;
    return this.loadFromDb();
  }

  /** Get current config (without DB audit fields). */
  async getConfig(): Promise<SiteConfig> {
    const settings = await this.getSettings();
    return this.settingsToConfig(settings);
  }

  /** Get settings wrapped in ApiResponse. */
  async getSettingsResponse(): Promise<ApiResponse<SiteSystemSettings>> {
    try {
      const settings = await this.getSettings();
      return {
        success: true,
        data: settings,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        success: false,
        error: {
          code: "SITE_SETTINGS_READ_ERROR",
          message: "Failed to read site settings",
          statusCode: 500,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // â”€â”€â”€ Update Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Partial update â€” only provided fields are changed. */
  async updateSettings(
    updates: Partial<SiteConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    try {
      const parsed = updateSiteSettingsSchema.parse(updates);
      const current = await this.getSettings();

      const data: Record<string, unknown> = {
        ...(parsed as Record<string, unknown>),
        updatedAt: new Date(),
      };
      if (updatedBy) data.updatedBy = updatedBy;

      const updated = await this.prisma.siteSettings.update({
        where: { id: current.id },
        data,
      });

      this.cached = updated as unknown as SiteSystemSettings;
      this.propagateToConsumers();

      return {
        success: true,
        data: this.cached,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        success: false,
        error: {
          code: "SITE_SETTINGS_UPDATE_ERROR",
          message: "Failed to update site settings",
          statusCode: 400,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /** Reset all settings to defaults. */
  async resetToDefaults(
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings({ ...DEFAULT_SITE_CONFIG }, updatedBy);
  }

  // â”€â”€â”€ Top Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getTopBarConfig(): Promise<TopBarConfig> {
    const s = await this.getSettings();
    return {
      topBarEnabled: s.topBarEnabled,
      topBarPhone: s.topBarPhone,
      topBarEmail: s.topBarEmail,
      topBarAddress: s.topBarAddress,
      topBarText: s.topBarText,
      topBarShowSocialLinks: s.topBarShowSocialLinks,
      topBarBusinessHours: s.topBarBusinessHours,
      topBarBackgroundColor: s.topBarBackgroundColor,
      topBarTextColor: s.topBarTextColor,
      topBarCtaText: s.topBarCtaText,
      topBarCtaUrl: s.topBarCtaUrl,
      topBarDismissible: s.topBarDismissible,
    };
  }

  async getTopBarConfigResponse(): Promise<ApiResponse<TopBarConfig>> {
    try {
      const config = await this.getTopBarConfig();
      return {
        success: true,
        data: config,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        success: false,
        error: {
          code: "TOP_BAR_READ_ERROR",
          message: "Failed to read top bar config",
          statusCode: 500,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async enableTopBar(
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings({ topBarEnabled: true }, updatedBy);
  }

  async disableTopBar(
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings({ topBarEnabled: false }, updatedBy);
  }

  async updateTopBar(
    updates: Partial<TopBarConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings(updates, updatedBy);
  }

  // â”€â”€â”€ Announcement Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getAnnouncementConfig(): Promise<AnnouncementConfig> {
    const s = await this.getSettings();
    return {
      announcementEnabled: s.announcementEnabled,
      announcementText: s.announcementText,
      announcementType: s.announcementType,
      announcementUrl: s.announcementUrl,
      announcementDismissible: s.announcementDismissible,
      announcementBackgroundColor: s.announcementBackgroundColor,
    };
  }

  async enableAnnouncement(
    updatedBy?: string,
    text?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    const updates: Record<string, unknown> = { announcementEnabled: true };
    if (text) updates.announcementText = text;
    return this.updateSettings(updates, updatedBy);
  }

  async disableAnnouncement(
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings({ announcementEnabled: false }, updatedBy);
  }

  async updateAnnouncement(
    updates: Partial<AnnouncementConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings(updates, updatedBy);
  }

  // â”€â”€â”€ Navigation / Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getNavigationConfig(): Promise<NavigationConfig> {
    const s = await this.getSettings();
    return {
      headerStyle: s.headerStyle,
      navShowSearch: s.navShowSearch,
      navShowLanguageSwitcher: s.navShowLanguageSwitcher,
      navShowDarkModeToggle: s.navShowDarkModeToggle,
    };
  }

  async updateNavigation(
    updates: Partial<NavigationConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings(updates, updatedBy);
  }

  // â”€â”€â”€ Appearance / Theme â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getAppearanceConfig(): Promise<AppearanceConfig> {
    const s = await this.getSettings();
    return {
      primaryColor: s.primaryColor,
      secondaryColor: s.secondaryColor,
      accentColor: s.accentColor,
      fontFamily: s.fontFamily,
      headingFontFamily: s.headingFontFamily,
      darkModeEnabled: s.darkModeEnabled,
      darkModeDefault: s.darkModeDefault,
      customCss: s.customCss,
      themeColor: s.themeColor,
    };
  }

  async updateAppearance(
    updates: Partial<AppearanceConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings(updates, updatedBy);
  }

  async enableDarkMode(
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings({ darkModeEnabled: true }, updatedBy);
  }

  async disableDarkMode(
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings({ darkModeEnabled: false }, updatedBy);
  }

  // â”€â”€â”€ CAPTCHA (site-wide provider) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getCaptchaConfig(): Promise<CaptchaConfig> {
    const s = await this.getSettings();
    return {
      captchaEnabled: s.captchaEnabled,
      captchaType: s.captchaType,
      captchaProvider: s.captchaProvider,
      captchaSiteKey: s.captchaSiteKey,
      captchaSecretKey: s.captchaSecretKey,
      captchaThreshold: s.captchaThreshold,
      captchaOnContactForm: s.captchaOnContactForm,
      captchaOnComments: s.captchaOnComments,
      enableTurnstile: s.enableTurnstile,
      enableRecaptchaV3: s.enableRecaptchaV3,
      enableRecaptchaV2: s.enableRecaptchaV2,
      enableHcaptcha: s.enableHcaptcha,
      enableInhouse: s.enableInhouse,
      turnstileSiteKey: s.turnstileSiteKey,
      recaptchaV3SiteKey: s.recaptchaV3SiteKey,
      recaptchaV2SiteKey: s.recaptchaV2SiteKey,
      hcaptchaSiteKey: s.hcaptchaSiteKey,
      inhouseCodeLength: s.inhouseCodeLength,
      requireCaptchaLogin: s.requireCaptchaLogin,
      requireCaptchaRegister: s.requireCaptchaRegister,
      requireCaptchaComment: s.requireCaptchaComment,
      requireCaptchaContact: s.requireCaptchaContact,
    };
  }

  async getCaptchaConfigResponse(): Promise<ApiResponse<CaptchaConfig>> {
    try {
      const config = await this.getCaptchaConfig();
      return {
        success: true,
        data: config,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        success: false,
        error: {
          code: "CAPTCHA_CONFIG_READ_ERROR",
          message: "Failed to read captcha config",
          statusCode: 500,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get the public (non-secret) CAPTCHA config safe for frontend consumption.
   * Excludes the secret key â€” only returns provider, site key, and thresholds.
   */
  async getPublicCaptchaConfig(): Promise<
    Omit<CaptchaConfig, "captchaSecretKey">
  > {
    const cfg = await this.getCaptchaConfig();
    const { captchaSecretKey: _secret, ...publicCfg } = cfg;
    return publicCfg;
  }

  async updateCaptcha(
    updates: Partial<CaptchaConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings(updates, updatedBy);
  }

  /** Check if CAPTCHA is configured and active (provider != 'none' and has keys). */
  isCaptchaActive(): boolean {
    const s = this.cached;
    if (!s) return false;
    return (
      s.captchaProvider !== "none" && !!s.captchaSiteKey && !!s.captchaSecretKey
    );
  }

  // â”€â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getFooterConfig(): Promise<FooterConfig> {
    const s = await this.getSettings();
    return {
      footerText: s.footerText,
      footerShowSocialLinks: s.footerShowSocialLinks,
      footerShowContactInfo: s.footerShowContactInfo,
      footerSecondaryText: s.footerSecondaryText,
    };
  }

  async updateFooter(
    updates: Partial<FooterConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings(updates, updatedBy);
  }

  // â”€â”€â”€ Social Links â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getSocialLinks(): Promise<SocialLinksConfig> {
    const s = await this.getSettings();
    return {
      socialFacebook: s.socialFacebook,
      socialTwitter: s.socialTwitter,
      socialInstagram: s.socialInstagram,
      socialLinkedin: s.socialLinkedin,
      socialYoutube: s.socialYoutube,
      socialWhatsapp: s.socialWhatsapp,
      socialTiktok: s.socialTiktok,
      socialTelegram: s.socialTelegram,
      socialGithub: s.socialGithub,
      socialPinterest: s.socialPinterest,
    };
  }

  async updateSocialLinks(
    updates: Partial<SocialLinksConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings(updates, updatedBy);
  }

  // â”€â”€â”€ SEO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getSeoConfig(): Promise<SeoConfig> {
    const s = await this.getSettings();
    return {
      siteName: s.siteName,
      siteDescription: s.siteDescription,
      siteUrl: s.siteUrl,
      seoTitleTemplate: s.seoTitleTemplate,
      seoDefaultImage: s.seoDefaultImage,
      seoGoogleVerification: s.seoGoogleVerification,
      seoGoogleAnalyticsId: s.seoGoogleAnalyticsId,
      seoBingVerification: s.seoBingVerification,
      seoYandexVerification: s.seoYandexVerification,
      seoPinterestVerification: s.seoPinterestVerification,
      seoBaiduVerification: s.seoBaiduVerification,
    };
  }

  async updateSeo(
    updates: Partial<SeoConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings(updates, updatedBy);
  }

  // â”€â”€â”€ Reading / Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getReadingConfig(): Promise<ReadingConfig> {
    const s = await this.getSettings();
    return {
      postsPerPage: s.postsPerPage,
      excerptLength: s.excerptLength,
      showFullContentInListing: s.showFullContentInListing,
      enableRss: s.enableRss,
      rssFeedTitle: s.rssFeedTitle,
      enableComments: s.enableComments,
      enableSearch: s.enableSearch,
      enableRegistration: s.enableRegistration,
    };
  }

  async updateReading(
    updates: Partial<ReadingConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings(updates, updatedBy);
  }

  async enableComments(
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings({ enableComments: true }, updatedBy);
  }

  async disableComments(
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings({ enableComments: false }, updatedBy);
  }

  async enableRss(
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings({ enableRss: true }, updatedBy);
  }

  async disableRss(
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings({ enableRss: false }, updatedBy);
  }

  async enableSearch(
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings({ enableSearch: true }, updatedBy);
  }

  async disableSearch(
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings({ enableSearch: false }, updatedBy);
  }

  // â”€â”€â”€ Privacy & Legal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getPrivacyConfig(): Promise<PrivacyConfig> {
    const s = await this.getSettings();
    return {
      cookieConsentEnabled: s.cookieConsentEnabled,
      cookieConsentMessage: s.cookieConsentMessage,
      privacyPolicyUrl: s.privacyPolicyUrl,
      termsOfServiceUrl: s.termsOfServiceUrl,
      gdprEnabled: s.gdprEnabled,
    };
  }

  async updatePrivacy(
    updates: Partial<PrivacyConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings(updates, updatedBy);
  }

  async enableCookieConsent(
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings({ cookieConsentEnabled: true }, updatedBy);
  }

  async disableCookieConsent(
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings({ cookieConsentEnabled: false }, updatedBy);
  }

  async enableGdpr(
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings({ gdprEnabled: true }, updatedBy);
  }

  async disableGdpr(
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings({ gdprEnabled: false }, updatedBy);
  }

  // â”€â”€â”€ Email Sender â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getEmailSenderConfig(): Promise<EmailSenderConfig> {
    const s = await this.getSettings();
    return {
      emailFromName: s.emailFromName,
      emailFromAddress: s.emailFromAddress,
      emailReplyTo: s.emailReplyTo,
    };
  }

  async getSmtpConfig(): Promise<import("../types").SmtpConfig> {
    const s = await this.getSettings();
    return {
      smtpHost: s.smtpHost ?? null,
      smtpPort: s.smtpPort ?? 587,
      smtpUser: s.smtpUser ?? null,
      smtpPassword: s.smtpPassword ?? null,
      smtpSecure: s.smtpSecure ?? true,
      emailFromName: s.emailFromName ?? null,
      emailFromAddress: s.emailFromAddress ?? null,
    };
  }

  async getNotificationConfig(): Promise<
    import("../types").EmailNotificationConfig
  > {
    const s = await this.getSettings();
    return {
      emailNotifyOnComment: s.emailNotifyOnComment ?? true,
      emailNotifyOnUser: s.emailNotifyOnUser ?? true,
      emailNotifyOnContact: s.emailNotifyOnContact ?? true,
      emailWelcomeEnabled: s.emailWelcomeEnabled ?? true,
    };
  }

  async getDigestConfig(): Promise<import("../types").EmailDigestConfig> {
    const s = await this.getSettings();
    return {
      emailDigestEnabled: s.emailDigestEnabled ?? false,
      emailDigestFrequency: s.emailDigestFrequency ?? "weekly",
    };
  }

  async updateEmailSender(
    updates: Partial<EmailSenderConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings(updates, updatedBy);
  }

  // â”€â”€â”€ Third-Party Integrations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getIntegrationConfig(): Promise<IntegrationConfig> {
    const s = await this.getSettings();
    return {
      seoGoogleAnalyticsId: s.seoGoogleAnalyticsId,
      googleTagManagerId: s.googleTagManagerId,
      facebookPixelId: s.facebookPixelId,
      hotjarId: s.hotjarId,
      clarityId: s.clarityId,
    };
  }

  async updateIntegrations(
    updates: Partial<IntegrationConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings(updates, updatedBy);
  }

  // â”€â”€â”€ Media â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getMediaConfig(): Promise<MediaConfig> {
    const s = await this.getSettings();
    return {
      maxUploadSizeMb: s.maxUploadSizeMb,
      allowedFileTypes: s.allowedFileTypes,
      imageOptimizationEnabled: s.imageOptimizationEnabled,
    };
  }

  async updateMedia(
    updates: Partial<MediaConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings(updates, updatedBy);
  }

  /**
   * Check if a file extension is allowed for upload.
   * Returns true if `allowedFileTypes` is empty (allow all) or the extension is in the list.
   */
  isFileTypeAllowed(filename: string): boolean {
    const config = this.cached;
    if (!config || !config.allowedFileTypes) return true;
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    if (!ext) return false;
    const allowed = config.allowedFileTypes
      .split(",")
      .map((s) => s.trim().toLowerCase().replace(/^\./, ""))
      .filter(Boolean);
    return allowed.length === 0 || allowed.includes(ext);
  }

  // â”€â”€â”€ Date & Locale â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getDateLocaleConfig(): Promise<DateLocaleConfig> {
    const s = await this.getSettings();
    return {
      language: s.language,
      timezone: s.timezone,
      dateFormat: s.dateFormat,
      timeFormat: s.timeFormat,
      currencyCode: s.currencyCode,
      currencySymbol: s.currencySymbol,
    };
  }

  async updateDateLocale(
    updates: Partial<DateLocaleConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings(updates, updatedBy);
  }

  // â”€â”€â”€ PWA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getPwaConfig(): Promise<PwaConfig> {
    const s = await this.getSettings();
    return {
      pwaEnabled: s.pwaEnabled,
      pwaName: s.pwaName,
      pwaShortName: s.pwaShortName,
      pwaThemeColor: s.pwaThemeColor,
      pwaBackgroundColor: s.pwaBackgroundColor,
    };
  }

  async updatePwa(
    updates: Partial<PwaConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings(updates, updatedBy);
  }

  async enablePwa(
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings({ pwaEnabled: true }, updatedBy);
  }

  async disablePwa(
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings({ pwaEnabled: false }, updatedBy);
  }

  /**
   * Generate a minimal PWA manifest.json from current settings.
   * Returns a plain object ready to be serialised as JSON.
   */
  async generatePwaManifest(): Promise<Record<string, unknown>> {
    const s = await this.getSettings();
    return {
      name: s.pwaName || s.siteName,
      short_name: s.pwaShortName || s.siteName,
      description: s.siteDescription,
      start_url: "/",
      display: "standalone",
      theme_color: s.pwaThemeColor || s.primaryColor || "#3b82f6",
      background_color: s.pwaBackgroundColor || "#ffffff",
      icons: s.logoUrl
        ? [
            { src: s.logoUrl, sizes: "192x192", type: "image/png" },
            { src: s.logoUrl, sizes: "512x512", type: "image/png" },
          ]
        : [],
    };
  }

  // â”€â”€â”€ Robots / Crawling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getRobotsConfig(): Promise<RobotsConfig> {
    const s = await this.getSettings();
    return {
      robotsTxtCustom: s.robotsTxtCustom,
      sitemapEnabled: s.sitemapEnabled,
      sitemapChangeFreq: s.sitemapChangeFreq,
    };
  }

  async updateRobots(
    updates: Partial<RobotsConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings(updates, updatedBy);
  }

  /**
   * Generate a robots.txt string.
   * Returns custom content if set, otherwise auto-generates with sitemap reference.
   */
  async generateRobotsTxt(): Promise<string> {
    const s = await this.getSettings();
    if (s.robotsTxtCustom) return s.robotsTxtCustom;

    const lines = ["User-agent: *", "Allow: /"];
    if (s.sitemapEnabled && s.siteUrl) {
      lines.push("", `Sitemap: ${s.siteUrl}/sitemap.xml`);
    }
    return lines.join("\n");
  }

  // â”€â”€â”€ Maintenance Mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getMaintenanceConfig(): Promise<MaintenanceConfig> {
    const s = await this.getSettings();
    return {
      maintenanceMode: s.maintenanceMode,
      maintenanceMessage: s.maintenanceMessage,
      maintenanceAllowedIps: s.maintenanceAllowedIps,
    };
  }

  async enableMaintenance(
    updatedBy?: string,
    message?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    const updates: Record<string, unknown> = { maintenanceMode: true };
    if (message) updates.maintenanceMessage = message;
    return this.updateSettings(updates, updatedBy);
  }

  async disableMaintenance(
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings({ maintenanceMode: false }, updatedBy);
  }

  /**
   * Check if a given IP address is allowed during maintenance mode.
   * Returns true if maintenance mode is OFF or the IP is in the allowed list.
   */
  async isIpAllowedDuringMaintenance(ip: string): Promise<boolean> {
    const config = await this.getMaintenanceConfig();
    if (!config.maintenanceMode) return true;
    if (!config.maintenanceAllowedIps) return false;
    const allowed = config.maintenanceAllowedIps
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return allowed.includes(ip);
  }

  // â”€â”€â”€ Identity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getIdentityConfig(): Promise<IdentityConfig> {
    const s = await this.getSettings();
    return {
      siteName: s.siteName,
      siteTagline: s.siteTagline,
      siteDescription: s.siteDescription,
      siteUrl: s.siteUrl,
      logoUrl: s.logoUrl,
      logoDarkUrl: s.logoDarkUrl,
      faviconUrl: s.faviconUrl,
      language: s.language,
      timezone: s.timezone,
    };
  }

  async updateIdentity(
    updates: Partial<IdentityConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings(updates, updatedBy);
  }

  // â”€â”€â”€ Contact â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getContactConfig(): Promise<ContactConfig> {
    const s = await this.getSettings();
    return {
      contactEmail: s.contactEmail,
      contactPhone: s.contactPhone,
      contactAddress: s.contactAddress,
    };
  }

  async updateContact(
    updates: Partial<ContactConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings(updates, updatedBy);
  }

  // â”€â”€â”€ Custom Code â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getCustomCodeConfig(): Promise<CustomCodeConfig> {
    const s = await this.getSettings();
    return {
      customHeadCode: s.customHeadCode,
      customFooterCode: s.customFooterCode,
    };
  }

  async updateCustomCode(
    updates: Partial<CustomCodeConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings(updates, updatedBy);
  }

  // â”€â”€â”€ Module Kill Switches â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getModuleKillSwitchConfig(): Promise<ModuleKillSwitchConfig> {
    const s = await this.getSettings();
    return {
      adsEnabled: s.adsEnabled,
      distributionEnabled: s.distributionEnabled,
      captchaEnabled: s.captchaEnabled,
    };
  }

  async updateModuleKillSwitches(
    updates: Partial<ModuleKillSwitchConfig>,
    updatedBy?: string,
  ): Promise<ApiResponse<SiteSystemSettings>> {
    return this.updateSettings(updates, updatedBy);
  }

  // â”€â”€â”€ Admin Bar Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getAdminBarConfig(): Promise<AdminBarConfig> {
    const s = await this.getSettings();
    return {
      adminBarEnabled: s.adminBarEnabled ?? true,
      adminBarShowBreadcrumbs: s.adminBarShowBreadcrumbs ?? true,
      adminBarShowNewButton: s.adminBarShowNewButton ?? true,
      adminBarShowSeoScore: s.adminBarShowSeoScore ?? true,
      adminBarShowStatusToggle: s.adminBarShowStatusToggle ?? true,
      adminBarShowWordCount: s.adminBarShowWordCount ?? true,
      adminBarShowLastSaved: s.adminBarShowLastSaved ?? true,
      adminBarShowSaveButton: s.adminBarShowSaveButton ?? true,
      adminBarShowPublishButton: s.adminBarShowPublishButton ?? true,
      adminBarShowPreviewButton: s.adminBarShowPreviewButton ?? true,
      adminBarShowViewSiteButton: s.adminBarShowViewSiteButton ?? true,
      adminBarShowSiteNameDropdown: s.adminBarShowSiteNameDropdown ?? true,
      adminBarShowUserDropdown: s.adminBarShowUserDropdown ?? true,
      adminBarShowEnvBadge: s.adminBarShowEnvBadge ?? true,
      adminBarBackgroundColor: s.adminBarBackgroundColor ?? "#0d0d18",
      adminBarAccentColor: s.adminBarAccentColor ?? "#6c63ff",
    };
  }

  // â”€â”€â”€ Public Page Config (optimised frontend payload) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Returns a minimal config object safe for public/frontend consumption.
   * Excludes admin-only fields (custom code, integrations IDs, etc.).
   * Useful for SSR/RSC to hydrate the frontend without leaking secrets.
   */
  async getPublicConfig(): Promise<Record<string, unknown>> {
    const s = await this.getSettings();
    return {
      // Identity
      siteName: s.siteName,
      siteTagline: s.siteTagline,
      siteUrl: s.siteUrl,
      logoUrl: s.logoUrl,
      logoDarkUrl: s.logoDarkUrl,
      faviconUrl: s.faviconUrl,
      language: s.language,
      timezone: s.timezone,

      // Appearance
      primaryColor: s.primaryColor,
      secondaryColor: s.secondaryColor,
      accentColor: s.accentColor,
      fontFamily: s.fontFamily,
      headingFontFamily: s.headingFontFamily,
      darkModeEnabled: s.darkModeEnabled,
      darkModeDefault: s.darkModeDefault,
      themeColor: s.themeColor,

      // Date & Locale
      dateFormat: s.dateFormat,
      timeFormat: s.timeFormat,
      currencyCode: s.currencyCode,
      currencySymbol: s.currencySymbol,

      // Top Bar
      topBarEnabled: s.topBarEnabled,
      ...(s.topBarEnabled
        ? {
            topBarPhone: s.topBarPhone,
            topBarEmail: s.topBarEmail,
            topBarAddress: s.topBarAddress,
            topBarText: s.topBarText,
            topBarShowSocialLinks: s.topBarShowSocialLinks,
            topBarBusinessHours: s.topBarBusinessHours,
            topBarBackgroundColor: s.topBarBackgroundColor,
            topBarTextColor: s.topBarTextColor,
            topBarCtaText: s.topBarCtaText,
            topBarCtaUrl: s.topBarCtaUrl,
            topBarDismissible: s.topBarDismissible,
          }
        : {}),

      // Announcement
      announcementEnabled: s.announcementEnabled,
      ...(s.announcementEnabled
        ? {
            announcementText: s.announcementText,
            announcementType: s.announcementType,
            announcementUrl: s.announcementUrl,
            announcementDismissible: s.announcementDismissible,
            announcementBackgroundColor: s.announcementBackgroundColor,
          }
        : {}),

      // Navigation
      headerStyle: s.headerStyle,
      navShowSearch: s.navShowSearch,
      navShowLanguageSwitcher: s.navShowLanguageSwitcher,
      navShowDarkModeToggle: s.navShowDarkModeToggle,

      // Footer
      footerText: s.footerText,
      footerShowSocialLinks: s.footerShowSocialLinks,
      footerShowContactInfo: s.footerShowContactInfo,
      footerSecondaryText: s.footerSecondaryText,

      // Social
      socialFacebook: s.socialFacebook,
      socialTwitter: s.socialTwitter,
      socialInstagram: s.socialInstagram,
      socialLinkedin: s.socialLinkedin,
      socialYoutube: s.socialYoutube,
      socialWhatsapp: s.socialWhatsapp,
      socialTiktok: s.socialTiktok,
      socialTelegram: s.socialTelegram,
      socialGithub: s.socialGithub,
      socialPinterest: s.socialPinterest,

      // Contact
      contactEmail: s.contactEmail,
      contactPhone: s.contactPhone,
      contactAddress: s.contactAddress,

      // Privacy
      cookieConsentEnabled: s.cookieConsentEnabled,
      cookieConsentMessage: s.cookieConsentMessage,
      privacyPolicyUrl: s.privacyPolicyUrl,
      termsOfServiceUrl: s.termsOfServiceUrl,

      // Reading
      enableSearch: s.enableSearch,
      enableComments: s.enableComments,
      enableRegistration: s.enableRegistration,

      // Maintenance
      maintenanceMode: s.maintenanceMode,
      maintenanceMessage: s.maintenanceMessage,

      // CAPTCHA (public â€” no secret key)
      captchaProvider: s.captchaProvider,
      captchaSiteKey: s.captchaSiteKey,
      captchaThreshold: s.captchaThreshold,
      captchaOnContactForm: s.captchaOnContactForm,
      captchaOnComments: s.captchaOnComments,

      // PWA
      pwaEnabled: s.pwaEnabled,
    };
  }

  // â”€â”€â”€ Cache Invalidation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Force reload from DB on next access. */
  invalidateCache(): void {
    this.cached = null;
  }

  // â”€â”€â”€ Internals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private async loadFromDb(): Promise<SiteSystemSettings> {
    const existing = await this.prisma.siteSettings.findFirst();

    if (existing) {
      this.cached = existing as unknown as SiteSystemSettings;
      return this.cached;
    }

    // First run â€” seed with defaults
    const created = await this.prisma.siteSettings.create({
      data: {
        ...DEFAULT_SITE_CONFIG,
        updatedAt: new Date(),
      } as Record<string, unknown>,
    });

    this.cached = created as unknown as SiteSystemSettings;
    return this.cached;
  }

  private settingsToConfig(settings: SiteSystemSettings): SiteConfig {
    const { id: _id, updatedBy: _ub, updatedAt: _ua, ...config } = settings;
    return config as SiteConfig;
  }

  private propagateToConsumers(): void {
    if (!this.cached) return;
    const config = this.settingsToConfig(this.cached);
    for (const consumer of this.consumers) {
      try {
        consumer.updateSiteConfig(config);
      } catch {
        // Consumer errors should not break settings propagation
      }
    }
  }
}
