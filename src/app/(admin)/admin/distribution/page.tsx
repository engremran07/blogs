"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Share2,
  Plus,
  Edit2,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Globe,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";

/* ─── Types ─── */

interface Channel {
  id: string;
  name: string;
  platform: string;
  url?: string | null;
  enabled: boolean;
  isCustom: boolean;
  autoPublish: boolean;
  credentials: Record<string, unknown>;
  platformRules?: Record<string, unknown> | null;
  renewIntervalDays: number;
  lastPublishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DistRecord {
  id: string;
  postId: string;
  channelId: string;
  platform: string;
  status: string;
  content: string;
  externalUrl: string | null;
  error: string | null;
  retryCount: number;
  createdAt: string;
  publishedAt: string | null;
  post?: { title: string; slug: string };
  channel?: { name: string; platform: string };
}

interface Stats {
  records: {
    total: number;
    published: number;
    failed: number;
    pending: number;
    scheduled: number;
    rateLimited: number;
  };
  channels: { total: number; active: number };
  successRate: number;
  platformHealth: Record<
    string,
    { status: string; circuitOpen: boolean; rateLimited: boolean }
  >;
}

type Tab = "overview" | "channels" | "records";

const PLATFORMS = [
  "twitter",
  "facebook",
  "linkedin",
  "telegram",
  "whatsapp",
  "pinterest",
  "reddit",
  "instagram",
  "tiktok",
  "medium",
  "youtube",
  "custom",
];

/* ─── Page ─── */

export default function DistributionAdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [records, setRecords] = useState<DistRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [distOn, setDistOn] = useState(true);

  // Modal state
  const [channelModal, setChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Channel form
  const [form, setForm] = useState({
    name: "",
    platform: "twitter",
    enabled: true,
    autoPublish: false,
    credentials: {} as Record<string, string>,
  });

  /* ─── Fetch ─── */

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [chRes, recRes, statRes] = await Promise.all([
        fetch("/api/distribution/channels").then((r) => {
          if (!r.ok) throw new Error("Failed");
          return r.json();
        }),
        fetch("/api/distribution/records").then((r) => {
          if (!r.ok) throw new Error("Failed");
          return r.json();
        }),
        fetch("/api/distribution/stats").then((r) => {
          if (!r.ok) throw new Error("Failed");
          return r.json();
        }),
      ]);
      if (chRes.success) setChannels(chRes.data);
      if (recRes.success)
        setRecords(
          Array.isArray(recRes.data) ? recRes.data : (recRes.data?.data ?? []),
        );
      if (statRes.success) setStats(statRes.data);
    } catch {
      toast("Failed to load distribution data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Fetch module enabled status (single source of truth)
  useEffect(() => {
    fetch("/api/settings/module-status")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => {
        if (d.success) setDistOn(d.data.distribution);
      })
      .catch(() => {});
  }, []);

  /* ─── Kill Switch ─── */

  async function toggleDistribution() {
    try {
      const res = await fetch("/api/distribution/kill-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !distOn }),
      });
      if (!res.ok) {
        toast("Failed to toggle distribution", "error");
        return;
      }
      const data = await res.json();
      if (data.success) {
        const newState = !distOn;
        setDistOn(newState);
        toast(
          newState ? "Distribution enabled" : "Distribution disabled",
          newState ? "success" : "warning",
        );
        window.dispatchEvent(
          new CustomEvent("module-status-changed", {
            detail: { distribution: newState },
          }),
        );
      }
    } catch {
      toast("Failed to toggle distribution", "error");
    }
  }

  /* ─── Channel CRUD ─── */

  function openCreate() {
    setEditingChannel(null);
    setForm({
      name: "",
      platform: "twitter",
      enabled: true,
      autoPublish: false,
      credentials: {},
    });
    setChannelModal(true);
  }

  function openEdit(ch: Channel) {
    setEditingChannel(ch);
    setForm({
      name: ch.name,
      platform: ch.platform,
      enabled: ch.enabled,
      autoPublish: ch.autoPublish,
      credentials: (ch.credentials ?? {}) as Record<string, string>,
    });
    setChannelModal(true);
  }

