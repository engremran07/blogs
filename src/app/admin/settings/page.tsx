"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Save, Globe, Palette, MessageSquare, Lock, FileText, Search, Shield, Settings2,
  LayoutGrid, List, Columns, Eye, PanelRight,
  Share2, BookOpen, Navigation, Clock, User, Hash, Image as ImageIcon,
  Moon, Type, Upload, AlertCircle, Trash2, BarChart3, CheckCircle,
  Phone, MapPin, Link2, Megaphone, Mail, Code2, Bell,
  Database, Server, ExternalLink, Cookie, Scale, Edit3, Zap, Power,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/FormFields";
import { toast } from "@/components/ui/Toast";
import Image from "next/image";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SiteSettings {
  [key: string]: unknown;
  siteName: string;
  siteTagline: string | null;
  siteDescription: string | null;
  siteUrl: string | null;
  logoUrl: string | null;
  faviconUrl: string;
  language: string;
  timezone: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  headingFontFamily: string | null;
  darkModeEnabled: boolean;
  darkModeDefault: boolean;
  customCss: string | null;
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
  postsPerPage: number;
  excerptLength: number;
  showFullContentInListing: boolean;
  enableRss: boolean;
  rssFeedTitle: string | null;
  enableComments: boolean;
  enableSearch: boolean;
  enableRegistration: boolean;
  defaultPostStatus: string;
  blogLayout: string;
  blogColumns: number;
  showAuthor: boolean;
  showDate: boolean;
  showReadTime: boolean;
  showTags: boolean;
  showFeaturedImage: boolean;
  showExcerpt: boolean;
  showViewCount: boolean;
  sidebarEnabled: boolean;
  sidebarPosition: string;
  sidebarShowSearch: boolean;
  sidebarShowRecentPosts: boolean;
  sidebarShowCategories: boolean;
  sidebarShowTags: boolean;
  sidebarShowArchive: boolean;
  sidebarRecentPostsCount: number;
  relatedPostsEnabled: boolean;
  relatedPostsCount: number;
  socialSharingEnabled: boolean;
  tableOfContentsEnabled: boolean;
  showPostNavigation: boolean;
  enableCommentModeration: boolean;
  autoApproveComments: boolean;
  enableCommentVoting: boolean;
  enableCommentThreading: boolean;
  allowGuestComments: boolean;
  maxReplyDepth: number;
  closeCommentsAfterDays: number;
  editWindowMinutes: number;
  seoGoogleAnalyticsId: string | null;
  robotsTxtCustom: string | null;
  seoGoogleVerification: string | null;
  seoBingVerification: string | null;
  seoYandexVerification: string | null;
  seoPinterestVerification: string | null;
  seoBaiduVerification: string | null;
  customHeadCode: string | null;
  smtpHost: string | null;
  smtpPort: number;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpSecure: boolean;
  emailFromName: string | null;
  emailFromAddress: string | null;
  emailReplyTo: string | null;
  emailNotifyOnComment: boolean;
  emailNotifyOnUser: boolean;
  emailNotifyOnContact: boolean;
  emailWelcomeEnabled: boolean;
  emailDigestEnabled: boolean;
  emailDigestFrequency: string;
  socialFacebook: string | null;
  socialTwitter: string | null;
  socialInstagram: string | null;
  socialLinkedin: string | null;
  socialYoutube: string | null;
  socialGithub: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  footerText: string | null;
  footerShowSocialLinks: boolean;
  customFooterCode: string | null;
  captchaEnabled: boolean;
  captchaType: string;
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
  // Privacy & Legal
  cookieConsentEnabled: boolean;
  cookieConsentMessage: string;
  privacyPolicyUrl: string | null;
  termsOfServiceUrl: string | null;
  gdprEnabled: boolean;
}

// ─── Tab Configuration ──────────────────────────────────────────────────────

const TABS = [
  { key: "general",    label: "General",    icon: <Globe className="h-4 w-4" /> },
  { key: "appearance", label: "Appearance", icon: <Palette className="h-4 w-4" /> },
  { key: "content",    label: "Content",    icon: <FileText className="h-4 w-4" /> },
  { key: "comments",   label: "Comments",   icon: <MessageSquare className="h-4 w-4" /> },
  { key: "social",     label: "Social",     icon: <Share2 className="h-4 w-4" /> },
  { key: "seo",        label: "SEO",        icon: <Search className="h-4 w-4" /> },
  { key: "email",      label: "Email",      icon: <Mail className="h-4 w-4" /> },
  { key: "security",   label: "Security",   icon: <Shield className="h-4 w-4" /> },
  { key: "privacy",    label: "Privacy",    icon: <Cookie className="h-4 w-4" /> },
  { key: "editor",     label: "Editor",     icon: <Edit3 className="h-4 w-4" /> },
  { key: "advanced",   label: "Advanced",   icon: <Code2 className="h-4 w-4" /> },
] as const;

// ─── Reusable Components ────────────────────────────────────────────────────

