"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  BarChart3,
  Layers,
  MonitorSmartphone,
  Eye,
  MousePointerClick,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Shield,
  ScanSearch,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import {
  AdminPagination,
  ADMIN_PAGE_SIZE,
} from "@/components/ui/AdminPagination";

/* ─── Types ─── */

interface Provider {
  id: string;
  name: string;
  slug: string;
  type: string;
  isActive: boolean;
  priority: number;
  killSwitch: boolean;
  supportedFormats: string[];
  maxPerPage: number;
  loadStrategy: string;
  clientId?: string | null;
  publisherId?: string | null;
  scriptUrl?: string | null;
  createdAt: string;
}

interface Slot {
  id: string;
  name: string;
  slug: string;
  position: string;
  format: string;
  isActive: boolean;
  pageTypes: string[];
  maxWidth: number | null;
  maxHeight: number | null;
  responsive: boolean;
  renderPriority: number;
  createdAt: string;
}

interface Placement {
  id: string;
  providerId: string;
  slotId: string;
  adUnitId?: string | null;
  adCode?: string | null;
  customHtml?: string | null;
  autoPlace?: boolean;
  autoStrategy?: string;
  minParagraphs?: number;
  paragraphGap?: number;
  maxAdsPerPage?: number;
  lazyOffset?: number;
  refreshIntervalSec?: number;
  closeable?: boolean;
  visibleBreakpoints?: string[];
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  provider?: Provider;
  slot?: Slot;
}

interface Overview {
  totalProviders: number;
  activeProviders: number;
  totalSlots: number;
  activeSlots: number;
  totalPlacements: number;
  activePlacements: number;
  totalImpressions?: number;
  totalClicks?: number;
  totalRevenue?: number;
  ctr?: number;
  rpm?: number;
}

type Tab =
  | "overview"
  | "providers"
  | "slots"
  | "placements"
  | "settings"
  | "compliance";

const scanColorClasses: Record<string, string> = {
  blue: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20",
  green:
    "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20",
  amber:
    "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20",
  red: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20",
};

const statColorClasses: Record<string, string> = {
  blue: "text-blue-600 dark:text-blue-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  purple: "text-purple-600 dark:text-purple-400",
  amber: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
  green: "text-green-600 dark:text-green-400",
};

/* ─── Page ─── */

