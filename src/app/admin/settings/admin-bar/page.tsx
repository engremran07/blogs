"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save,
  Eye,
  EyeOff,
  Palette,
  Layout,
  ChevronRight,
  FileText,
  BarChart3,
  Clock,
  Settings,
  User,
  Plus,
  Globe,
  Rocket,
  Loader2,
  ArrowLeft,
  Hash,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/Toast";

/* ── Types ── */

interface AdminBarSettings {
  adminBarEnabled: boolean;
  adminBarShowBreadcrumbs: boolean;
  adminBarShowNewButton: boolean;
  adminBarShowSeoScore: boolean;
  adminBarShowStatusToggle: boolean;
  adminBarShowWordCount: boolean;
  adminBarShowLastSaved: boolean;
  adminBarShowSaveButton: boolean;
  adminBarShowPublishButton: boolean;
  adminBarShowPreviewButton: boolean;
  adminBarShowViewSiteButton: boolean;
  adminBarShowSiteNameDropdown: boolean;
  adminBarShowUserDropdown: boolean;
  adminBarShowEnvBadge: boolean;
  adminBarBackgroundColor: string;
  adminBarAccentColor: string;
}

const DEFAULTS: AdminBarSettings = {
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
  adminBarBackgroundColor: "#0d0d18",
  adminBarAccentColor: "#6c63ff",
};

/* ── Toggle card component ── */

function ToggleItem({
  label,
  description,
  icon: Icon,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors ${
        disabled
          ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-50 dark:border-gray-700 dark:bg-gray-800/50"
          : checked
            ? "border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20"
            : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-400"
      />
    </label>
  );
}

/* ── Color picker ── */

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
      />
      <div>
        <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-0.5 w-24 rounded border border-gray-300 bg-white px-2 py-0.5 font-mono text-xs text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
          maxLength={20}
        />
      </div>
    </div>
  );
}

/* ── Preview bar ── */