  async function saveChannel() {
    if (!form.name.trim()) {
      toast("Name is required", "error");
      return;
    }
    setSaving(true);
    try {
      const url = editingChannel
        ? `/api/distribution/channels/${editingChannel.id}`
        : "/api/distribution/channels";
      const method = editingChannel ? "PATCH" : "POST";
      // Strip empty credential values so we don't overwrite existing secrets with blanks
      const cleanedCreds = Object.fromEntries(
        Object.entries(form.credentials).filter(
          ([, v]) => typeof v === "string" && v.trim() !== "",
        ),
      );
      const payload = {
        ...form,
        credentials: Object.keys(cleanedCreds).length
          ? cleanedCreds
          : undefined,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast("Failed to save channel", "error");
        return;
      }
      const data = await res.json();
      if (data.success) {
        toast(
          editingChannel ? "Channel updated" : "Channel created",
          "success",
        );
        setChannelModal(false);
        fetchAll();
      } else {
        toast(data.error || "Failed to save", "error");
      }
    } catch {
      toast("Failed to save channel", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/distribution/channels/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast("Failed to delete channel", "error");
        return;
      }
      const data = await res.json();
      if (data.success) {
        toast("Channel deleted", "success");
        fetchAll();
      } else {
        toast(data.error || "Failed", "error");
      }
    } catch {
      toast("Failed to delete channel", "error");
    } finally {
      setDeleteId(null);
    }
  }

  /* ─── Validate Channel ─── */

  async function validateChannel(id: string) {
    try {
      const res = await fetch(`/api/distribution/channels/${id}/validate`, {
        method: "POST",
      });
      if (!res.ok) {
        toast("Validation failed", "error");
        return;
      }
      const data = await res.json();
      if (data.success && data.data?.valid) {
        toast("Channel validated successfully", "success");
      } else {
        toast(data.data?.error || data.error || "Validation failed", "error");
      }
    } catch {
      toast("Validation failed", "error");
    }
  }

  /* ─── Status helpers ─── */