export default function AdsAdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [adsOn, setAdsOn] = useState(true);

  // Pagination state for each tab
  const [provPage, setProvPage] = useState(1);
  const [slotPage, setSlotPage] = useState(1);
  const [placePage, setPlacePage] = useState(1);

  // Modal state
  const [providerModal, setProviderModal] = useState(false);
  const [slotModal, setSlotModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: string;
    id: string;
    name: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  // Provider form
  const [provForm, setProvForm] = useState({
    name: "",
    type: "ADSENSE",
    priority: 0,
    isActive: true,
    clientId: "",
    publisherId: "",
    scriptUrl: "",
    maxPerPage: 3,
    loadStrategy: "lazy",
  });

  // Slot form
  const [slotForm, setSlotForm] = useState({
    name: "",
    position: "SIDEBAR",
    format: "DISPLAY",
    isActive: true,
    responsive: true,
    pageTypes: "",
    maxWidth: "",
    maxHeight: "",
    renderPriority: 0,
  });

  // Placement modal state
  const [placementModal, setPlacementModal] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState<Placement | null>(
    null,
  );
  const [placeForm, setPlaceForm] = useState({
    providerId: "",
    slotId: "",
    adUnitId: "",
    adCode: "",
    customHtml: "",
    isActive: true,
    autoPlace: false,
    autoStrategy: "PARAGRAPH_COUNT",
    minParagraphs: 3,
    paragraphGap: 4,
    maxAdsPerPage: 5,
    lazyOffset: 200,
    refreshIntervalSec: 0,
    closeable: false,
    startDate: "",
    endDate: "",
  });

  /* ─── Fetching ─── */

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, provRes, slotRes, placRes] = await Promise.all([
        fetch("/api/ads/overview").then((r) => {
          if (!r.ok) throw new Error("Failed");
          return r.json();
        }),
        fetch("/api/ads/providers").then((r) => {
          if (!r.ok) throw new Error("Failed");
          return r.json();
        }),
        fetch("/api/ads/slots").then((r) => {
          if (!r.ok) throw new Error("Failed");
          return r.json();
        }),
        fetch("/api/ads/placements").then((r) => {
          if (!r.ok) throw new Error("Failed");
          return r.json();
        }),
      ]);
      if (ovRes.success) setOverview(ovRes.data);
      if (provRes.success) {
        setProviders(provRes.data);
      }
      if (slotRes.success) setSlots(slotRes.data);
      if (placRes.success) setPlacements(placRes.data);
    } catch {
      toast("Failed to load ads data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Fetch module enabled status
  useEffect(() => {
    fetch("/api/settings/module-status")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => {
        if (d.success) setAdsOn(d.data.ads);
      })
      .catch(() => {});
  }, []);

  /* ─── Kill Switch ─── */

  async function toggleAds() {
    try {
      const res = await fetch("/api/ads/kill-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ killed: adsOn }),
      });
      if (!res.ok) {
        toast("Failed to toggle ads", "error");
        return;
      }
      const data = await res.json();
      if (data.success) {
        const newState = !adsOn;
        setAdsOn(newState);
        toast(
          newState ? "Ads enabled" : "Ads disabled",
          newState ? "success" : "warning",
        );
        window.dispatchEvent(
          new CustomEvent("module-status-changed", {
            detail: { ads: newState },
          }),
        );
        fetchAll();
      }
    } catch {
      toast("Failed to toggle ads", "error");
    }
  }

  // Scan results state
  const [scanResults, setScanResults] = useState<{
    count?: number;
    health?: {
      totalPageTypes: number;
      coveredPageTypes: number;
      uncoveredPageTypes: number;
      overServedPageTypes: number;
      recommendations?: string[];
    };
    pageTypes?: Array<{
      key: string;
      label: string;
      kind: string;
      trafficScore: number;
      slotCoverage: number;
    }>;
    message?: string;
    discovered?: number;
    added?: number;
    pruned?: number;
  } | null>(null);
  const [scanResultsOpen, setScanResultsOpen] = useState(false);

  /* ─── Scan Pages ─── */

  async function scanPages() {
    try {
      toast("Scanning pages…", "info");
      // Run sync (POST) then fetch full results (GET) in parallel with refresh
      const res = await fetch("/api/ads/scan-pages", { method: "POST" });
      if (!res.ok) {
        toast("Scan failed", "error");
        return;
      }
      const data = await res.json();
      if (data.success) {
        toast(
          data.data?.message ||
            `Scan complete: discovered ${data.data?.discovered ?? 0} page types, added to ${data.data?.added ?? 0} slots, pruned from ${data.data?.pruned ?? 0} slots`,
          "success",
        );
        // Fetch the full scan results with health report
        const detailRes = await fetch("/api/ads/scan-pages");
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          if (detailData.success) {
            setScanResults(detailData.data);
            setScanResultsOpen(true);
          }
        }
        fetchAll();
      } else {
        toast(data.error || "Scan failed", "error");
      }
    } catch {
      toast("Scan failed", "error");
    }
  }

  /* ─── Provider CRUD ─── */

  function openProviderCreate() {
    setEditingProvider(null);
    setProvForm({
      name: "",
      type: "ADSENSE",
      priority: 0,
      isActive: true,
      clientId: "",
      publisherId: "",
      scriptUrl: "",
      maxPerPage: 3,
      loadStrategy: "lazy",
    });
    setProviderModal(true);
  }

  function openProviderEdit(p: Provider) {
    setEditingProvider(p);
    setProvForm({
      name: p.name,
      type: p.type,
      priority: p.priority,
      isActive: p.isActive,
      clientId: p.clientId ?? "",
      publisherId: p.publisherId ?? "",
      scriptUrl: p.scriptUrl ?? "",
      maxPerPage: p.maxPerPage,
      loadStrategy: p.loadStrategy,
    });
    setProviderModal(true);
  }

  async function saveProvider() {
    if (!provForm.name.trim()) {
      toast("Name is required", "error");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: provForm.name,
        type: provForm.type,
        priority: provForm.priority,
        isActive: provForm.isActive,
        maxPerPage: provForm.maxPerPage,
        loadStrategy: provForm.loadStrategy,
      };
      if (provForm.clientId) body.clientId = provForm.clientId;
      if (provForm.publisherId) body.publisherId = provForm.publisherId;
      if (provForm.scriptUrl) body.scriptUrl = provForm.scriptUrl;

      const url = editingProvider
        ? `/api/ads/providers/${editingProvider.id}`
        : "/api/ads/providers";
      const method = editingProvider ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast("Failed to save provider", "error");
        return;
      }
      const data = await res.json();
      if (data.success) {
        toast(
          editingProvider ? "Provider updated" : "Provider created",
          "success",
        );
        setProviderModal(false);
        fetchAll();
      } else {
        toast(data.error || "Failed", "error");
      }
    } catch {
      toast("Failed to save provider", "error");
    } finally {
      setSaving(false);
    }
  }

  /* ─── Slot CRUD ─── */

  function openSlotCreate() {
    setEditingSlot(null);
    setSlotForm({
      name: "",
      position: "SIDEBAR",
      format: "DISPLAY",
      isActive: true,
      responsive: true,
      pageTypes: "",
      maxWidth: "",
      maxHeight: "",
      renderPriority: 0,
    });
    setSlotModal(true);
  }

  function openSlotEdit(s: Slot) {
    setEditingSlot(s);
    setSlotForm({
      name: s.name,
      position: s.position,
      format: s.format,
      isActive: s.isActive,
      responsive: s.responsive,
      pageTypes: (s.pageTypes || []).join(", "),
      maxWidth: s.maxWidth?.toString() ?? "",
      maxHeight: s.maxHeight?.toString() ?? "",
      renderPriority: s.renderPriority ?? 0,
    });
    setSlotModal(true);
  }

  async function saveSlot() {
    if (!slotForm.name.trim()) {
      toast("Name is required", "error");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: slotForm.name,
        position: slotForm.position,
        format: slotForm.format,
        isActive: slotForm.isActive,
        responsive: slotForm.responsive,
        renderPriority: slotForm.renderPriority,
        pageTypes: slotForm.pageTypes
          ? slotForm.pageTypes
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      };
      if (slotForm.maxWidth) body.maxWidth = parseInt(slotForm.maxWidth);
      if (slotForm.maxHeight) body.maxHeight = parseInt(slotForm.maxHeight);

      const url = editingSlot
        ? `/api/ads/slots/${editingSlot.id}`
        : "/api/ads/slots";
      const method = editingSlot ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast("Failed to save slot", "error");
        return;
      }
      const data = await res.json();
      if (data.success) {
        toast(editingSlot ? "Slot updated" : "Slot created", "success");
        setSlotModal(false);
        fetchAll();
      } else {
        toast(data.error || "Failed", "error");
      }
    } catch {
      toast("Failed to save slot", "error");
    } finally {
      setSaving(false);
    }
  }

  /* ─── Delete ─── */

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const url =
        deleteTarget.type === "provider"
          ? `/api/ads/providers/${deleteTarget.id}`
          : deleteTarget.type === "slot"
            ? `/api/ads/slots/${deleteTarget.id}`
            : `/api/ads/placements/${deleteTarget.id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        toast("Failed to delete", "error");
        return;
      }
      const data = await res.json();
      if (data.success) {
        toast(
          `${deleteTarget.type.charAt(0).toUpperCase() + deleteTarget.type.slice(1)} deleted`,
          "success",
        );
        fetchAll();
      } else {
        toast(data.error || "Delete failed", "error");
      }
    } catch {
      toast("Failed to delete", "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  /* ─── Placement CRUD ─── */

  function openPlacementCreate() {
    setEditingPlacement(null);
    setPlaceForm({
      providerId: providers[0]?.id || "",
      slotId: slots[0]?.id || "",
      adUnitId: "",
      adCode: "",
      customHtml: "",
      isActive: true,
      autoPlace: false,
      autoStrategy: "PARAGRAPH_COUNT",
      minParagraphs: 3,
      paragraphGap: 4,
      maxAdsPerPage: 5,
      lazyOffset: 200,
      refreshIntervalSec: 0,
      closeable: false,
      startDate: "",
      endDate: "",
    });
    setPlacementModal(true);
  }

  function openPlacementEdit(pl: Placement) {
    setEditingPlacement(pl);
    setPlaceForm({
      providerId: pl.providerId,
      slotId: pl.slotId,
      adUnitId: pl.adUnitId || "",
      adCode: pl.adCode || "",
      customHtml: pl.customHtml || "",
      isActive: pl.isActive,
      autoPlace: pl.autoPlace ?? false,
      autoStrategy: pl.autoStrategy || "PARAGRAPH_COUNT",
      minParagraphs: pl.minParagraphs ?? 3,
      paragraphGap: pl.paragraphGap ?? 4,
      maxAdsPerPage: pl.maxAdsPerPage ?? 5,
      lazyOffset: pl.lazyOffset ?? 200,
      refreshIntervalSec: pl.refreshIntervalSec ?? 0,
      closeable: pl.closeable ?? false,
      startDate: pl.startDate ? pl.startDate.split("T")[0] : "",
      endDate: pl.endDate ? pl.endDate.split("T")[0] : "",
    });
    setPlacementModal(true);
  }

  async function savePlacement() {
    if (!placeForm.providerId || !placeForm.slotId) {
      toast("Provider and Slot are required", "error");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        providerId: placeForm.providerId,
        slotId: placeForm.slotId,
        isActive: placeForm.isActive,
        autoPlace: placeForm.autoPlace,
        autoStrategy: placeForm.autoStrategy,
        minParagraphs: placeForm.minParagraphs,
        paragraphGap: placeForm.paragraphGap,
        maxAdsPerPage: placeForm.maxAdsPerPage,
        lazyOffset: placeForm.lazyOffset,
        refreshIntervalSec: placeForm.refreshIntervalSec,
        closeable: placeForm.closeable,
      };
      if (placeForm.adUnitId) body.adUnitId = placeForm.adUnitId;
      if (placeForm.adCode) body.adCode = placeForm.adCode;
      if (placeForm.customHtml) body.customHtml = placeForm.customHtml;
      if (placeForm.startDate)
        body.startDate = new Date(placeForm.startDate).toISOString();
      if (placeForm.endDate)
        body.endDate = new Date(placeForm.endDate).toISOString();

      const url = editingPlacement
        ? `/api/ads/placements/${editingPlacement.id}`
        : "/api/ads/placements";
      const method = editingPlacement ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast("Failed to save placement", "error");
        return;
      }
      const data = await res.json();
      if (data.success) {
        toast(
          editingPlacement ? "Placement updated" : "Placement created",
          "success",
        );
        setPlacementModal(false);
        fetchAll();
      } else {
        toast(data.error || "Failed", "error");
      }
    } catch {
      toast("Failed to save placement", "error");
    } finally {
      setSaving(false);
    }
  }

  /* ─── Provider kill switch ─── */

  async function toggleProviderKill(p: Provider) {
    try {
      const res = await fetch(`/api/ads/providers/${p.id}/kill-switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ killed: !p.killSwitch }),
      });
      if (!res.ok) {
        toast("Failed to toggle provider kill switch", "error");
        return;
      }
      const data = await res.json();
      if (data.success) {
        toast(
          p.killSwitch ? `${p.name} re-enabled` : `${p.name} killed`,
          p.killSwitch ? "success" : "warning",
        );
        fetchAll();
      }
    } catch {
      toast("Failed to toggle provider kill switch", "error");
    }
  }

  /* ─── Tab definitions ─── */

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "overview",
      label: "Overview",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      key: "providers",
      label: "Providers",
      icon: <Layers className="h-4 w-4" />,
    },
    {
      key: "slots",
      label: "Slots",
      icon: <MonitorSmartphone className="h-4 w-4" />,
    },
    {
      key: "placements",
      label: "Placements",
      icon: <Megaphone className="h-4 w-4" />,
    },
    {
      key: "settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4" />,
    },
    {
      key: "compliance",
      label: "Compliance",
      icon: <Shield className="h-4 w-4" />,
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            <Megaphone className="mr-2 inline h-6 w-6" /> Ads Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage ad providers, slots, placements &amp; compliance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <span>{adsOn ? "Ads On" : "Ads Off"}</span>
            <button
              type="button"
              role="switch"
              aria-checked={adsOn}
              onClick={toggleAds}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                adsOn ? "bg-green-500" : "bg-red-500"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  adsOn ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </label>
          <Button
            variant="outline"
            onClick={scanPages}
            icon={<ScanSearch className="h-4 w-4" />}
          >
            Scan Pages
          </Button>
        </div>
      </div>

      {/* Module status banner */}
      <div
        className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium ${
          adsOn
            ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
            : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
        }`}
      >
        {adsOn ? (
          <>
            <CheckCircle className="h-4 w-4" /> Ads module is{" "}
            <span className="font-semibold">enabled</span> &amp; active
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4" /> Ads module is{" "}
            <span className="font-semibold">disabled</span> — ads will not
            render on the site
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        {tabs.map((t) => (
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

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                label: "Total Providers",
                value: overview?.totalProviders ?? 0,
                sub: `${overview?.activeProviders ?? 0} active`,
                icon: <Layers className="h-5 w-5" />,
                color: "blue",
              },
              {
                label: "Ad Slots",
                value: overview?.totalSlots ?? 0,
                sub: `${overview?.activeSlots ?? 0} active`,
                icon: <MonitorSmartphone className="h-5 w-5" />,
                color: "emerald",
              },
              {
                label: "Placements",
                value: overview?.totalPlacements ?? 0,
                sub: `${overview?.activePlacements ?? 0} active`,
                icon: <Megaphone className="h-5 w-5" />,
                color: "purple",
              },
              {
                label: "Impressions",
                value: (overview?.totalImpressions ?? 0).toLocaleString(),
                sub: `RPM $${(overview?.rpm ?? 0).toFixed(2)}`,
                icon: <Eye className="h-5 w-5" />,
                color: "amber",
              },
              {
                label: "Clicks",
                value: (overview?.totalClicks ?? 0).toLocaleString(),
                sub: `CTR ${(overview?.ctr ?? 0).toFixed(2)}%`,
                icon: <MousePointerClick className="h-5 w-5" />,
                color: "rose",
              },
              {
                label: "Est. Revenue",
                value: `$${(overview?.totalRevenue ?? 0).toFixed(2)}`,
                sub: "All time",
                icon: <DollarSign className="h-5 w-5" />,
                color: "green",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {stat.label}
                  </p>
                  <span
                    className={
                      statColorClasses[stat.color] ??
                      "text-gray-600 dark:text-gray-400"
                    }
                  >
                    {stat.icon}
                  </span>
                </div>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {stat.sub}
                </p>
              </div>
            ))}
          </div>

          {/* Recent Providers */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
              Ad Providers
            </h3>
            <div className="space-y-2">
              {providers.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-700/50"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${p.isActive && !p.killSwitch ? "bg-green-500" : "bg-gray-400"}`}
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {p.type} &middot; Priority {p.priority}
                      </p>
                    </div>
                  </div>
                  {p.killSwitch && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      Killed
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "providers" && (
        <div>
          <div className="mb-4 flex justify-end">
            <Button
              onClick={openProviderCreate}
              icon={<Plus className="h-4 w-4" />}
            >
              New Provider
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
                    Type
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Max/Page
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {providers
                  .slice(
                    (provPage - 1) * ADMIN_PAGE_SIZE,
                    provPage * ADMIN_PAGE_SIZE,
                  )
                  .map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {p.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-700">
                          {p.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {p.priority}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            p.killSwitch
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : p.isActive
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {p.killSwitch
                            ? "Killed"
                            : p.isActive
                              ? "Active"
                              : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {p.maxPerPage}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => toggleProviderKill(p)}
                            title={p.killSwitch ? "Re-enable" : "Kill"}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                          >
                            {p.killSwitch ? (
                              <Power className="h-4 w-4 text-red-500" />
                            ) : (
                              <PowerOff className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => openProviderEdit(p)}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                type: "provider",
                                id: p.id,
                                name: p.name,
                              })
                            }
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {providers.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      No providers configured
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination
            page={provPage}
            totalPages={Math.ceil(providers.length / ADMIN_PAGE_SIZE)}
            total={providers.length}
            onPageChange={setProvPage}
          />
        </div>
      )}

      {tab === "slots" && (
        <div>
          <div className="mb-4 flex justify-end">
            <Button
              onClick={openSlotCreate}
              icon={<Plus className="h-4 w-4" />}
            >
              New Slot
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
                    Position
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Format
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Page Types
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {slots
                  .slice(
                    (slotPage - 1) * ADMIN_PAGE_SIZE,
                    slotPage * ADMIN_PAGE_SIZE,
                  )
                  .map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {s.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {s.position}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {s.format}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            s.isActive
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {s.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        <span className="text-xs">
                          {(s.pageTypes || []).length} types
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openSlotEdit(s)}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                type: "slot",
                                id: s.id,
                                name: s.name,
                              })
                            }
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {slots.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      No slots configured
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination
            page={slotPage}
            totalPages={Math.ceil(slots.length / ADMIN_PAGE_SIZE)}
            total={slots.length}
            onPageChange={setSlotPage}
          />
        </div>
      )}

      {tab === "placements" && (
        <div className="space-y-4">
          {/* Header with New button */}
          <div className="mb-4 flex justify-end">
            <Button
              onClick={openPlacementCreate}
              icon={<Plus className="h-4 w-4" />}
            >
              New Placement
            </Button>
          </div>

          {/* Unoccupied Slots Banner */}
          {(() => {
            const occupiedSlotIds = new Set(
              placements.filter((p) => p.isActive).map((p) => p.slotId),
            );
            const unoccupied = slots.filter(
              (s) => s.isActive && !occupiedSlotIds.has(s.id),
            );
            if (unoccupied.length === 0) return null;
            return (
              <div className="rounded-xl border-2 border-dashed border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <h3 className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {unoccupied.length} slot{unoccupied.length > 1 ? "s" : ""}{" "}
                  reserved (no active placement)
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {unoccupied.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 dark:bg-gray-800"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-amber-100 dark:bg-amber-900/40">
                        <Megaphone className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {slot.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {slot.position} &middot; Reserved for Ads
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Placements Table */}
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Provider
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Slot
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Ad Unit
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Dates
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
                {placements
                  .slice(
                    (placePage - 1) * ADMIN_PAGE_SIZE,
                    placePage * ADMIN_PAGE_SIZE,
                  )
                  .map((pl) => {
                    const prov = providers.find((p) => p.id === pl.providerId);
                    const slot = slots.find((s) => s.id === pl.slotId);
                    return (
                      <tr
                        key={pl.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {prov?.name ?? pl.providerId}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {slot?.name ?? pl.slotId}
                            </span>
                            {slot && (
                              <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                {slot.position}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          {pl.adUnitId || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              pl.isActive
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                            }`}
                          >
                            {pl.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          {pl.startDate
                            ? new Date(pl.startDate).toLocaleDateString()
                            : "—"}{" "}
                          →{" "}
                          {pl.endDate
                            ? new Date(pl.endDate).toLocaleDateString()
                            : "∞"}
                        </td>
                        <td className="px-4 py-3">
                          {pl.autoPlace ? (
                            <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              Auto
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => openPlacementEdit(pl)}
                              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteTarget({
                                  type: "placement",
                                  id: pl.id,
                                  name: `${prov?.name || "?"} → ${slot?.name || "?"}`,
                                })
                              }
                              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {placements.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      No placements configured — click &ldquo;New
                      Placement&rdquo; to create one
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination
            page={placePage}
            totalPages={Math.ceil(placements.length / ADMIN_PAGE_SIZE)}
            total={placements.length}
            onPageChange={setPlacePage}
          />
        </div>
      )}

      {tab === "settings" && <AdsSettingsPanel />}

      {tab === "compliance" && <CompliancePanel />}

      {/* ─── Provider Modal ─── */}
      <Modal
        open={providerModal}
        onClose={() => setProviderModal(false)}
        title={editingProvider ? "Edit Provider" : "New Provider"}
        size="lg"
      >
        <div className="space-y-4">
          {/* Row 1: Name + Type */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              value={provForm.name}
              onChange={(e) =>
                setProvForm({ ...provForm, name: e.target.value })
              }
              placeholder="Provider name"
            />
            <Select
              label="Type"
              value={provForm.type}
              onChange={(e) =>
                setProvForm({ ...provForm, type: e.target.value })
              }
            >
              {[
                "ADSENSE",
                "AD_MANAGER",
                "MEDIA_NET",
                "AMAZON_APS",
                "EZOIC",
                "RAPTIVE",
                "MONUMETRIC",
                "PROPELLER_ADS",
                "SOVRN",
                "OUTBRAIN",
                "CUSTOM",
              ].map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </div>
          {/* Row 2: Priority + Max Per Page + Load Strategy + Active */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Input
              label="Priority"
              type="number"
              value={String(provForm.priority)}
              onChange={(e) =>
                setProvForm({
                  ...provForm,
                  priority: parseInt(e.target.value) || 0,
                })
              }
            />
            <Input
              label="Max Per Page"
              type="number"
              value={String(provForm.maxPerPage)}
              onChange={(e) =>
                setProvForm({
                  ...provForm,
                  maxPerPage: parseInt(e.target.value) || 3,
                })
              }
            />
            <Select
              label="Load Strategy"
              value={provForm.loadStrategy}
              onChange={(e) =>
                setProvForm({ ...provForm, loadStrategy: e.target.value })
              }
            >
              <option value="eager">Eager</option>
              <option value="lazy">Lazy</option>
              <option value="intersection">Intersection</option>
              <option value="idle">Idle</option>
            </Select>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={provForm.isActive}
                  onChange={(e) =>
                    setProvForm({ ...provForm, isActive: e.target.checked })
                  }
                  className="rounded"
                />
                Active
              </label>
            </div>
          </div>
          {/* Row 3: Client ID + Publisher ID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Client ID"
              value={provForm.clientId}
              onChange={(e) =>
                setProvForm({ ...provForm, clientId: e.target.value })
              }
              placeholder="Optional"
            />
            <Input
              label="Publisher ID"
              value={provForm.publisherId}
              onChange={(e) =>
                setProvForm({ ...provForm, publisherId: e.target.value })
              }
              placeholder="Optional"
            />
          </div>
          {/* Row 4: Script URL (full width) */}
          <Input
            label="Script URL"
            value={provForm.scriptUrl}
            onChange={(e) =>
              setProvForm({ ...provForm, scriptUrl: e.target.value })
            }
            placeholder="Optional"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setProviderModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveProvider} loading={saving}>
              {editingProvider ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Slot Modal ─── */}
      <Modal
        open={slotModal}
        onClose={() => setSlotModal(false)}
        title={editingSlot ? "Edit Slot" : "New Slot"}
        size="lg"
      >
        <div className="space-y-4">
          {/* Row 1: Name + Position + Format */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Name"
              value={slotForm.name}
              onChange={(e) =>
                setSlotForm({ ...slotForm, name: e.target.value })
              }
              placeholder="Slot name"
            />
            <Select
              label="Position"
              value={slotForm.position}
              onChange={(e) =>
                setSlotForm({ ...slotForm, position: e.target.value })
              }
            >
              {[
                "HEADER",
                "FOOTER",
                "SIDEBAR",
                "SIDEBAR_STICKY",
                "IN_CONTENT",
                "IN_ARTICLE",
                "IN_FEED",
                "BETWEEN_POSTS",
                "AFTER_PARAGRAPH",
                "BEFORE_COMMENTS",
                "AFTER_COMMENTS",
                "WIDGET_TOP",
                "WIDGET_BOTTOM",
                "STICKY_TOP",
                "STICKY_BOTTOM",
                "AUTO",
              ].map((p) => (
                <option key={p} value={p}>
                  {p.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
            <Select
              label="Format"
              value={slotForm.format}
              onChange={(e) =>
                setSlotForm({ ...slotForm, format: e.target.value })
              }
            >
              {[
                "DISPLAY",
                "NATIVE",
                "VIDEO",
                "RICH_MEDIA",
                "TEXT",
                "LINK_UNIT",
                "IN_ARTICLE",
                "IN_FEED",
                "INTERSTITIAL",
                "ANCHOR",
                "MULTIPLEX",
              ].map((f) => (
                <option key={f} value={f}>
                  {f.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </div>
          {/* Row 2: Page Types (full width) */}
          <Input
            label="Page Types"
            value={slotForm.pageTypes}
            onChange={(e) =>
              setSlotForm({ ...slotForm, pageTypes: e.target.value })
            }
            placeholder="home, blog, category:tech (comma-separated)"
            hint="Leave empty for all pages"
          />
          {/* Row 3: Max Width + Max Height + Render Priority */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Input
              label="Max Width (px)"
              type="number"
              value={slotForm.maxWidth}
              onChange={(e) =>
                setSlotForm({ ...slotForm, maxWidth: e.target.value })
              }
              placeholder="—"
            />
            <Input
              label="Max Height (px)"
              type="number"
              value={slotForm.maxHeight}
              onChange={(e) =>
                setSlotForm({ ...slotForm, maxHeight: e.target.value })
              }
              placeholder="—"
            />
            <Input
              label="Render Priority"
              type="number"
              value={slotForm.renderPriority}
              onChange={(e) =>
                setSlotForm({
                  ...slotForm,
                  renderPriority: parseInt(e.target.value) || 0,
                })
              }
              placeholder="0"
            />
            <div />
          </div>
          {/* Row 4: Active + Responsive */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={slotForm.isActive}
                  onChange={(e) =>
                    setSlotForm({ ...slotForm, isActive: e.target.checked })
                  }
                  className="rounded"
                />
                Active
              </label>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={slotForm.responsive}
                  onChange={(e) =>
                    setSlotForm({ ...slotForm, responsive: e.target.checked })
                  }
                  className="rounded"
                />
                Responsive
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setSlotModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveSlot} loading={saving}>
              {editingSlot ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Placement Modal ─── */}
      <Modal
        open={placementModal}
        onClose={() => setPlacementModal(false)}
        title={editingPlacement ? "Edit Placement" : "New Placement"}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Row 1: Provider + Slot */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Provider"
              value={placeForm.providerId}
              onChange={(e) =>
                setPlaceForm({ ...placeForm, providerId: e.target.value })
              }
            >
              <option value="">Select provider...</option>
              {providers
                .filter((p) => p.isActive)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.type})
                  </option>
                ))}
            </Select>
            <Select
              label="Slot"
              value={placeForm.slotId}
              onChange={(e) =>
                setPlaceForm({ ...placeForm, slotId: e.target.value })
              }
            >
              <option value="">Select slot...</option>
              {slots
                .filter((s) => s.isActive)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.position})
                  </option>
                ))}
            </Select>
          </div>

          {/* Row 2: Ad Unit ID + Active + Closeable */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Input
              label="Ad Unit ID"
              value={placeForm.adUnitId}
              onChange={(e) =>
                setPlaceForm({ ...placeForm, adUnitId: e.target.value })
              }
              placeholder="e.g. ca-pub-xxx/123"
            />
            <Input
              label="Lazy Offset (px)"
              type="number"
              value={String(placeForm.lazyOffset)}
              onChange={(e) =>
                setPlaceForm({
                  ...placeForm,
                  lazyOffset: parseInt(e.target.value) || 200,
                })
              }
            />
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={placeForm.isActive}
                  onChange={(e) =>
                    setPlaceForm({ ...placeForm, isActive: e.target.checked })
                  }
                  className="rounded"
                />
                Active
              </label>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={placeForm.closeable}
                  onChange={(e) =>
                    setPlaceForm({ ...placeForm, closeable: e.target.checked })
                  }
                  className="rounded"
                />
                Closeable
              </label>
            </div>
          </div>

          {/* Row 3: Ad Code */}
          <Textarea
            label="Ad Code"
            rows={4}
            value={placeForm.adCode}
            onChange={(e) =>
              setPlaceForm({ ...placeForm, adCode: e.target.value })
            }
            placeholder="Provider embed code (e.g. AdSense <ins> tag)"
          />

          {/* Row 4: Custom HTML */}
          <Textarea
            label="Custom HTML"
            rows={4}
            value={placeForm.customHtml}
            onChange={(e) =>
              setPlaceForm({ ...placeForm, customHtml: e.target.value })
            }
            placeholder="Custom HTML for direct-sold ads"
          />

          {/* Row 5: Auto-Placement Settings */}
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={placeForm.autoPlace}
                onChange={(e) =>
                  setPlaceForm({ ...placeForm, autoPlace: e.target.checked })
                }
                className="rounded"
              />
              Auto-Place (inject between paragraphs)
            </label>
            {placeForm.autoPlace && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Select
                  label="Strategy"
                  value={placeForm.autoStrategy}
                  onChange={(e) =>
                    setPlaceForm({ ...placeForm, autoStrategy: e.target.value })
                  }
                >
                  {[
                    "DENSITY_BASED",
                    "PARAGRAPH_COUNT",
                    "CONTENT_AWARE",
                    "VIEWPORT_BASED",
                    "ENGAGEMENT_BASED",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Min Paragraphs"
                  type="number"
                  value={String(placeForm.minParagraphs)}
                  onChange={(e) =>
                    setPlaceForm({
                      ...placeForm,
                      minParagraphs: parseInt(e.target.value) || 3,
                    })
                  }
                />
                <Input
                  label="Paragraph Gap"
                  type="number"
                  value={String(placeForm.paragraphGap)}
                  onChange={(e) =>
                    setPlaceForm({
                      ...placeForm,
                      paragraphGap: parseInt(e.target.value) || 4,
                    })
                  }
                />
                <Input
                  label="Max Ads/Page"
                  type="number"
                  value={String(placeForm.maxAdsPerPage)}
                  onChange={(e) =>
                    setPlaceForm({
                      ...placeForm,
                      maxAdsPerPage: parseInt(e.target.value) || 5,
                    })
                  }
                />
              </div>
            )}
          </div>

          {/* Row 6: Refresh + Dates */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Refresh Interval (sec)"
              type="number"
              value={String(placeForm.refreshIntervalSec)}
              onChange={(e) =>
                setPlaceForm({
                  ...placeForm,
                  refreshIntervalSec: parseInt(e.target.value) || 0,
                })
              }
              hint="0 = no refresh"
            />
            <Input
              label="Start Date"
              type="date"
              value={placeForm.startDate}
              onChange={(e) =>
                setPlaceForm({ ...placeForm, startDate: e.target.value })
              }
            />
            <Input
              label="End Date"
              type="date"
              value={placeForm.endDate}
              onChange={(e) =>
                setPlaceForm({ ...placeForm, endDate: e.target.value })
              }
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPlacementModal(false)}>
              Cancel
            </Button>
            <Button onClick={savePlacement} loading={saving}>
              {editingPlacement ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Confirmation ─── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Delete"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to delete{" "}
          <strong className="text-gray-900 dark:text-white">
            {deleteTarget?.name}
          </strong>
          ? This action cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>

      {/* ─── Scan Results Modal ─── */}
      <Modal
        open={scanResultsOpen}
        onClose={() => setScanResultsOpen(false)}
        title="Page Scan Results"
        size="lg"
      >
        {scanResults && (
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            {/* Health Summary */}
            {scanResults.health && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Coverage Health
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    {
                      label: "Total Pages",
                      value: scanResults.health.totalPageTypes,
                      color: "blue",
                    },
                    {
                      label: "Covered",
                      value: scanResults.health.coveredPageTypes,
                      color: "green",
                    },
                    {
                      label: "Uncovered",
                      value: scanResults.health.uncoveredPageTypes,
                      color: "amber",
                    },
                    {
                      label: "Over-served",
                      value: scanResults.health.overServedPageTypes,
                      color: "red",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className={`rounded-lg border p-3 ${scanColorClasses[s.color] ?? ""}`}
                    >
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {s.label}
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Recommendations */}
                {(scanResults.health.recommendations?.length ?? 0) > 0 && (
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Recommendations
                    </h5>
                    {scanResults.health.recommendations?.map(
                      (rec: string, i: number) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                        >
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{rec}</span>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Discovered Page Types */}
            {(scanResults.pageTypes?.length ?? 0) > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                  Discovered Page Types ({scanResults.count})
                </h4>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                          Page Type
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                          Kind
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                          Traffic
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                          Ad Slots
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {scanResults.pageTypes!.map((pt) => (
                        <tr
                          key={pt.key}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                        >
                          <td className="px-3 py-2">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {pt.label}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                {pt.key}
                              </p>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                                pt.kind === "static"
                                  ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                  : pt.kind === "blog"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    : pt.kind === "category"
                                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                      : pt.kind === "tag"
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              }`}
                            >
                              {pt.kind}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="h-1.5 w-16 rounded-full bg-gray-200 dark:bg-gray-700">
                                <div
                                  className={`h-full rounded-full ${pt.trafficScore >= 70 ? "bg-green-500" : pt.trafficScore >= 40 ? "bg-amber-500" : "bg-gray-400"}`}
                                  style={{ width: `${pt.trafficScore}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {pt.trafficScore}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                pt.slotCoverage === 0
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  : pt.slotCoverage > 3
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              }`}
                            >
                              {pt.slotCoverage}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setScanResultsOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ─── Ads Settings Panel ─── */

function AdsSettingsPanel() {
  const [config, setConfig] = useState<Record<
    string,
    string | number | boolean | string[] | Record<string, unknown> | undefined
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/ads/settings")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => {
        if (d.success) setConfig(d.data);
      })
      .catch(() => toast("Failed to load ad settings", "error"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/ads/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        toast("Failed to save settings", "error");
        return;
      }
      const data = await res.json();
      if (data.success) {
        toast("Ad settings saved", "success");
        setConfig(data.data);
      } else {
        toast(data.error || "Failed to save", "error");
      }
    } catch {
      toast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !config) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const Toggle = ({
    label,
    field,
    hint,
  }: {
    label: string;
    field: string;
    hint?: string;
  }) => (
    <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <input
        type="checkbox"
        checked={!!config[field]}
        onChange={(e) => setConfig({ ...config, [field]: e.target.checked })}
        className="mt-0.5 rounded"
      />
      <div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
    </label>
  );

  const NumberField = ({
    label,
    field,
    hint,
  }: {
    label: string;
    field: string;
    hint?: string;
  }) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <input
        type="number"
        value={
          (config[field] as string | number | readonly string[] | undefined) ??
          0
        }
        onChange={(e) =>
          setConfig({ ...config, [field]: parseInt(e.target.value) || 0 })
        }
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
      />
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Auto-Placement */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
          Auto-Placement
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label="Enable Auto-Placement"
            field="enableAutoPlacement"
            hint="Automatically inject ads between paragraphs"
          />
          <Toggle
            label="Skip Code Blocks"
            field="skipCodeBlocks"
            hint="Don't place ads inside code blocks"
          />
          <Toggle
            label="Respect Section Breaks"
            field="respectSectionBreaks"
            hint="Use headings as natural break points"
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <NumberField
            label="Min Paragraphs Before First Ad"
            field="defaultMinParagraphs"
            hint="Paragraphs before the first in-article ad"
          />
          <NumberField
            label="Paragraph Gap"
            field="defaultParagraphGap"
            hint="Paragraphs between consecutive ads"
          />
          <NumberField
            label="Global Max Ads/Page"
            field="globalMaxAdsPerPage"
            hint="Hard cap on total ads per page"
          />
        </div>
      </section>

      {/* Performance & Loading */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
          Performance &amp; Loading
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label="Lazy Load Ads"
            field="lazyLoadAds"
            hint="Only load ads when they enter the viewport"
          />
          <Toggle
            label="Defer Until LCP"
            field="deferUntilLcp"
            hint="Wait for Largest Contentful Paint before loading ads"
          />
          <Toggle
            label="Enable Ad Refresh"
            field="enableAdRefresh"
            hint="Allow ads to refresh after an interval"
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <NumberField
            label="Default Lazy Offset (px)"
            field="defaultLazyOffset"
            hint="Distance from viewport to start loading"
          />
          <NumberField
            label="Min Refresh Interval (sec)"
            field="minRefreshInterval"
            hint="Minimum seconds between refreshes"
          />
          <NumberField
            label="Cache TTL (sec)"
            field="cacheTtlSeconds"
            hint="How long to cache placement data"
          />
        </div>
      </section>

      {/* Responsive & Layout */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
          Responsive &amp; Layout
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label="Enable Responsive Ads"
            field="enableResponsive"
            hint="Size ads based on viewport breakpoints"
          />
          <Toggle
            label="Enable Widget Ads"
            field="enableWidgetAds"
            hint="Allow ads in widget positions"
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <NumberField
            label="Max Viewport Ad Coverage (%)"
            field="maxViewportAdCoverage"
            hint="Maximum % of viewport filled by ads"
          />
          <NumberField
            label="Min Ad Spacing (px)"
            field="minAdSpacingPx"
            hint="Minimum pixels between ads"
          />
          <NumberField
            label="Min Content Length"
            field="minContentLength"
            hint="Don't show ads on pages shorter than this"
          />
        </div>
      </section>

      {/* Compliance & Privacy */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
          Compliance &amp; Privacy
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label="Sanitize Ad Code"
            field="sanitizeAdCode"
            hint="Strip dangerous script patterns from ad code"
          />
          <Toggle
            label="Require Cookie Consent"
            field="requireConsent"
            hint="Only load ads after user consents to cookies"
          />
          <Toggle
            label="Enable Analytics"
            field="enableAnalytics"
            hint="Track impressions, clicks, and viewability"
          />
          <Toggle
            label="Enable Compliance Scanning"
            field="enableComplianceScanning"
            hint="Run periodic compliance checks"
          />
          <Toggle
            label="Enable ads.txt"
            field="enableAdsTxt"
            hint="Serve an ads.txt file for authorized sellers"
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <NumberField
            label="Event Rate Limit (max)"
            field="eventRateLimitMax"
            hint="Max tracking events per window"
          />
          <NumberField
            label="Event Rate Window (ms)"
            field="eventRateLimitWindowMs"
            hint="Rate limit window in milliseconds"
          />
        </div>
      </section>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={save} loading={saving}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}

/* ─── Compliance Panel ─── */

function CompliancePanel() {
  const [result, setResult] = useState<{
    scannedCount?: number;
    passedCount?: number;
    issues?: Array<{
      placementId: string;
      severity: string;
      message: string;
      rule: string;
    }>;
  } | null>(null);
  const [scanning, setScanning] = useState(false);

  async function runScan() {
    setScanning(true);
    try {
      const res = await fetch("/api/ads/compliance");
      if (!res.ok) {
        toast("Compliance check failed", "error");
        return;
      }
      const data = await res.json();
      if (data.success) setResult(data.data);
      else toast(data.error || "Compliance check failed", "error");
    } catch {
      toast("Compliance check failed", "error");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Run an ad compliance audit to detect policy violations
        </p>
        <Button
          onClick={runScan}
          loading={scanning}
          icon={<Shield className="h-4 w-4" />}
        >
          Run Audit
        </Button>
      </div>
      {result && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            {result.issues?.length === 0 ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
            <span
              className={`font-semibold ${result.issues?.length === 0 ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}
            >
              {result.issues?.length === 0
                ? `All ${result.scannedCount ?? 0} checks passed`
                : `${result.issues?.length ?? 0} issue(s) found in ${result.scannedCount ?? 0} placements`}
            </span>
          </div>
          {(result.issues?.length ?? 0) > 0 && (
            <ul className="space-y-2">
              {result.issues!.map((issue, i: number) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{issue.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