function PreviewBar({ settings }: { settings: AdminBarSettings }) {
  return (
    <div
      className="flex items-center rounded-lg px-3"
      style={{
        height: 44,
        background: `linear-gradient(90deg, ${settings.adminBarBackgroundColor}, #13131f, ${settings.adminBarBackgroundColor})`,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="flex flex-1 items-center gap-2 text-sm text-gray-300">
        {settings.adminBarShowSiteNameDropdown && (
          <span className="font-semibold text-white">MySite</span>
        )}
        {settings.adminBarShowBreadcrumbs && (
          <>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400">Dashboard</span>
            <ChevronRight className="h-3 w-3 text-gray-600" />
            <span className="text-white">Posts</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {settings.adminBarShowStatusToggle && (
          <span className="rounded-full bg-green-900/40 px-2 py-0.5 text-[10px] font-semibold text-green-400">
            PUBLISHED
          </span>
        )}
        {settings.adminBarShowWordCount && (
          <span className="font-mono text-xs text-gray-400">1,240 words</span>
        )}
        {settings.adminBarShowSeoScore && (
          <span className="text-xs font-bold text-green-400">SEO 85</span>
        )}
        {settings.adminBarShowNewButton && (
          <span className="text-xs text-gray-400">+ New</span>
        )}
        {settings.adminBarShowViewSiteButton && (
          <span className="text-xs text-gray-400">View Site</span>
        )}
        {settings.adminBarShowSaveButton && (
          <span
            className="rounded px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: settings.adminBarAccentColor }}
          >
            Save
          </span>
        )}
        {settings.adminBarShowPublishButton && (
          <span className="rounded bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
            Publish
          </span>
        )}
        {settings.adminBarShowUserDropdown && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-[10px] font-bold text-white">
            A
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Main page ── */

export default function AdminBarSettingsPage() {
  const [settings, setSettings] = useState<AdminBarSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load current settings
  useEffect(() => {
    fetch("/api/settings/admin-bar")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setSettings((prev) => ({ ...prev, ...res.data }));
        }
      })
      .catch(() => toast("Failed to load settings", "error"))
      .finally(() => setLoading(false));
  }, []);

  const update = useCallback(
    <K extends keyof AdminBarSettings>(key: K, value: AdminBarSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/admin-bar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast("Admin Bar settings saved!", "success");
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/settings"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Admin Bar
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure the global admin bar visible to editors and administrators
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </button>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Live Preview
        </h2>
        <PreviewBar settings={settings} />
      </div>

      {/* Master toggle */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <ToggleItem
          label="Enable Admin Bar"
          description="Show the admin bar at the top of every page for editors and administrators"
          icon={Layout}
          checked={settings.adminBarEnabled}
          onChange={(v) => update("adminBarEnabled", v)}
        />
      </div>

      {/* Feature toggles */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Settings className="h-5 w-5 text-gray-400" />
          Feature Visibility
        </h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Toggle which features appear in the admin bar. Disabled features are hidden for all users.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleItem
            label="Site Name Dropdown"
            description="Show site name with tools menu"
            icon={Globe}
            checked={settings.adminBarShowSiteNameDropdown}
            onChange={(v) => update("adminBarShowSiteNameDropdown", v)}
            disabled={!settings.adminBarEnabled}
          />
          <ToggleItem
            label="Environment Badge"
            description="Show DEV / STAGING / LIVE badge"
            icon={Hash}
            checked={settings.adminBarShowEnvBadge}
            onChange={(v) => update("adminBarShowEnvBadge", v)}
            disabled={!settings.adminBarEnabled}
          />
          <ToggleItem
            label="Breadcrumbs"
            description="Show navigation breadcrumb trail"
            icon={ChevronRight}
            checked={settings.adminBarShowBreadcrumbs}
            onChange={(v) => update("adminBarShowBreadcrumbs", v)}
            disabled={!settings.adminBarEnabled}
          />
          <ToggleItem
            label="+ New Button"
            description="Quick create menu for posts, pages, media"
            icon={Plus}
            checked={settings.adminBarShowNewButton}
            onChange={(v) => update("adminBarShowNewButton", v)}
            disabled={!settings.adminBarEnabled}
          />
          <ToggleItem
            label="View Site / Admin Toggle"
            description="Switch between frontend and admin panel"
            icon={Globe}
            checked={settings.adminBarShowViewSiteButton}
            onChange={(v) => update("adminBarShowViewSiteButton", v)}
            disabled={!settings.adminBarEnabled}
          />
          <ToggleItem
            label="User Dropdown"
            description="User avatar, profile, and logout menu"
            icon={User}
            checked={settings.adminBarShowUserDropdown}
            onChange={(v) => update("adminBarShowUserDropdown", v)}
            disabled={!settings.adminBarEnabled}
          />
        </div>
      </div>

      {/* Editor features */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <FileText className="h-5 w-5 text-gray-400" />
          Editor Features
        </h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          These features are only visible when editing a post or page.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleItem
            label="Status Toggle"
            description="Click to toggle PUBLISHED / DRAFT"
            icon={Eye}
            checked={settings.adminBarShowStatusToggle}
            onChange={(v) => update("adminBarShowStatusToggle", v)}
            disabled={!settings.adminBarEnabled}
          />
          <ToggleItem
            label="Word Count"
            description="Live word count from the editor"
            icon={FileText}
            checked={settings.adminBarShowWordCount}
            onChange={(v) => update("adminBarShowWordCount", v)}
            disabled={!settings.adminBarEnabled}
          />
          <ToggleItem
            label="Last Saved"
            description="Time since last save indicator"
            icon={Clock}
            checked={settings.adminBarShowLastSaved}
            onChange={(v) => update("adminBarShowLastSaved", v)}
            disabled={!settings.adminBarEnabled}
          />
          <ToggleItem
            label="SEO Score"
            description="On-demand SEO audit score and checklist"
            icon={BarChart3}
            checked={settings.adminBarShowSeoScore}
            onChange={(v) => update("adminBarShowSeoScore", v)}
            disabled={!settings.adminBarEnabled}
          />
          <ToggleItem
            label="Save Button"
            description="Prominent save button in the bar"
            icon={Save}
            checked={settings.adminBarShowSaveButton}
            onChange={(v) => update("adminBarShowSaveButton", v)}
            disabled={!settings.adminBarEnabled}
          />
          <ToggleItem
            label="Publish Button"
            description="One-click publish for draft content"
            icon={Rocket}
            checked={settings.adminBarShowPublishButton}
            onChange={(v) => update("adminBarShowPublishButton", v)}
            disabled={!settings.adminBarEnabled}
          />
          <ToggleItem
            label="Preview Button"
            description="Preview as visitor — hides the bar temporarily"
            icon={EyeOff}
            checked={settings.adminBarShowPreviewButton}
            onChange={(v) => update("adminBarShowPreviewButton", v)}
            disabled={!settings.adminBarEnabled}
          />
        </div>
      </div>

      {/* Appearance */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Palette className="h-5 w-5 text-gray-400" />
          Appearance
        </h2>

        <div className="flex flex-wrap gap-8">
          <ColorInput
            label="Background Color"
            value={settings.adminBarBackgroundColor}
            onChange={(v) => update("adminBarBackgroundColor", v)}
          />
          <ColorInput
            label="Accent Color"
            value={settings.adminBarAccentColor}
            onChange={(v) => update("adminBarAccentColor", v)}
          />
        </div>
      </div>

      {/* Bottom save button */}
      <div className="flex justify-end border-t border-gray-200 pt-6 dark:border-gray-700">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Admin Bar Settings
        </button>
      </div>
    </div>
  );
}