function Section({ title, description, icon, children }: {
  title: string; description?: string; icon?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800/50">
      <div className="mb-5">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
          {icon} {title}
        </h3>
        {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function ToggleCard({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/30">
      <div className="relative mt-0.5 shrink-0">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <div className="h-5 w-9 rounded-full bg-gray-300 transition-colors peer-checked:bg-blue-600 dark:bg-gray-600 peer-checked:dark:bg-blue-500" />
        <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
    </label>
  );
}

function ColorPicker({ label, value, fallback, onChange }: {
  label: string; value: string; fallback: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || fallback}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 cursor-pointer rounded-lg border border-gray-200 p-0.5 dark:border-gray-600"
        />
        <Input value={value || fallback} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function FileDropZone({ label, value, accept, purpose, onUploaded, onRemove, previewSize = "h-20 w-20" }: {
  label: string; value: string | null; accept: string; purpose: string;
  onUploaded: (url: string) => void; onRemove: () => void; previewSize?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", purpose);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        onUploaded(data.data.url);
        toast(`${label} uploaded!`, "success");
      } else {
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }, [label, purpose, onUploaded]);

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-all ${
          dragging ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
        }`}
      >
        <input ref={inputRef} type="file" accept={accept} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} className="hidden" />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="text-xs text-gray-500">Uploading…</p>
          </div>
        ) : value ? (
          <div className="flex items-center gap-4">
            <div className={`${previewSize} shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700`}>
              <Image src={value} alt={label} className="h-full w-full object-contain" width={200} height={200} unoptimized />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">{value}</p>
              <p className="text-xs text-gray-500">Drop or click to replace</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="shrink-0 rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Remove">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-3">
            <Upload className="h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-medium text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-gray-400">PNG, JPG, SVG, ICO, WEBP — max 5 MB</p>
          </div>
        )}
      </div>
      {error && <p className="mt-1 flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3" /> {error}</p>}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [hasChanges, setHasChanges] = useState(false);
  const originalRef = useRef<string>("");

  // ── Editor Settings (separate API) ───────────────────────────────────
  const [editorSettings, setEditorSettings] = useState<Record<string, unknown> | null>(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorHasChanges, setEditorHasChanges] = useState(false);
  const editorOrigRef = useRef<string>("");
  const editorFetched = useRef(false);

  async function fetchEditorSettings() {
    if (editorFetched.current) return;
    setEditorLoading(true);
    try {
      const res = await fetch("/api/settings/editor");
      const data = await res.json();
      if (data.success && data.data?.settings) {
        setEditorSettings(data.data.settings);
        editorOrigRef.current = JSON.stringify(data.data.settings);
        editorFetched.current = true;
      }
    } catch {
      toast("Failed to load editor settings", "error");
    } finally {
      setEditorLoading(false);
    }
  }

  function updateEditor(key: string, value: unknown) {
    setEditorSettings((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      setEditorHasChanges(JSON.stringify(next) !== editorOrigRef.current);
      return next;
    });
  }

  async function handleSaveEditor() {
    if (!editorSettings) return;
    setEditorSaving(true);
    try {
      const res = await fetch("/api/settings/editor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editorSettings),
      });
      const data = await res.json();
      if (data.success) {
        toast("Editor settings saved!", "success");
        if (data.data) {
          setEditorSettings(data.data);
          editorOrigRef.current = JSON.stringify(data.data);
        }
        setEditorHasChanges(false);
      } else {
        toast(data.error || "Failed to save editor settings", "error");
      }
    } catch {
      toast("Failed to save editor settings", "error");
    } finally {
      setEditorSaving(false);
    }
  }

  async function editorAction(action: string, label: string) {
    try {
      const res = await fetch("/api/settings/editor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        toast(`${label} applied!`, "success");
        editorFetched.current = false;
        fetchEditorSettings();
      } else {
        toast(data.error || `Failed to apply ${label}`, "error");
      }
    } catch {
      toast(`Failed to apply ${label}`, "error");
    }
  }

  // Fetch editor settings when tab is first opened
  useEffect(() => {
    if (activeTab === "editor") fetchEditorSettings();
  }, [activeTab]);

  useEffect(() => { fetchSettings(); }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.data) {
        setSettings(data.data);
        originalRef.current = JSON.stringify(data.data);
      }
    } catch {
      toast("Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  }

  function update(key: string, value: unknown) {
    setSettings((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      setHasChanges(JSON.stringify(next) !== originalRef.current);
      return next;
    });
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast("Settings saved successfully!", "success");
        setSettings(data.data);
        originalRef.current = JSON.stringify(data.data);
        setHasChanges(false);
      } else {
        toast(data.error || "Failed to save", "error");
      }
    } catch {
      toast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading settings…</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <Database className="h-12 w-12 text-gray-400" />
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">No settings found</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">The database may need to be seeded first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Registration OFF banner */}
      {settings && settings.enableRegistration === false && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span><strong>User registration is currently OFF.</strong> New users cannot create accounts. You can re-enable it under <em>General → Localization</em>.</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <Settings2 className="h-6 w-6" /> Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your site configuration and preferences
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
            </span>
          )}
          <Button onClick={handleSave} loading={saving} disabled={!hasChanges && !saving} icon={<Save className="h-4 w-4" />}>
            Save Changes
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <nav className="inline-flex min-w-full gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6 pb-12">

        {/* ═══ GENERAL ═══ */}
        {activeTab === "general" && (
          <>
            <Section title="Site Identity" icon={<Globe className="h-5 w-5 text-blue-500" />} description="Basic information about your site">
              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="Site Name" value={settings.siteName || ""} onChange={(e) => update("siteName", e.target.value)} />
                <Input label="Tagline" value={settings.siteTagline || ""} onChange={(e) => update("siteTagline", e.target.value)} />
              </div>
              <div className="mt-4">
                <Textarea label="Site Description" value={settings.siteDescription || ""} onChange={(e) => update("siteDescription", e.target.value)} rows={3} hint="Used for SEO and meta descriptions" />
              </div>
              <div className="mt-4">
                <Input label="Site URL" value={settings.siteUrl || ""} onChange={(e) => update("siteUrl", e.target.value)} placeholder="https://yourblog.com" />
              </div>
            </Section>

            <Section title="Logo & Favicon" icon={<ImageIcon className="h-5 w-5 text-purple-500" />} description="Upload your brand assets">
              <div className="grid gap-6 sm:grid-cols-2">
                <FileDropZone label="Site Logo" value={settings.logoUrl || null} accept="image/png,image/jpeg,image/svg+xml,image/webp" purpose="branding" onUploaded={(url) => update("logoUrl", url)} onRemove={() => update("logoUrl", null)} previewSize="h-16 w-32" />
                <FileDropZone label="Favicon" value={settings.faviconUrl || null} accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml" purpose="branding" onUploaded={(url) => update("faviconUrl", url)} onRemove={() => update("faviconUrl", "/favicon.ico")} previewSize="h-12 w-12" />
              </div>
            </Section>

            <Section title="Localization" icon={<Globe className="h-5 w-5 text-green-500" />} description="Language, timezone, and regional preferences">
              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="Language" value={settings.language || "en"} onChange={(e) => update("language", e.target.value)} />
                <Input label="Timezone" value={settings.timezone || "UTC"} onChange={(e) => update("timezone", e.target.value)} />
              </div>
              <div className="mt-4">
                <ToggleCard label="Enable user registration" description="Allow new users to create accounts on your site" checked={settings.enableRegistration ?? true} onChange={(v) => update("enableRegistration", v)} />
              </div>
            </Section>
          </>
        )}

        {/* ═══ APPEARANCE ═══ */}
        {activeTab === "appearance" && (
          <>
            <Section title="Brand Colors" icon={<Palette className="h-5 w-5 text-pink-500" />} description="Define your site color palette">
              <div className="grid gap-6 sm:grid-cols-3">
                <ColorPicker label="Primary" value={settings.primaryColor} fallback="#3b82f6" onChange={(v) => update("primaryColor", v)} />
                <ColorPicker label="Secondary" value={settings.secondaryColor} fallback="#64748b" onChange={(v) => update("secondaryColor", v)} />
                <ColorPicker label="Accent" value={settings.accentColor} fallback="#f59e0b" onChange={(v) => update("accentColor", v)} />
              </div>
              <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <p className="mb-2 text-xs font-medium text-gray-500">Color Preview</p>
                <div className="flex gap-3">
                  {[settings.primaryColor || "#3b82f6", settings.secondaryColor || "#64748b", settings.accentColor || "#f59e0b"].map((c, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className="h-12 w-12 rounded-lg shadow-sm" style={{ backgroundColor: c }} />
                      <span className="font-mono text-[10px] text-gray-400">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Typography" icon={<Type className="h-5 w-5 text-indigo-500" />} description="Choose fonts for your site">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Select label="Body Font" value={settings.fontFamily || "system-ui, sans-serif"} onChange={(e) => update("fontFamily", e.target.value)}>
                    <option value="system-ui, sans-serif">System Default</option>
                    <option value="'Inter', sans-serif">Inter</option>
                    <option value="'Roboto', sans-serif">Roboto</option>
                    <option value="'Open Sans', sans-serif">Open Sans</option>
                    <option value="'Lato', sans-serif">Lato</option>
                    <option value="'Poppins', sans-serif">Poppins</option>
                    <option value="'Nunito', sans-serif">Nunito</option>
                    <option value="Georgia, serif">Georgia (Serif)</option>
                    <option value="'Merriweather', serif">Merriweather (Serif)</option>
                    <option value="'Playfair Display', serif">Playfair Display (Serif)</option>
                  </Select>
                  <p className="mt-1.5 text-xs text-gray-400" style={{ fontFamily: settings.fontFamily || "system-ui" }}>The quick brown fox jumps over the lazy dog</p>
                </div>
                <div>
                  <Select label="Heading Font" value={settings.headingFontFamily || ""} onChange={(e) => update("headingFontFamily", e.target.value || null)}>
                    <option value="">Same as body</option>
                    <option value="'Inter', sans-serif">Inter</option>
                    <option value="'Poppins', sans-serif">Poppins</option>
                    <option value="'Montserrat', sans-serif">Montserrat</option>
                    <option value="'Playfair Display', serif">Playfair Display</option>
                    <option value="'Merriweather', serif">Merriweather</option>
                    <option value="Georgia, serif">Georgia</option>
                  </Select>
                  <p className="mt-1.5 text-xs text-gray-400" style={{ fontFamily: settings.headingFontFamily || settings.fontFamily || "system-ui" }}><strong>Heading Preview: Article Title</strong></p>
                </div>
              </div>
            </Section>

            <Section title="Dark Mode" icon={<Moon className="h-5 w-5 text-yellow-500" />} description="Configure dark mode behavior">
              <div className="grid gap-4 sm:grid-cols-2">
                <ToggleCard label="Allow dark mode toggle" description="Visitors can switch between light and dark modes" checked={settings.darkModeEnabled ?? true} onChange={(v) => update("darkModeEnabled", v)} />
                <ToggleCard label="Default to dark mode" description="New visitors see dark mode by default" checked={settings.darkModeDefault ?? false} onChange={(v) => update("darkModeDefault", v)} />
              </div>
            </Section>

            <Section title="Top Bar" icon={<Megaphone className="h-5 w-5 text-emerald-500" />} description="A slim utility bar above the site header">
              <ToggleCard label="Enable Top Bar" description="Show a utility bar above the site header on all public pages" checked={settings.topBarEnabled ?? false} onChange={(v) => update("topBarEnabled", v)} />
              {settings.topBarEnabled && (
                <div className="mt-5 space-y-5 rounded-lg border border-gray-200 bg-gray-50/50 p-5 dark:border-gray-700 dark:bg-gray-800/30">
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"><Phone className="h-4 w-4" /> Contact Information</h4>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Input label="Phone" value={settings.topBarPhone || ""} onChange={(e) => update("topBarPhone", e.target.value || null)} placeholder="+1 (555) 123-4567" />
                      <Input label="Email" value={settings.topBarEmail || ""} onChange={(e) => update("topBarEmail", e.target.value || null)} placeholder="hello@example.com" />
                      <Input label="Address" value={settings.topBarAddress || ""} onChange={(e) => update("topBarAddress", e.target.value || null)} placeholder="123 Main St, City" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Custom Text" value={settings.topBarText || ""} onChange={(e) => update("topBarText", e.target.value || null)} placeholder="Welcome to our blog!" />
                    <Input label="Business Hours" value={settings.topBarBusinessHours || ""} onChange={(e) => update("topBarBusinessHours", e.target.value || null)} placeholder="Mon-Fri 9am-5pm" />
                  </div>
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"><Link2 className="h-4 w-4" /> Call to Action</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input label="CTA Button Text" value={settings.topBarCtaText || ""} onChange={(e) => update("topBarCtaText", e.target.value || null)} placeholder="Subscribe Now" />
                      <Input label="CTA URL" value={settings.topBarCtaUrl || ""} onChange={(e) => update("topBarCtaUrl", e.target.value || null)} placeholder="/subscribe" />
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Bar Styling</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ColorPicker label="Background Color" value={settings.topBarBackgroundColor} fallback="#1a1a2e" onChange={(v) => update("topBarBackgroundColor", v)} />
                      <ColorPicker label="Text Color" value={settings.topBarTextColor} fallback="#ffffff" onChange={(v) => update("topBarTextColor", v)} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ToggleCard label="Show social links" checked={settings.topBarShowSocialLinks ?? false} onChange={(v) => update("topBarShowSocialLinks", v)} />
                    <ToggleCard label="Allow visitors to dismiss" checked={settings.topBarDismissible ?? false} onChange={(v) => update("topBarDismissible", v)} />
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-600">
                    <p className="mb-2 text-xs font-medium text-gray-400">Live Preview</p>
                    <div className="flex items-center justify-between gap-4 rounded-lg px-4 py-2 text-xs" style={{ backgroundColor: settings.topBarBackgroundColor || "#1a1a2e", color: settings.topBarTextColor || "#ffffff" }}>
                      <div className="flex items-center gap-4">
                        {settings.topBarPhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {settings.topBarPhone}</span>}
                        {settings.topBarEmail && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {settings.topBarEmail}</span>}
                        {settings.topBarAddress && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {settings.topBarAddress}</span>}
                      </div>
                      <div className="flex items-center gap-4">
                        {settings.topBarText && <span>{settings.topBarText}</span>}
                        {settings.topBarBusinessHours && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {settings.topBarBusinessHours}</span>}
                        {settings.topBarCtaText && <span className="rounded px-2 py-0.5 font-semibold" style={{ backgroundColor: settings.topBarTextColor || "#fff", color: settings.topBarBackgroundColor || "#1a1a2e" }}>{settings.topBarCtaText}</span>}
                        {settings.topBarDismissible && <span className="cursor-pointer opacity-60">&times;</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Section>

            <Section title="Custom CSS" icon={<Code2 className="h-5 w-5 text-gray-500" />} description="Custom styles applied globally after default styles">
              <Textarea label="Custom Stylesheet" value={settings.customCss || ""} onChange={(e) => update("customCss", e.target.value || null)} rows={6} />
            </Section>
          </>
        )}

        {/* ═══ CONTENT ═══ */}
        {activeTab === "content" && (
          <>
            <Section title="Blog Layout" icon={<LayoutGrid className="h-5 w-5 text-purple-500" />} description="How posts appear on listing pages">
              <div className="mb-5">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Layout Style</label>
                <div className="flex gap-3">
                  {[
                    { value: "grid", label: "Grid", icon: <LayoutGrid className="h-5 w-5" /> },
                    { value: "list", label: "List", icon: <List className="h-5 w-5" /> },
                    { value: "masonry", label: "Masonry", icon: <Columns className="h-5 w-5" /> },
                  ].map((opt) => (
                    <button key={opt.value} onClick={() => update("blogLayout", opt.value)} className={`flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 text-sm font-medium transition-all ${(settings.blogLayout || "grid") === opt.value ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-300" : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400"}`}>
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Columns ({settings.blogColumns || 2})</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min="1" max="4" value={settings.blogColumns || 2} onChange={(e) => update("blogColumns", parseInt(e.target.value, 10))} className="flex-1 accent-blue-600" />
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((n) => (
                        <button key={n} onClick={() => update("blogColumns", n)} className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${(settings.blogColumns || 2) === n ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"}`}>{n}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <Select label="Default Post Status" value={settings.defaultPostStatus || "DRAFT"} onChange={(e) => update("defaultPostStatus", e.target.value)}>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </Select>
              </div>
            </Section>

            <Section title="Post Card Display" icon={<Eye className="h-5 w-5 text-green-500" />} description="Choose what elements appear on post cards">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { key: "showFeaturedImage", label: "Featured Image", icon: <ImageIcon className="h-4 w-4" /> },
                  { key: "showExcerpt", label: "Excerpt", icon: <FileText className="h-4 w-4" /> },
                  { key: "showAuthor", label: "Author", icon: <User className="h-4 w-4" /> },
                  { key: "showDate", label: "Publish Date", icon: <Clock className="h-4 w-4" /> },
                  { key: "showReadTime", label: "Read Time", icon: <BookOpen className="h-4 w-4" /> },
                  { key: "showTags", label: "Tags", icon: <Hash className="h-4 w-4" /> },
                  { key: "showViewCount", label: "View Count", icon: <Eye className="h-4 w-4" /> },
                  { key: "showFullContentInListing", label: "Full Content", icon: <FileText className="h-4 w-4" /> },
                ].map((item) => (
                  <label key={item.key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/30">
                    <input type="checkbox" checked={(settings[item.key] as boolean) ?? true} onChange={(e) => update(item.key, e.target.checked)} className="rounded border-gray-300 text-blue-600" />
                    <span className="text-gray-400">{item.icon}</span>
                    {item.label}
                  </label>
                ))}
              </div>
            </Section>

            <Section title="Reading" icon={<BookOpen className="h-5 w-5 text-orange-500" />} description="Content display and feed settings">
              <div className="grid gap-5 sm:grid-cols-3">
                <Input label="Posts Per Page" type="number" value={String(settings.postsPerPage || 10)} onChange={(e) => update("postsPerPage", parseInt(e.target.value, 10) || 10)} />
                <Input label="Excerpt Length (chars)" type="number" value={String(settings.excerptLength || 300)} onChange={(e) => update("excerptLength", parseInt(e.target.value, 10) || 300)} />
                <Input label="RSS Feed Title" value={settings.rssFeedTitle || ""} onChange={(e) => update("rssFeedTitle", e.target.value || null)} placeholder="Uses site name if blank" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ToggleCard label="Enable RSS Feed" description="Generate an RSS feed for your posts" checked={settings.enableRss ?? true} onChange={(v) => update("enableRss", v)} />
                <ToggleCard label="Enable Site Search" description="Allow visitors to search your content" checked={settings.enableSearch ?? true} onChange={(v) => update("enableSearch", v)} />
              </div>
            </Section>

            <Section title="Sidebar" icon={<PanelRight className="h-5 w-5 text-indigo-500" />} description="Blog sidebar configuration">
              <ToggleCard label="Enable sidebar" description="Show a sidebar on blog listing and post pages" checked={settings.sidebarEnabled ?? true} onChange={(v) => update("sidebarEnabled", v)} />
              {settings.sidebarEnabled && (
                <div className="mt-4 space-y-4">
                  <Select label="Sidebar Position" value={settings.sidebarPosition || "right"} onChange={(e) => update("sidebarPosition", e.target.value)}>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </Select>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      { key: "sidebarShowSearch", label: "Search Box" },
                      { key: "sidebarShowRecentPosts", label: "Recent Posts" },
                      { key: "sidebarShowCategories", label: "Categories" },
                      { key: "sidebarShowTags", label: "Tag Cloud" },
                      { key: "sidebarShowArchive", label: "Archive" },
                    ].map((w) => (
                      <label key={w.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/30">
                        <input type="checkbox" checked={(settings[w.key] as boolean) ?? false} onChange={(e) => update(w.key, e.target.checked)} className="rounded border-gray-300 text-blue-600" />
                        {w.label}
                      </label>
                    ))}
                  </div>
                  <Input label="Recent Posts Count" type="number" value={String(settings.sidebarRecentPostsCount || 5)} onChange={(e) => update("sidebarRecentPostsCount", parseInt(e.target.value, 10) || 5)} />
                </div>
              )}
            </Section>

            <Section title="Single Post & Engagement" icon={<Share2 className="h-5 w-5 text-pink-500" />} description="Options for individual post pages">
              <div className="grid gap-3 sm:grid-cols-2">
                <ToggleCard label="Show related posts" checked={settings.relatedPostsEnabled ?? true} onChange={(v) => update("relatedPostsEnabled", v)} />
                <ToggleCard label="Social share buttons" checked={settings.socialSharingEnabled ?? true} onChange={(v) => update("socialSharingEnabled", v)} />
                <ToggleCard label="Table of contents" checked={settings.tableOfContentsEnabled ?? false} onChange={(v) => update("tableOfContentsEnabled", v)} />
                <ToggleCard label="Previous / Next navigation" checked={settings.showPostNavigation ?? true} onChange={(v) => update("showPostNavigation", v)} />
              </div>
              {settings.relatedPostsEnabled && (
                <div className="mt-4">
                  <Input label="Number of Related Posts" type="number" value={String(settings.relatedPostsCount || 3)} onChange={(e) => update("relatedPostsCount", parseInt(e.target.value, 10) || 3)} />
                </div>
              )}
            </Section>
          </>
        )}

        {/* ═══ COMMENTS ═══ */}
        {activeTab === "comments" && (
          <>
            <Section title="Comment System" icon={<MessageSquare className="h-5 w-5 text-blue-500" />} description="Configure how comments work on your site">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { key: "enableComments", label: "Enable comments globally", desc: "Turn comments on/off across the entire site" },
                  { key: "enableCommentModeration", label: "Moderate before publishing", desc: "New comments require admin approval" },
                  { key: "autoApproveComments", label: "Auto-approve registered users", desc: "Skip moderation for logged-in users" },
                  { key: "enableCommentVoting", label: "Enable comment voting", desc: "Allow upvote/downvote on comments" },
                  { key: "enableCommentThreading", label: "Enable threading", desc: "Allow nested replies to comments" },
                  { key: "allowGuestComments", label: "Allow guest comments", desc: "Non-registered users can comment" },
                ].map((item) => (
                  <ToggleCard key={item.key} label={item.label} description={item.desc} checked={(settings[item.key] as boolean) ?? true} onChange={(v) => update(item.key, v)} />
                ))}
              </div>
            </Section>

            <Section title="Comment Limits" icon={<Settings2 className="h-5 w-5 text-gray-500" />} description="Fine-tune comment behavior">
              <div className="grid gap-5 sm:grid-cols-3">
                <Input label="Max Reply Depth" type="number" value={String(settings.maxReplyDepth || 5)} onChange={(e) => update("maxReplyDepth", parseInt(e.target.value, 10) || 5)} hint="Maximum nesting level" />
                <Input label="Close After (days)" type="number" value={String(settings.closeCommentsAfterDays || 0)} onChange={(e) => update("closeCommentsAfterDays", parseInt(e.target.value, 10) || 0)} hint="0 = never close" />
                <Input label="Edit Window (min)" type="number" value={String(settings.editWindowMinutes || 30)} onChange={(e) => update("editWindowMinutes", parseInt(e.target.value, 10) || 30)} hint="Time users can edit" />
              </div>
            </Section>
          </>
        )}

        {/* ═══ SOCIAL ═══ */}
        {activeTab === "social" && (
          <>
            <Section title="Social Links" icon={<ExternalLink className="h-5 w-5 text-blue-500" />} description="Social media profile URLs shown in top bar and footer">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { key: "socialFacebook", label: "Facebook", ph: "https://facebook.com/yourpage" },
                  { key: "socialTwitter", label: "Twitter / X", ph: "https://x.com/yourhandle" },
                  { key: "socialInstagram", label: "Instagram", ph: "https://instagram.com/yourhandle" },
                  { key: "socialLinkedin", label: "LinkedIn", ph: "https://linkedin.com/in/yourprofile" },
                  { key: "socialYoutube", label: "YouTube", ph: "https://youtube.com/@yourchannel" },
                  { key: "socialGithub", label: "GitHub", ph: "https://github.com/youruser" },
                ].map((s) => (
                  <Input key={s.key} label={s.label} value={(settings[s.key] as string) || ""} onChange={(e) => update(s.key, e.target.value || null)} placeholder={s.ph} />
                ))}
              </div>
            </Section>

            <Section title="Contact Information" icon={<Phone className="h-5 w-5 text-green-500" />} description="Public contact info for the contact page and footer">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Contact Email" value={settings.contactEmail || ""} onChange={(e) => update("contactEmail", e.target.value || null)} placeholder="hello@myblog.com" />
                <Input label="Contact Phone" value={settings.contactPhone || ""} onChange={(e) => update("contactPhone", e.target.value || null)} placeholder="+1 555-0100" />
              </div>
            </Section>

            <Section title="Footer" icon={<Navigation className="h-5 w-5 text-gray-500" />} description="Configure your site footer">
              <div className="space-y-4">
                <Input label="Footer Text" value={settings.footerText || ""} onChange={(e) => update("footerText", e.target.value || null)} placeholder="© 2026 My Blog. All rights reserved." />
                <ToggleCard label="Show social links in footer" checked={settings.footerShowSocialLinks ?? true} onChange={(v) => update("footerShowSocialLinks", v)} />
                <Textarea label="Footer Custom Code" value={settings.customFooterCode || ""} onChange={(e) => update("customFooterCode", e.target.value || null)} rows={3} hint="HTML/JS injected before </body>" />
              </div>
            </Section>
          </>
        )}

        {/* ═══ SEO ═══ */}
        {activeTab === "seo" && (
          <>
            <Section title="Analytics" icon={<BarChart3 className="h-5 w-5 text-blue-500" />} description="Configure analytics tracking">
              <Input label="Google Analytics ID" value={settings.seoGoogleAnalyticsId || ""} onChange={(e) => update("seoGoogleAnalyticsId", e.target.value)} placeholder="G-XXXXXXXXXX" />
            </Section>

            <Section title="Site Verification" icon={<CheckCircle className="h-5 w-5 text-green-500" />} description="Search engine verification codes (content value from meta tag)">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { key: "seoGoogleVerification", label: "Google Search Console", meta: "google-site-verification" },
                  { key: "seoBingVerification", label: "Bing Webmaster Tools", meta: "msvalidate.01" },
                  { key: "seoYandexVerification", label: "Yandex Webmaster", meta: "yandex-verification" },
                  { key: "seoPinterestVerification", label: "Pinterest", meta: "p:domain_verify" },
                  { key: "seoBaiduVerification", label: "Baidu Webmaster", meta: "baidu-site-verification" },
                ].map((v) => (
                  <div key={v.key}>
                    <Input label={v.label} value={(settings[v.key] as string) || ""} onChange={(e) => update(v.key, e.target.value || null)} placeholder={`${v.meta} content value`} />
                    <p className="mt-1 font-mono text-[10px] text-gray-400">meta name=&quot;{v.meta}&quot;</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Robots.txt" icon={<Server className="h-5 w-5 text-gray-500" />} description="Custom robots.txt content (leave blank for default)">
              <Textarea label="Custom robots.txt" value={settings.robotsTxtCustom || ""} onChange={(e) => update("robotsTxtCustom", e.target.value)} rows={8} />
            </Section>

            <Section title="Custom Head Code" icon={<Code2 className="h-5 w-5 text-orange-500" />} description="Additional HTML/scripts injected into <head>">
              <Textarea label="Custom <head> code" value={settings.customHeadCode || ""} onChange={(e) => update("customHeadCode", e.target.value || null)} rows={5} />
            </Section>
          </>
        )}

        {/* ═══ EMAIL ═══ */}
        {activeTab === "email" && (
          <>
            <Section title="SMTP Server" icon={<Server className="h-5 w-5 text-blue-500" />} description="Mail server for transactional emails">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="SMTP Host" value={settings.smtpHost || ""} onChange={(e) => update("smtpHost", e.target.value || null)} placeholder="smtp.gmail.com" />
                <Input label="SMTP Port" type="number" value={String(settings.smtpPort || 587)} onChange={(e) => update("smtpPort", parseInt(e.target.value, 10) || 587)} />
                <Input label="SMTP Username" value={settings.smtpUser || ""} onChange={(e) => update("smtpUser", e.target.value || null)} placeholder="your@email.com" />
                <Input label="SMTP Password" type="password" value={settings.smtpPassword || ""} onChange={(e) => update("smtpPassword", e.target.value || null)} placeholder="••••••••" />
              </div>
              <div className="mt-4">
                <ToggleCard label="Use TLS/SSL encryption" description="Encrypt mail server connection" checked={settings.smtpSecure ?? true} onChange={(v) => update("smtpSecure", v)} />
              </div>
            </Section>

            <Section title="Sender Details" icon={<User className="h-5 w-5 text-green-500" />} description="Default from address for outgoing emails">
              <div className="grid gap-4 sm:grid-cols-3">
                <Input label="From Name" value={settings.emailFromName || ""} onChange={(e) => update("emailFromName", e.target.value || null)} placeholder="My Blog" />
                <Input label="From Email" type="email" value={settings.emailFromAddress || ""} onChange={(e) => update("emailFromAddress", e.target.value || null)} placeholder="noreply@myblog.com" />
                <Input label="Reply-To" type="email" value={settings.emailReplyTo || ""} onChange={(e) => update("emailReplyTo", e.target.value || null)} placeholder="hello@myblog.com" />
              </div>
            </Section>

            <Section title="Notifications" icon={<Bell className="h-5 w-5 text-orange-500" />} description="Events that trigger admin email notifications">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { key: "emailNotifyOnComment", label: "New comment received", desc: "Get notified when a new comment is posted" },
                  { key: "emailNotifyOnUser", label: "New user registration", desc: "Get notified when a new user signs up" },
                  { key: "emailNotifyOnContact", label: "Contact form submission", desc: "Get notified for contact form submissions" },
                  { key: "emailWelcomeEnabled", label: "Send welcome email", desc: "Auto-send welcome email after registration" },
                ].map((item) => (
                  <ToggleCard key={item.key} label={item.label} description={item.desc} checked={(settings[item.key] as boolean) ?? true} onChange={(v) => update(item.key, v)} />
                ))}
              </div>
            </Section>

            <Section title="Email Digest" icon={<BookOpen className="h-5 w-5 text-purple-500" />} description="Periodic content summaries for subscribers">
              <ToggleCard label="Enable email digest" description="Send periodic summary of new posts" checked={settings.emailDigestEnabled ?? false} onChange={(v) => update("emailDigestEnabled", v)} />
              {settings.emailDigestEnabled && (
                <div className="mt-4">
                  <Select label="Digest Frequency" value={settings.emailDigestFrequency || "weekly"} onChange={(e) => update("emailDigestFrequency", e.target.value)}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </Select>
                </div>
              )}
            </Section>
          </>
        )}

        {/* ═══ SECURITY ═══ */}
        {activeTab === "security" && (
          <>
            <Section title="CAPTCHA System" icon={<Shield className="h-5 w-5 text-red-500" />} description="Protect your forms from spam and abuse">
              <ToggleCard label="Enable CAPTCHA globally" description="When disabled, all forms skip verification (kill switch)" checked={settings.captchaEnabled ?? false} onChange={(v) => update("captchaEnabled", v)} />
            </Section>

            {(settings.captchaEnabled ?? false) && (
              <>
                <Section title="Default Provider" icon={<Settings2 className="h-5 w-5 text-gray-500" />} description="Primary CAPTCHA provider — falls back to next enabled provider on failure">
                  <Select label="Default CAPTCHA Provider" value={settings.captchaType || "turnstile"} onChange={(e) => update("captchaType", e.target.value)}>
                    <option value="turnstile">Cloudflare Turnstile</option>
                    <option value="recaptcha-v3">Google reCAPTCHA v3 (invisible)</option>
                    <option value="recaptcha-v2">Google reCAPTCHA v2 (checkbox)</option>
                    <option value="hcaptcha">hCaptcha</option>
                    <option value="custom">In-house CAPTCHA</option>
                  </Select>
                </Section>

                <Section title="Provider Toggles" icon={<Lock className="h-5 w-5 text-yellow-500" />} description="Enable or disable providers in the fallback chain">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { key: "enableTurnstile", label: "Cloudflare Turnstile" },
                      { key: "enableRecaptchaV3", label: "Google reCAPTCHA v3" },
                      { key: "enableRecaptchaV2", label: "Google reCAPTCHA v2" },
                      { key: "enableHcaptcha", label: "hCaptcha" },
                      { key: "enableInhouse", label: "In-house CAPTCHA (final fallback)" },
                    ].map((p) => (
                      <ToggleCard key={p.key} label={p.label} checked={(settings[p.key] as boolean) ?? true} onChange={(v) => update(p.key, v)} />
                    ))}
                  </div>
                </Section>

                <Section title="Provider Site Keys" icon={<Lock className="h-5 w-5 text-blue-500" />} description="Enter the public site key for each provider">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Turnstile Site Key" value={settings.turnstileSiteKey || ""} onChange={(e) => update("turnstileSiteKey", e.target.value)} placeholder="0x..." />
                    <Input label="reCAPTCHA v3 Site Key" value={settings.recaptchaV3SiteKey || ""} onChange={(e) => update("recaptchaV3SiteKey", e.target.value)} placeholder="6L..." />
                    <Input label="reCAPTCHA v2 Site Key" value={settings.recaptchaV2SiteKey || ""} onChange={(e) => update("recaptchaV2SiteKey", e.target.value)} placeholder="6L..." />
                    <Input label="hCaptcha Site Key" value={settings.hcaptchaSiteKey || ""} onChange={(e) => update("hcaptchaSiteKey", e.target.value)} />
                  </div>
                </Section>

                <Section title="In-house CAPTCHA" icon={<Code2 className="h-5 w-5 text-indigo-500" />}>
                  <Input label="Code Length" type="number" value={String(settings.inhouseCodeLength || 6)} onChange={(e) => update("inhouseCodeLength", parseInt(e.target.value, 10) || 6)} />
                </Section>

                <Section title="Require CAPTCHA For" icon={<Shield className="h-5 w-5 text-green-500" />} description="Which forms require CAPTCHA verification">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { key: "requireCaptchaLogin", label: "Login", desc: "Require verification on login form" },
                      { key: "requireCaptchaRegister", label: "Registration", desc: "Require verification on signup form" },
                      { key: "requireCaptchaComment", label: "Comments", desc: "Require verification to post comments" },
                      { key: "requireCaptchaContact", label: "Contact Form", desc: "Require verification on contact form" },
                    ].map((r) => (
                      <ToggleCard key={r.key} label={r.label} description={r.desc} checked={(settings[r.key] as boolean) ?? false} onChange={(v) => update(r.key, v)} />
                    ))}
                  </div>
                </Section>

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800/50 dark:bg-blue-900/20">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-300"><Shield className="h-4 w-4" /> Fallback Chain</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    When the default provider fails, the system falls back through enabled providers:
                    <span className="mt-1 block font-medium">Turnstile → reCAPTCHA v3 → reCAPTCHA v2 → hCaptcha → In-house</span>
                    Providers without a configured site key are skipped.
                  </p>
                </div>
              </>
            )}
          </>
        )}

        {/* ═══ PRIVACY & LEGAL ═══ */}
        {activeTab === "privacy" && (
          <>
            <Section title="Cookie Consent" icon={<Cookie className="h-5 w-5 text-amber-500" />} description="Show a GDPR / privacy-compliant cookie consent banner to visitors">
              <div className="space-y-4">
                <ToggleCard label="Enable Cookie Banner" description="Display a cookie consent banner at the bottom of every page" checked={settings.cookieConsentEnabled ?? false} onChange={(v) => update("cookieConsentEnabled", v)} />
                {settings.cookieConsentEnabled && (
                  <>
                    <Textarea label="Banner Message" value={settings.cookieConsentMessage || ""} onChange={(e) => update("cookieConsentMessage", e.target.value)} rows={3} hint="Displayed in the consent banner. Supports plain text." />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input label="Privacy Policy URL" value={settings.privacyPolicyUrl || ""} onChange={(e) => update("privacyPolicyUrl", e.target.value || null)} placeholder="/privacy-policy or https://..." />
                      <Input label="Terms of Service URL" value={settings.termsOfServiceUrl || ""} onChange={(e) => update("termsOfServiceUrl", e.target.value || null)} placeholder="/terms-of-service or https://..." />
                    </div>
                  </>
                )}
              </div>
            </Section>

            <Section title="GDPR Compliance" icon={<Scale className="h-5 w-5 text-blue-500" />} description="European privacy regulation settings">
              <ToggleCard label="GDPR Mode" description="Enables cookie-category controls (essential, analytics, marketing). Scripts won\u2019t load until the visitor explicitly consents." checked={settings.gdprEnabled ?? false} onChange={(v) => update("gdprEnabled", v)} />
              {settings.gdprEnabled && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/50 dark:bg-blue-900/20">
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    When GDPR mode is on the banner shows <strong>Accept All</strong>, <strong>Reject All</strong> and <strong>Manage Preferences</strong> buttons.
                    Analytics / marketing scripts are blocked until the visitor opts in. Essential cookies (auth, CSRF) are always allowed.
                  </p>
                </div>
              )}
            </Section>
          </>
        )}

        {/* ═══ EDITOR ═══ */}
        {activeTab === "editor" && (
          <>
            {editorLoading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : !editorSettings ? (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <p className="text-gray-500">Editor settings not available. Database may need seeding.</p>
              </div>
            ) : (
              <>
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" size="sm" onClick={() => editorAction('full-mode', 'Full Mode')} icon={<Zap className="h-4 w-4" />}>
                    Full Mode
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => editorAction('simple-mode', 'Simple Mode')} icon={<Type className="h-4 w-4" />}>
                    Simple Mode
                  </Button>
                  <Button
                    variant={editorSettings.editorEnabled ? 'outline' : 'primary'}
                    size="sm"
                    onClick={() => editorAction(editorSettings.editorEnabled ? 'disable' : 'enable', editorSettings.editorEnabled ? 'Kill Switch' : 'Re-enable')}
                    icon={<Power className="h-4 w-4" />}
                  >
                    {editorSettings.editorEnabled ? 'Disable Editor' : 'Enable Editor'}
                  </Button>
                  {editorHasChanges && (
                    <Button onClick={handleSaveEditor} loading={editorSaving} icon={<Save className="h-4 w-4" />}>
                      Save Editor Settings
                    </Button>
                  )}
                </div>

                {/* Global Toggle */}
                <Section title="Global" icon={<Power className="h-5 w-5 text-red-500" />} description="Master switch for the editor">
                  <ToggleCard label="Editor Enabled" description="Turn off to disable all editors site-wide (kill switch)" checked={!!editorSettings.editorEnabled} onChange={(v) => updateEditor('editorEnabled', v)} />
                </Section>

                {/* Text Formatting */}
                <Section title="Text Formatting" icon={<Type className="h-5 w-5 text-blue-500" />} description="Toggle individual formatting features">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ToggleCard label="Bold" checked={!!editorSettings.enableBold} onChange={(v) => updateEditor('enableBold', v)} />
                    <ToggleCard label="Italic" checked={!!editorSettings.enableItalic} onChange={(v) => updateEditor('enableItalic', v)} />
                    <ToggleCard label="Underline" checked={!!editorSettings.enableUnderline} onChange={(v) => updateEditor('enableUnderline', v)} />
                    <ToggleCard label="Strikethrough" checked={!!editorSettings.enableStrikethrough} onChange={(v) => updateEditor('enableStrikethrough', v)} />
                    <ToggleCard label="Inline Code" checked={!!editorSettings.enableInlineCode} onChange={(v) => updateEditor('enableInlineCode', v)} />
                    <ToggleCard label="Superscript" checked={!!editorSettings.enableSuperscript} onChange={(v) => updateEditor('enableSuperscript', v)} />
                    <ToggleCard label="Subscript" checked={!!editorSettings.enableSubscript} onChange={(v) => updateEditor('enableSubscript', v)} />
                  </div>
                </Section>

                {/* Block Elements */}
                <Section title="Block Elements" icon={<LayoutGrid className="h-5 w-5 text-green-500" />} description="Headers, lists, quotes, and code blocks">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ToggleCard label="Headings" checked={!!editorSettings.enableHeadings} onChange={(v) => updateEditor('enableHeadings', v)} />
                    <ToggleCard label="Lists" checked={!!editorSettings.enableLists} onChange={(v) => updateEditor('enableLists', v)} />
                    <ToggleCard label="Task Lists" checked={!!editorSettings.enableTaskLists} onChange={(v) => updateEditor('enableTaskLists', v)} />
                    <ToggleCard label="Blockquotes" checked={!!editorSettings.enableBlockquotes} onChange={(v) => updateEditor('enableBlockquotes', v)} />
                    <ToggleCard label="Code Blocks" checked={!!editorSettings.enableCodeBlocks} onChange={(v) => updateEditor('enableCodeBlocks', v)} />
                    <ToggleCard label="Tables" checked={!!editorSettings.enableTables} onChange={(v) => updateEditor('enableTables', v)} />
                    <ToggleCard label="Horizontal Rule" checked={!!editorSettings.enableHorizontalRule} onChange={(v) => updateEditor('enableHorizontalRule', v)} />
                    <ToggleCard label="Block Type Dropdown" checked={!!editorSettings.enableBlockTypeDropdown} onChange={(v) => updateEditor('enableBlockTypeDropdown', v)} />
                  </div>
                </Section>

                {/* Media & Embeds */}
                <Section title="Media & Embeds" icon={<ImageIcon className="h-5 w-5 text-purple-500" />} description="Images, video embeds, and upload settings">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ToggleCard label="Images" checked={!!editorSettings.enableImages} onChange={(v) => updateEditor('enableImages', v)} />
                    <ToggleCard label="Video Embeds" checked={!!editorSettings.enableVideoEmbeds} onChange={(v) => updateEditor('enableVideoEmbeds', v)} />
                    <ToggleCard label="Links" checked={!!editorSettings.enableLinks} onChange={(v) => updateEditor('enableLinks', v)} />
                    <ToggleCard label="Remove Link" checked={!!editorSettings.enableRemoveLink} onChange={(v) => updateEditor('enableRemoveLink', v)} />
                    <ToggleCard label="Drag & Drop Upload" checked={!!editorSettings.enableDragDropUpload} onChange={(v) => updateEditor('enableDragDropUpload', v)} />
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Input label="Max Image Size (bytes)" type="number" value={String(editorSettings.maxImageSizeBytes ?? 5242880)} onChange={(e) => updateEditor('maxImageSizeBytes', parseInt(e.target.value) || 5242880)} />
                    <Input label="Default Image Width" type="number" value={String(editorSettings.defaultImageWidth ?? 800)} onChange={(e) => updateEditor('defaultImageWidth', parseInt(e.target.value) || 800)} />
                  </div>
                </Section>

                {/* Styling & Appearance */}
                <Section title="Styling" icon={<Palette className="h-5 w-5 text-pink-500" />} description="Colors, alignment, and visual features">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ToggleCard label="Text Color" checked={!!editorSettings.enableTextColor} onChange={(v) => updateEditor('enableTextColor', v)} />
                    <ToggleCard label="Background Color" checked={!!editorSettings.enableBackgroundColor} onChange={(v) => updateEditor('enableBackgroundColor', v)} />
                    <ToggleCard label="Alignment" checked={!!editorSettings.enableAlignment} onChange={(v) => updateEditor('enableAlignment', v)} />
                    <ToggleCard label="Indent Buttons" checked={!!editorSettings.enableIndentButtons} onChange={(v) => updateEditor('enableIndentButtons', v)} />
                    <ToggleCard label="Font Size" checked={!!editorSettings.enableFontSize} onChange={(v) => updateEditor('enableFontSize', v)} />
                    <ToggleCard label="Line Height" checked={!!editorSettings.enableLineHeight} onChange={(v) => updateEditor('enableLineHeight', v)} />
                    <ToggleCard label="Clear Formatting" checked={!!editorSettings.enableClearFormatting} onChange={(v) => updateEditor('enableClearFormatting', v)} />
                  </div>
                </Section>

                {/* Advanced Features */}
                <Section title="Advanced Features" icon={<Zap className="h-5 w-5 text-amber-500" />} description="Power-user features and utilities">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ToggleCard label="Undo / Redo" checked={!!editorSettings.enableUndoRedo} onChange={(v) => updateEditor('enableUndoRedo', v)} />
                    <ToggleCard label="Fullscreen" checked={!!editorSettings.enableFullscreen} onChange={(v) => updateEditor('enableFullscreen', v)} />
                    <ToggleCard label="Markdown Shortcuts" checked={!!editorSettings.enableMarkdownShortcuts} onChange={(v) => updateEditor('enableMarkdownShortcuts', v)} />
                    <ToggleCard label="Find & Replace" checked={!!editorSettings.enableFindReplace} onChange={(v) => updateEditor('enableFindReplace', v)} />
                    <ToggleCard label="Source View" checked={!!editorSettings.enableSourceView} onChange={(v) => updateEditor('enableSourceView', v)} />
                    <ToggleCard label="Emoji Picker" checked={!!editorSettings.enableEmoji} onChange={(v) => updateEditor('enableEmoji', v)} />
                    <ToggleCard label="Special Characters" checked={!!editorSettings.enableSpecialChars} onChange={(v) => updateEditor('enableSpecialChars', v)} />
                    <ToggleCard label="Table of Contents" checked={!!editorSettings.enableTableOfContents} onChange={(v) => updateEditor('enableTableOfContents', v)} />
                    <ToggleCard label="Print" checked={!!editorSettings.enablePrint} onChange={(v) => updateEditor('enablePrint', v)} />
                  </div>
                </Section>

                {/* Content Limits */}
                <Section title="Content Limits" icon={<BarChart3 className="h-5 w-5 text-orange-500" />} description="Word count, character count, and table limits">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Max Word Count" type="number" value={String(editorSettings.maxWordCount ?? 0)} onChange={(e) => updateEditor('maxWordCount', parseInt(e.target.value) || 0)} hint="0 = unlimited" />
                    <Input label="Max Char Count" type="number" value={String(editorSettings.maxCharCount ?? 0)} onChange={(e) => updateEditor('maxCharCount', parseInt(e.target.value) || 0)} hint="0 = unlimited" />
                    <Input label="Max Table Rows" type="number" value={String(editorSettings.maxTableRows ?? 20)} onChange={(e) => updateEditor('maxTableRows', parseInt(e.target.value) || 20)} />
                    <Input label="Max Table Columns" type="number" value={String(editorSettings.maxTableCols ?? 10)} onChange={(e) => updateEditor('maxTableCols', parseInt(e.target.value) || 10)} />
                    <Input label="Reading WPM" type="number" value={String(editorSettings.readingWpm ?? 200)} onChange={(e) => updateEditor('readingWpm', parseInt(e.target.value) || 200)} hint="Words per minute for reading time estimate" />
                    <Input label="Auto-save Delay (ms)" type="number" value={String(editorSettings.autoSaveDebounceMs ?? 1000)} onChange={(e) => updateEditor('autoSaveDebounceMs', parseInt(e.target.value) || 1000)} />
                    <Input label="History Stack Size" type="number" value={String(editorSettings.maxHistorySize ?? 100)} onChange={(e) => updateEditor('maxHistorySize', parseInt(e.target.value) || 100)} />
                  </div>
                </Section>

                {/* Editor Defaults */}
                <Section title="Editor Defaults" icon={<Settings2 className="h-5 w-5 text-gray-500" />} description="Default placeholder text, dimensions, and colors">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Placeholder Text" value={String(editorSettings.defaultPlaceholder ?? 'Start writing...')} onChange={(e) => updateEditor('defaultPlaceholder', e.target.value)} />
                    <Input label="Default Text Color" value={String(editorSettings.defaultTextColor ?? '#000000')} onChange={(e) => updateEditor('defaultTextColor', e.target.value)} />
                    <Input label="Min Height" value={String(editorSettings.defaultMinHeight ?? '200px')} onChange={(e) => updateEditor('defaultMinHeight', e.target.value)} hint="e.g. 200px, 50vh" />
                    <Input label="Max Height" value={String(editorSettings.defaultMaxHeight ?? '600px')} onChange={(e) => updateEditor('defaultMaxHeight', e.target.value)} hint="e.g. 600px, 80vh" />
                  </div>
                </Section>

                {/* Color Palette */}
                <Section title="Color Palette" icon={<Palette className="h-5 w-5 text-indigo-500" />} description="Available colors in the text/background color pickers">
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(editorSettings.colorPalette) ? editorSettings.colorPalette as string[] : []).map((color: string, i: number) => (
                      <div key={i} className="group relative">
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => {
                            const palette = [...(editorSettings.colorPalette as string[])];
                            palette[i] = e.target.value;
                            updateEditor('colorPalette', palette);
                          }}
                          className="h-8 w-8 cursor-pointer rounded border border-gray-300 p-0 dark:border-gray-600"
                          title={color}
                        />
                        <button
                          onClick={() => {
                            const palette = (editorSettings.colorPalette as string[]).filter((_: string, j: number) => j !== i);
                            updateEditor('colorPalette', palette);
                          }}
                          className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white group-hover:flex"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const palette = [...(Array.isArray(editorSettings.colorPalette) ? editorSettings.colorPalette as string[] : []), '#000000'];
                        updateEditor('colorPalette', palette);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:border-gray-600"
                      title="Add color"
                    >
                      +
                    </button>
                  </div>
                </Section>
              </>
            )}
          </>
        )}

        {/* ═══ ADVANCED ═══ */}
        {activeTab === "advanced" && (
          <>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800/50 dark:bg-amber-900/20">
              <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300"><AlertCircle className="h-4 w-4" /> Advanced Settings</h4>
              <p className="text-sm text-amber-700 dark:text-amber-400">These settings affect core site behavior. Modify with caution.</p>
            </div>

            <Section title="Custom Code Injection" icon={<Code2 className="h-5 w-5 text-gray-500" />} description="Inject custom HTML/JS into your site pages">
              <div className="space-y-4">
                <Textarea label="Head Code" value={settings.customHeadCode || ""} onChange={(e) => update("customHeadCode", e.target.value || null)} rows={5} hint="Injected into <head> on every page" />
                <Textarea label="Footer Code" value={settings.customFooterCode || ""} onChange={(e) => update("customFooterCode", e.target.value || null)} rows={5} hint="Injected before </body> on every page" />
              </div>
            </Section>
          </>
        )}

      </div>
    </div>
  );
}
