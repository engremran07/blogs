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
  RefreshCw,
  Eye,
  MousePointer,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Shield,
  ScanSearch,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";

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
}

type Tab = "overview" | "providers" | "slots" | "placements" | "compliance";

/* ─── Page ─── */

export default function AdsAdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [adsOn, setAdsOn] = useState(true);

  // Modal state
  const [providerModal, setProviderModal] = useState(false);
  const [slotModal, setSlotModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Provider form
  const [provForm, setProvForm] = useState({
    name: "", type: "ADSENSE", priority: 0, isActive: true,
    clientId: "", publisherId: "", scriptUrl: "",
    maxPerPage: 3, loadStrategy: "lazy",
  });

  // Slot form
  const [slotForm, setSlotForm] = useState({
    name: "", position: "SIDEBAR", format: "DISPLAY",
    isActive: true, responsive: true, pageTypes: "",
    maxWidth: "", maxHeight: "",
  });

  /* ─── Fetching ─── */

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, provRes, slotRes, placRes] = await Promise.all([
        fetch("/api/ads/overview").then((r) => r.json()),
        fetch("/api/ads/providers").then((r) => r.json()),
        fetch("/api/ads/slots").then((r) => r.json()),
        fetch("/api/ads/placements").then((r) => r.json()),
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

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Fetch module enabled status
  useEffect(() => {
    fetch("/api/settings/module-status")
      .then((r) => r.json())
      .then((d) => { if (d.success) setAdsOn(d.data.ads); })
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
      const data = await res.json();
      if (data.success) {
        const newState = !adsOn;
        setAdsOn(newState);
        toast(newState ? "Ads enabled" : "Ads disabled", newState ? "success" : "warning");
        window.dispatchEvent(new CustomEvent("module-status-changed", { detail: { ads: newState } }));
        fetchAll();
      }
    } catch {
      toast("Failed to toggle ads", "error");
    }
  }

  // Scan results state
  const [scanResults, setScanResults] = useState<any>(null);
  const [scanResultsOpen, setScanResultsOpen] = useState(false);

  /* ─── Scan Pages ─── */

  async function scanPages() {
    try {
      toast("Scanning pages…", "info");
      // Run sync (POST) then fetch full results (GET) in parallel with refresh
      const res = await fetch("/api/ads/scan-pages", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast(
          data.data?.message ||
            `Scan complete: discovered ${data.data?.discovered ?? 0} page types, added to ${data.data?.added ?? 0} slots, pruned from ${data.data?.pruned ?? 0} slots`,
          "success",
        );
        // Fetch the full scan results with health report
        const detailRes = await fetch("/api/ads/scan-pages");
        const detailData = await detailRes.json();
        if (detailData.success) {
          setScanResults(detailData.data);
          setScanResultsOpen(true);
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
    setProvForm({ name: "", type: "ADSENSE", priority: 0, isActive: true, clientId: "", publisherId: "", scriptUrl: "", maxPerPage: 3, loadStrategy: "lazy" });
    setProviderModal(true);
  }

  function openProviderEdit(p: Provider) {
    setEditingProvider(p);
    setProvForm({
      name: p.name, type: p.type, priority: p.priority, isActive: p.isActive,
      clientId: "", publisherId: "", scriptUrl: "",
      maxPerPage: p.maxPerPage, loadStrategy: p.loadStrategy,
    });
    setProviderModal(true);
  }

  async function saveProvider() {
    if (!provForm.name.trim()) { toast("Name is required", "error"); return; }
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

      const url = editingProvider ? `/api/ads/providers/${editingProvider.id}` : "/api/ads/providers";
      const method = editingProvider ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        toast(editingProvider ? "Provider updated" : "Provider created", "success");
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
    setSlotForm({ name: "", position: "SIDEBAR", format: "DISPLAY", isActive: true, responsive: true, pageTypes: "", maxWidth: "", maxHeight: "" });
    setSlotModal(true);
  }

  function openSlotEdit(s: Slot) {
    setEditingSlot(s);
    setSlotForm({
      name: s.name, position: s.position, format: s.format,
      isActive: s.isActive, responsive: s.responsive,
      pageTypes: (s.pageTypes || []).join(", "),
      maxWidth: s.maxWidth?.toString() ?? "", maxHeight: s.maxHeight?.toString() ?? "",
    });
    setSlotModal(true);
  }

  async function saveSlot() {
    if (!slotForm.name.trim()) { toast("Name is required", "error"); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: slotForm.name,
        position: slotForm.position,
        format: slotForm.format,
        isActive: slotForm.isActive,
        responsive: slotForm.responsive,
        pageTypes: slotForm.pageTypes ? slotForm.pageTypes.split(",").map((s) => s.trim()).filter(Boolean) : [],
      };
      if (slotForm.maxWidth) body.maxWidth = parseInt(slotForm.maxWidth);
      if (slotForm.maxHeight) body.maxHeight = parseInt(slotForm.maxHeight);

      const url = editingSlot ? `/api/ads/slots/${editingSlot.id}` : "/api/ads/slots";
      const method = editingSlot ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
      const url = deleteTarget.type === "provider"
        ? `/api/ads/providers/${deleteTarget.id}`
        : `/api/ads/slots/${deleteTarget.id}`;
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast(`${deleteTarget.type === "provider" ? "Provider" : "Slot"} deleted`, "success");
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

  /* ─── Provider kill switch ─── */

  async function toggleProviderKill(p: Provider) {
    try {
      const res = await fetch(`/api/ads/providers/${p.id}/kill-switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ killed: !p.killSwitch }),
      });
      const data = await res.json();
      if (data.success) {
        toast(p.killSwitch ? `${p.name} re-enabled` : `${p.name} killed`, p.killSwitch ? "success" : "warning");
        fetchAll();
      }
    } catch {
      toast("Failed to toggle provider kill switch", "error");
    }
  }

  /* ─── Tab definitions ─── */

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
    { key: "providers", label: "Providers", icon: <Layers className="h-4 w-4" /> },
    { key: "slots", label: "Slots", icon: <MonitorSmartphone className="h-4 w-4" /> },
    { key: "placements", label: "Placements", icon: <Megaphone className="h-4 w-4" /> },
    { key: "compliance", label: "Compliance", icon: <Shield className="h-4 w-4" /> },
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
          <Button variant="outline" onClick={scanPages} icon={<ScanSearch className="h-4 w-4" />}>
            Scan Pages
          </Button>
        </div>
      </div>

      {/* Module status banner */}
      <div className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium ${
        adsOn
          ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
          : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
      }`}>
        {adsOn
          ? <><CheckCircle className="h-4 w-4" /> Ads module is <span className="font-semibold">enabled</span> &amp; active</>
          : <><AlertTriangle className="h-4 w-4" /> Ads module is <span className="font-semibold">disabled</span> — ads will not render on the site</>
        }
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
              { label: "Total Providers", value: overview?.totalProviders ?? 0, active: overview?.activeProviders ?? 0, icon: <Layers className="h-5 w-5" />, color: "blue" },
              { label: "Ad Slots", value: overview?.totalSlots ?? 0, active: overview?.activeSlots ?? 0, icon: <MonitorSmartphone className="h-5 w-5" />, color: "emerald" },
              { label: "Placements", value: overview?.totalPlacements ?? 0, active: overview?.activePlacements ?? 0, icon: <Megaphone className="h-5 w-5" />, color: "purple" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <span className={`text-${stat.color}-600 dark:text-${stat.color}-400`}>{stat.icon}</span>
                </div>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{stat.active} active</p>
              </div>
            ))}
          </div>

          {/* Recent Providers */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Ad Providers</h3>
            <div className="space-y-2">
              {providers.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${p.isActive && !p.killSwitch ? "bg-green-500" : "bg-gray-400"}`} />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{p.type} &middot; Priority {p.priority}</p>
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
            <Button onClick={openProviderCreate} icon={<Plus className="h-4 w-4" />}>New Provider</Button>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Priority</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Max/Page</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {providers.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-700">{p.type}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.priority}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.killSwitch
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : p.isActive
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      }`}>
                        {p.killSwitch ? "Killed" : p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.maxPerPage}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => toggleProviderKill(p)} title={p.killSwitch ? "Re-enable" : "Kill"} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300">
                          {p.killSwitch ? <Power className="h-4 w-4 text-red-500" /> : <PowerOff className="h-4 w-4" />}
                        </button>
                        <button onClick={() => openProviderEdit(p)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget({ type: "provider", id: p.id, name: p.name })} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {providers.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No providers configured</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "slots" && (
        <div>
          <div className="mb-4 flex justify-end">
            <Button onClick={openSlotCreate} icon={<Plus className="h-4 w-4" />}>New Slot</Button>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Position</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Format</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Page Types</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {slots.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{s.position}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.format}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        s.isActive
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      }`}>
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      <span className="text-xs">{(s.pageTypes || []).length} types</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openSlotEdit(s)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget({ type: "slot", id: s.id, name: s.name })} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {slots.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No slots configured</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "placements" && (
        <div className="space-y-4">
          {/* Unoccupied Slots Banner */}
          {(() => {
            const occupiedSlotIds = new Set(placements.filter((p) => p.isActive).map((p) => p.slotId));
            const unoccupied = slots.filter((s) => s.isActive && !occupiedSlotIds.has(s.id));
            if (unoccupied.length === 0) return null;
            return (
              <div className="rounded-xl border-2 border-dashed border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <h3 className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {unoccupied.length} slot{unoccupied.length > 1 ? "s" : ""} reserved (no active placement)
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {unoccupied.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 dark:bg-gray-800">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-amber-100 dark:bg-amber-900/40">
                        <Megaphone className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{slot.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{slot.position} &middot; Reserved for Ads</p>
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
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Provider</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Slot</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Dates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {placements.map((pl) => {
                  const prov = providers.find((p) => p.id === pl.providerId);
                  const slot = slots.find((s) => s.id === pl.slotId);
                  return (
                    <tr key={pl.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{prov?.name ?? pl.providerId}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{slot?.name ?? pl.slotId}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          pl.isActive
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        }`}>
                          {pl.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {pl.startDate ? new Date(pl.startDate).toLocaleDateString() : "—"} → {pl.endDate ? new Date(pl.endDate).toLocaleDateString() : "∞"}
                      </td>
                    </tr>
                  );
                })}
                {placements.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No placements configured</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "compliance" && (
        <CompliancePanel />
      )}

      {/* ─── Provider Modal ─── */}
      <Modal open={providerModal} onClose={() => setProviderModal(false)} title={editingProvider ? "Edit Provider" : "New Provider"} size="lg">
        <div className="space-y-4">
          {/* Row 1: Name + Type */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Name" value={provForm.name} onChange={(e) => setProvForm({ ...provForm, name: e.target.value })} placeholder="Provider name" />
            <Select label="Type" value={provForm.type} onChange={(e) => setProvForm({ ...provForm, type: e.target.value })}>
              {["ADSENSE","AD_MANAGER","MEDIA_NET","AMAZON_APS","EZOIC","RAPTIVE","MONUMETRIC","PROPELLER_ADS","SOVRN","OUTBRAIN","CUSTOM"].map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </Select>
          </div>
          {/* Row 2: Priority + Max Per Page + Load Strategy + Active */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Input label="Priority" type="number" value={String(provForm.priority)} onChange={(e) => setProvForm({ ...provForm, priority: parseInt(e.target.value) || 0 })} />
            <Input label="Max Per Page" type="number" value={String(provForm.maxPerPage)} onChange={(e) => setProvForm({ ...provForm, maxPerPage: parseInt(e.target.value) || 3 })} />
            <Select label="Load Strategy" value={provForm.loadStrategy} onChange={(e) => setProvForm({ ...provForm, loadStrategy: e.target.value })}>
              <option value="eager">Eager</option>
              <option value="lazy">Lazy</option>
              <option value="intersection">Intersection</option>
              <option value="idle">Idle</option>
            </Select>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={provForm.isActive} onChange={(e) => setProvForm({ ...provForm, isActive: e.target.checked })} className="rounded" />
                Active
              </label>
            </div>
          </div>
          {/* Row 3: Client ID + Publisher ID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Client ID" value={provForm.clientId} onChange={(e) => setProvForm({ ...provForm, clientId: e.target.value })} placeholder="Optional" />
            <Input label="Publisher ID" value={provForm.publisherId} onChange={(e) => setProvForm({ ...provForm, publisherId: e.target.value })} placeholder="Optional" />
          </div>
          {/* Row 4: Script URL (full width) */}
          <Input label="Script URL" value={provForm.scriptUrl} onChange={(e) => setProvForm({ ...provForm, scriptUrl: e.target.value })} placeholder="Optional" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setProviderModal(false)}>Cancel</Button>
            <Button onClick={saveProvider} loading={saving}>{editingProvider ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>

      {/* ─── Slot Modal ─── */}
      <Modal open={slotModal} onClose={() => setSlotModal(false)} title={editingSlot ? "Edit Slot" : "New Slot"} size="lg">
        <div className="space-y-4">
          {/* Row 1: Name + Position + Format */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Name" value={slotForm.name} onChange={(e) => setSlotForm({ ...slotForm, name: e.target.value })} placeholder="Slot name" />
            <Select label="Position" value={slotForm.position} onChange={(e) => setSlotForm({ ...slotForm, position: e.target.value })}>
              {["HEADER","FOOTER","SIDEBAR","SIDEBAR_STICKY","IN_CONTENT","IN_ARTICLE","IN_FEED","BETWEEN_POSTS","AFTER_PARAGRAPH","BEFORE_COMMENTS","AFTER_COMMENTS","WIDGET_TOP","WIDGET_BOTTOM","STICKY_TOP","STICKY_BOTTOM","AUTO"].map((p) => (
                <option key={p} value={p}>{p.replace(/_/g, " ")}</option>
              ))}
            </Select>
            <Select label="Format" value={slotForm.format} onChange={(e) => setSlotForm({ ...slotForm, format: e.target.value })}>
              {["DISPLAY","NATIVE","VIDEO","RICH_MEDIA","TEXT","LINK_UNIT","IN_ARTICLE","IN_FEED","INTERSTITIAL","ANCHOR","MULTIPLEX"].map((f) => (
                <option key={f} value={f}>{f.replace(/_/g, " ")}</option>
              ))}
            </Select>
          </div>
          {/* Row 2: Page Types (full width) */}
          <Input label="Page Types" value={slotForm.pageTypes} onChange={(e) => setSlotForm({ ...slotForm, pageTypes: e.target.value })} placeholder="home, blog, category:tech (comma-separated)" hint="Leave empty for all pages" />
          {/* Row 3: Max Width + Max Height + Active + Responsive */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Input label="Max Width (px)" type="number" value={slotForm.maxWidth} onChange={(e) => setSlotForm({ ...slotForm, maxWidth: e.target.value })} placeholder="—" />
            <Input label="Max Height (px)" type="number" value={slotForm.maxHeight} onChange={(e) => setSlotForm({ ...slotForm, maxHeight: e.target.value })} placeholder="—" />
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={slotForm.isActive} onChange={(e) => setSlotForm({ ...slotForm, isActive: e.target.checked })} className="rounded" />
                Active
              </label>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={slotForm.responsive} onChange={(e) => setSlotForm({ ...slotForm, responsive: e.target.checked })} className="rounded" />
                Responsive
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setSlotModal(false)}>Cancel</Button>
            <Button onClick={saveSlot} loading={saving}>{editingSlot ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Confirmation ─── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Delete">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{deleteTarget?.name}</strong>?
          This action cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>

      {/* ─── Scan Results Modal ─── */}
      <Modal open={scanResultsOpen} onClose={() => setScanResultsOpen(false)} title="Page Scan Results" size="lg">
        {scanResults && (
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            {/* Health Summary */}
            {scanResults.health && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Coverage Health</h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Total Pages", value: scanResults.health.totalPageTypes, color: "blue" },
                    { label: "Covered", value: scanResults.health.coveredPageTypes, color: "green" },
                    { label: "Uncovered", value: scanResults.health.uncoveredPageTypes, color: "amber" },
                    { label: "Over-served", value: scanResults.health.overServedPageTypes, color: "red" },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-lg border p-3 border-${s.color}-200 bg-${s.color}-50 dark:border-${s.color}-800 dark:bg-${s.color}-900/20`}>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Recommendations */}
                {scanResults.health.recommendations?.length > 0 && (
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Recommendations</h5>
                    {scanResults.health.recommendations.map((rec: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Discovered Page Types */}
            {scanResults.pageTypes?.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                  Discovered Page Types ({scanResults.count})
                </h4>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Page Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Kind</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Traffic</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Ad Slots</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {(scanResults.pageTypes as any[]).map((pt: any) => (
                        <tr key={pt.key} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-3 py-2">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{pt.label}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{pt.key}</p>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                              pt.kind === "static" ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400" :
                              pt.kind === "blog" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                              pt.kind === "category" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                              pt.kind === "tag" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                              "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            }`}>{pt.kind}</span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="h-1.5 w-16 rounded-full bg-gray-200 dark:bg-gray-700">
                                <div
                                  className={`h-full rounded-full ${pt.trafficScore >= 70 ? "bg-green-500" : pt.trafficScore >= 40 ? "bg-amber-500" : "bg-gray-400"}`}
                                  style={{ width: `${pt.trafficScore}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{pt.trafficScore}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              pt.slotCoverage === 0
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : pt.slotCoverage > 3
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            }`}>{pt.slotCoverage}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setScanResultsOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ─── Compliance Panel ─── */

function CompliancePanel() {
  const [result, setResult] = useState<any>(null);
  const [scanning, setScanning] = useState(false);

  async function runScan() {
    setScanning(true);
    try {
      const res = await fetch("/api/ads/compliance");
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
        <Button onClick={runScan} loading={scanning} icon={<Shield className="h-4 w-4" />}>
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
            <span className={`font-semibold ${result.issues?.length === 0 ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>
              {result.issues?.length === 0 ? `All ${result.scannedCount ?? 0} checks passed` : `${result.issues?.length ?? 0} issue(s) found in ${result.scannedCount ?? 0} placements`}
            </span>
          </div>
          {result.issues?.length > 0 && (
            <ul className="space-y-2">
              {result.issues.map((issue: any, i: number) => (
                <li key={i} className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{issue.message || issue}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