  function statusBadge(status: string) {
    const map: Record<
      string,
      { bg: string; text: string; icon: React.ReactNode }
    > = {
      PUBLISHED: {
        bg: "bg-green-100 dark:bg-green-900/30",
        text: "text-green-700 dark:text-green-400",
        icon: <CheckCircle className="h-3.5 w-3.5" />,
      },
      FAILED: {
        bg: "bg-red-100 dark:bg-red-900/30",
        text: "text-red-700 dark:text-red-400",
        icon: <XCircle className="h-3.5 w-3.5" />,
      },
      PENDING: {
        bg: "bg-amber-100 dark:bg-amber-900/30",
        text: "text-amber-700 dark:text-amber-400",
        icon: <Clock className="h-3.5 w-3.5" />,
      },
      SCHEDULED: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-700 dark:text-blue-400",
        icon: <Clock className="h-3.5 w-3.5" />,
      },
      PUBLISHING: {
        bg: "bg-indigo-100 dark:bg-indigo-900/30",
        text: "text-indigo-700 dark:text-indigo-400",
        icon: <Send className="h-3.5 w-3.5" />,
      },
      CANCELLED: {
        bg: "bg-gray-100 dark:bg-gray-700",
        text: "text-gray-600 dark:text-gray-400",
        icon: <XCircle className="h-3.5 w-3.5" />,
      },
      RATE_LIMITED: {
        bg: "bg-orange-100 dark:bg-orange-900/30",
        text: "text-orange-700 dark:text-orange-400",
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
      },
    };
    const s = map[status] ?? map.PENDING;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}
      >
        {s.icon} {status}
      </span>
    );
  }

  function platformIcon(platform: string) {
    const colors: Record<string, string> = {
      twitter: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
      facebook:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      linkedin:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      telegram:
        "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
      reddit:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      instagram:
        "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
      pinterest: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      youtube: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
      medium: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      tiktok: "bg-gray-900 text-white dark:bg-gray-600 dark:text-white",
    };
    return (
      <span
        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${colors[platform] ?? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400"}`}
      >
        {platform}
      </span>
    );
  }

  /* ─── Tabs ─── */

  const tabDefs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "overview",
      label: "Overview",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    { key: "channels", label: "Channels", icon: <Globe className="h-4 w-4" /> },
    { key: "records", label: "Records", icon: <Send className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const deleteCh = channels.find((c) => c.id === deleteId);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            <Share2 className="mr-2 inline h-6 w-6" /> Distribution
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Distribute posts to social platforms &amp; third-party channels
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <span>{distOn ? "Dist On" : "Dist Off"}</span>
            <button
              type="button"
              role="switch"
              aria-checked={distOn}
              onClick={toggleDistribution}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                distOn ? "bg-green-500" : "bg-red-500"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  distOn ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </label>
          <Button
            onClick={() => {
              setTab("channels");
              openCreate();
            }}
            icon={<Plus className="h-4 w-4" />}
          >
            New Channel
          </Button>
        </div>
      </div>

      {/* Module status banner */}
      <div
        className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium ${
          distOn
            ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
            : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
        }`}
      >
        {distOn ? (
          <>
            <CheckCircle className="h-4 w-4" /> Distribution module is{" "}
            <span className="font-semibold">enabled</span> &amp; active
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4" /> Distribution module is{" "}
            <span className="font-semibold">disabled</span> — posts will not be
            distributed
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        {tabDefs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ─── Overview ─── */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Total",
                value: stats?.records.total ?? 0,
                icon: <Send className="h-5 w-5" />,
                color: "blue",
              },
              {
                label: "Success",
                value: stats?.records.published ?? 0,
                icon: <CheckCircle className="h-5 w-5" />,
                color: "green",
              },
              {
                label: "Failed",
                value: stats?.records.failed ?? 0,
                icon: <XCircle className="h-5 w-5" />,
                color: "red",
              },
              {
                label: "Pending",
                value: stats?.records.pending ?? 0,
                icon: <Clock className="h-5 w-5" />,
                color: "amber",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {s.label}
                  </p>
                  <span
                    className={`text-${s.color}-600 dark:text-${s.color}-400`}
                  >
                    {s.icon}
                  </span>
                </div>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Platform Health */}
          {stats?.platformHealth &&
            Object.keys(stats.platformHealth).length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
                  Platform Health
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats.platformHealth).map(
                    ([platform, health]) => (
                      <div
                        key={platform}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-700/50"
                      >
                        <div className="flex items-center gap-3">
                          {platformIcon(platform)}
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className={`text-sm font-medium ${
                              health.status === "healthy"
                                ? "text-green-600 dark:text-green-400"
                                : health.status === "circuit_open"
                                  ? "text-red-600 dark:text-red-400"
                                  : health.status === "rate_limited"
                                    ? "text-orange-600 dark:text-orange-400"
                                    : "text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            {health.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

          {/* Channels list */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
              Channels
            </h3>
            {channels.length === 0 ? (
              <p className="text-sm text-gray-400">
                No channels configured yet
              </p>
            ) : (
              <div className="space-y-2">
                {channels.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${ch.enabled ? "bg-green-500" : "bg-gray-400"}`}
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {ch.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {ch.platform}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {ch.autoPublish && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          <Zap className="mr-0.5 inline h-3 w-3" /> Auto
                        </span>
                      )}
                      {platformIcon(ch.platform)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Channels ─── */}
      {tab === "channels" && (
        <div>
          <div className="mb-4 flex justify-end">
            <Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
              New Channel
            </Button>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Platform
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Auto
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {channels.map((ch) => (
                  <tr
                    key={ch.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {ch.name}
                    </td>
                    <td className="px-4 py-3">{platformIcon(ch.platform)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          ch.enabled
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {ch.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ch.autoPublish ? (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          <Zap className="mr-0.5 inline h-3 w-3" /> On
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Off</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => validateChannel(ch.id)}
                          title="Validate"
                          className="rounded p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/30 dark:hover:text-green-400"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(ch)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(ch.id)}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {channels.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      No channels configured
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Records ─── */}
      {tab === "records" && (
        <div>
          <div className="mb-4 flex justify-end">
            <Button
              variant="outline"
              onClick={fetchAll}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Post
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Channel
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Attempts
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Link
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {records.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-52 truncate">
                      {r.post?.title ?? r.postId}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {r.channel && platformIcon(r.channel.platform)}
                        <span className="text-gray-600 dark:text-gray-400">
                          {r.channel?.name ?? r.channelId}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {r.retryCount}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {r.externalUrl ? (
                        <a
                          href={r.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline dark:text-blue-400 text-xs"
                        >
                          View
                        </a>
                      ) : r.error ? (
                        <span
                          className="text-xs text-red-500 dark:text-red-400 truncate max-w-40 block"
                          title={r.error}
                        >
                          {r.error}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {["FAILED", "RATE_LIMITED"].includes(r.status) && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(
                                  `/api/distribution/records/${r.id}`,
                                  { method: "POST" },
                                );
                                if (!res.ok) {
                                  toast("Retry failed", "error");
                                  return;
                                }
                                const data = await res.json();
                                if (data.success) {
                                  toast("Retrying…", "success");
                                  fetchAll();
                                } else
                                  toast(data.error || "Retry failed", "error");
                              } catch {
                                toast("Retry failed", "error");
                              }
                            }}
                            className="rounded p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                            title="Retry"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {["PENDING", "SCHEDULED"].includes(r.status) && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(
                                  `/api/distribution/records/${r.id}`,
                                  { method: "DELETE" },
                                );
                                if (!res.ok) {
                                  toast("Cancel failed", "error");
                                  return;
                                }
                                const data = await res.json();
                                if (data.success) {
                                  toast("Cancelled", "success");
                                  fetchAll();
                                } else
                                  toast(data.error || "Cancel failed", "error");
                              } catch {
                                toast("Cancel failed", "error");
                              }
                            }}
                            className="rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                            title="Cancel"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      No distribution records yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Channel Modal ─── */}
      <Modal
        open={channelModal}
        onClose={() => setChannelModal(false)}
        title={editingChannel ? "Edit Channel" : "New Channel"}
        size="lg"
      >
        <div className="space-y-4">
          {/* Row 1: Name + Platform */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Channel name"
            />
            <Select
              label="Platform"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </Select>
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {[
              { key: "enabled" as const, label: "Enabled" },
              {
                key: "autoPublish" as const,
                label: "Auto-publish on post publish",
              },
            ].map((opt) => (
              <label
                key={opt.key}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  type="checkbox"
                  checked={form[opt.key]}
                  onChange={(e) =>
                    setForm({ ...form, [opt.key]: e.target.checked })
                  }
                  className="rounded"
                />
                {opt.label}
              </label>
            ))}
          </div>

          {/* Platform Credentials */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Credentials
            </h4>
            {form.platform === "telegram" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Bot Token"
                  type="password"
                  value={(form.credentials.botToken as string) || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      credentials: {
                        ...form.credentials,
                        botToken: e.target.value,
                      },
                    })
                  }
                  placeholder="123456:ABC-DEF..."
                />
                <Input
                  label="Chat ID"
                  value={(form.credentials.chatId as string) || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      credentials: {
                        ...form.credentials,
                        chatId: e.target.value,
                      },
                    })
                  }
                  placeholder="@channel or -100..."
                />
              </div>
            )}
            {form.platform === "twitter" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="API Key"
                  type="password"
                  value={(form.credentials.apiKey as string) || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      credentials: {
                        ...form.credentials,
                        apiKey: e.target.value,
                      },
                    })
                  }
                />
                <Input
                  label="API Secret"
                  type="password"
                  value={(form.credentials.apiSecret as string) || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      credentials: {
                        ...form.credentials,
                        apiSecret: e.target.value,
                      },
                    })
                  }
                />
                <Input
                  label="Access Token"
                  type="password"
                  value={(form.credentials.accessToken as string) || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      credentials: {
                        ...form.credentials,
                        accessToken: e.target.value,
                      },
                    })
                  }
                />
                <Input
                  label="Access Token Secret"
                  type="password"
                  value={(form.credentials.accessTokenSecret as string) || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      credentials: {
                        ...form.credentials,
                        accessTokenSecret: e.target.value,
                      },
                    })
                  }
                />
              </div>
            )}
            {form.platform === "linkedin" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Access Token"
                  type="password"
                  value={(form.credentials.accessToken as string) || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      credentials: {
                        ...form.credentials,
                        accessToken: e.target.value,
                      },
                    })
                  }
                />
                <Input
                  label="Page / Organization ID"
                  value={(form.credentials.pageId as string) || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      credentials: {
                        ...form.credentials,
                        pageId: e.target.value,
                      },
                    })
                  }
                />
              </div>
            )}
            {form.platform === "facebook" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Page Access Token"
                  type="password"
                  value={(form.credentials.accessToken as string) || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      credentials: {
                        ...form.credentials,
                        accessToken: e.target.value,
                      },
                    })
                  }
                />
                <Input
                  label="Page ID"
                  value={(form.credentials.pageId as string) || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      credentials: {
                        ...form.credentials,
                        pageId: e.target.value,
                      },
                    })
                  }
                />
              </div>
            )}
            {!["telegram", "twitter", "linkedin", "facebook"].includes(
              form.platform,
            ) && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="API Key / Token"
                  type="password"
                  value={(form.credentials.apiKey as string) || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      credentials: {
                        ...form.credentials,
                        apiKey: e.target.value,
                      },
                    })
                  }
                />
                <Input
                  label="Secret"
                  type="password"
                  value={(form.credentials.secret as string) || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      credentials: {
                        ...form.credentials,
                        secret: e.target.value,
                      },
                    })
                  }
                />
              </div>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Leave credential fields blank to keep existing values.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setChannelModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveChannel} loading={saving}>
              {editingChannel ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Confirmation ─── */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Channel"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to delete{" "}
          <strong className="text-gray-900 dark:text-white">
            {deleteCh?.name}
          </strong>
          ? All distribution records for this channel will be orphaned.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteId(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
