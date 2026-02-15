"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Clock,
  Play,
  CheckCircle2,
  XCircle,
  SkipForward,
  RefreshCw,
  Timer,
  AlertTriangle,
  Shield,
  History,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { clsx } from "clsx";

/* ───────────────────────── Types ───────────────────────── */

interface TaskResult {
  task: string;
  status: "ok" | "skipped" | "error";
  reason?: string;
  duration?: number;
}

interface CronRun {
  summary: { ok: number; skipped: number; errors: number };
  results: TaskResult[];
  runAt: string;
}

interface CronLogEntry {
  id: string;
  status: string;
  summary: { ok: number; skipped: number; errors: number };
  results: TaskResult[];
  durationMs: number;
  triggeredBy: string;
  createdAt: string;
}

/* ─── Task metadata for display ─── */

const TASK_META: Record<string, { label: string; description: string; gate: string }> = {
  "publish-scheduled-posts": {
    label: "Publish Scheduled Posts",
    description: "Publishes posts whose scheduled date has passed",
    gate: "Always enabled",
  },
  "publish-scheduled-pages": {
    label: "Publish Scheduled Pages",
    description: "Publishes pages whose scheduled date has passed",
    gate: "Always enabled",
  },
  "release-stale-post-locks": {
    label: "Release Stale Post Locks",
    description: "Unlocks posts that have been locked for too long without activity",
    gate: "Always enabled",
  },
  "release-stale-page-locks": {
    label: "Release Stale Page Locks",
    description: "Unlocks pages that have been locked for too long without activity",
    gate: "Always enabled",
  },
  "cleanup-orphaned-tags": {
    label: "Cleanup Orphaned Tags",
    description: "Removes tags that are no longer assigned to any content",
    gate: "Always enabled",
  },
  "cleanup-seo-volume-history": {
    label: "SEO Volume History Cleanup",
    description: "Removes keyword volume history older than 90 days",
    gate: "Always enabled",
  },
  "cleanup-orphaned-media": {
    label: "Cleanup Orphaned Media",
    description: "Removes optimized files that no longer have a parent record",
    gate: "Always enabled",
  },
  "purge-deleted-media": {
    label: "Purge Deleted Media",
    description: "Permanently removes soft-deleted media items",
    gate: "Always enabled",
  },
  "purge-spam-comments": {
    label: "Purge Spam Comments",
    description: "Removes old spam comments from the database",
    gate: "enableComments",
  },
  "purge-deleted-comments": {
    label: "Purge Deleted Comments",
    description: "Permanently removes soft-deleted comments",
    gate: "enableComments",
  },
  "purge-captcha-attempts": {
    label: "Purge CAPTCHA Attempts",
    description: "Cleans up old CAPTCHA verification attempts (30 days)",
    gate: "captchaEnabled",
  },
  "purge-old-ad-logs": {
    label: "Purge Old Ad Logs",
    description: "Removes ad impression/click logs older than 90 days",
    gate: "adsEnabled",
  },
  "deactivate-expired-ad-placements": {
    label: "Deactivate Expired Ad Placements",
    description: "Disables ad placements that have passed their end date",
    gate: "adsEnabled",
  },
  "process-scheduled-distributions": {
    label: "Process Scheduled Distributions",
    description: "Sends out content distributions that are scheduled for now",
    gate: "distributionEnabled",
  },
  "cleanup-old-distribution-records": {
    label: "Cleanup Old Distribution Records",
    description: "Removes old distribution log records",
    gate: "distributionEnabled",
  },
  "sync-ad-slot-page-types": {
    label: "Sync Ad Slot Page Types",
    description: "Adds new page types and removes deleted content from ad slots",
    gate: "adsEnabled",
  },
  "cleanup-expired-sessions": {
    label: "Cleanup Expired Sessions",
    description: "Removes expired user sessions from the database",
    gate: "Always enabled",
  },
  "cleanup-expired-tokens": {
    label: "Cleanup Expired Tokens",
    description: "Removes expired email verification and change request tokens",
    gate: "Always enabled",
  },
  "cleanup-old-cron-logs": {
    label: "Cleanup Old Cron Logs",
    description: "Removes cron execution logs older than 90 days",
    gate: "Always enabled",
  },
};

const TASK_NAMES = Object.keys(TASK_META);

/* ─── Gate → module key mapping ─── */
const GATE_TO_MODULE: Record<string, string> = {
  enableComments: "comments",
  captchaEnabled: "captcha",
  adsEnabled: "ads",
  distributionEnabled: "distribution",
};

/* ───────────────────────── Component ───────────────────────── */

export default function CronAdminPage() {
  const [latestRun, setLatestRun] = useState<CronRun | null>(null);
  const [running, setRunning] = useState(false);
  const [secret, setSecret] = useState("");
  const [secretSaved, setSecretSaved] = useState(false);
  const [moduleStatus, setModuleStatus] = useState<Record<string, boolean>>({
    comments: true, captcha: false, ads: false, distribution: false,
  });

  // History state
  const [history, setHistory] = useState<CronLogEntry[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  /* ─── Fetch module statuses ─── */
  useEffect(() => {
    fetch("/api/settings/module-status")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setModuleStatus(data.data);
        }
      })
      .catch(() => {});
  }, []);

  /* ─── Fetch cron history ─── */
  const fetchHistory = useCallback(async (page: number) => {
    if (!secret.trim()) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/cron/history?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setHistory(data.data);
          setHistoryPage(data.pagination.page);
          setHistoryTotal(data.pagination.total);
          setHistoryTotalPages(data.pagination.totalPages);
        }
      }
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, [secret]);

  /* ─── Trigger cron ─── */

  const triggerCron = useCallback(async () => {
    if (!secret.trim()) {
      toast("Enter the CRON_SECRET to run tasks", "error");
      return;
    }
    setRunning(true);
    try {
      const res = await fetch("/api/cron", {
        headers: {
          Authorization: `Bearer ${secret}`,
          "x-cron-trigger": "manual",
        },
      });
      const data = await res.json();

      if (res.status === 401) {
        toast("Unauthorized — check your CRON_SECRET", "error");
        return;
      }
      if (res.status === 503) {
        toast("CRON_SECRET not configured on the server", "error");
        return;
      }
      if (res.status === 409) {
        toast("Another cron execution is in progress. Try again later.", "error");
        return;
      }

      if (data.results) {
        const run: CronRun = {
          summary: data.summary,
          results: data.results,
          runAt: new Date().toISOString(),
        };
        setLatestRun(run);
        setSecretSaved(true);
        toast(
          `Cron completed: ${data.summary.ok} ok, ${data.summary.skipped} skipped, ${data.summary.errors} errors`,
          data.summary.errors > 0 ? "error" : "success",
        );
        // Refresh history
        fetchHistory(1);
      } else if (data.message) {
        toast(data.message, "info");
      }
    } catch {
      toast("Failed to trigger cron", "error");
    } finally {
      setRunning(false);
    }
  }, [secret, fetchHistory]);

  /* Auto-load history when secret is saved */
  useEffect(() => {
    if (secretSaved) {
      fetchHistory(1);
    }
  }, [secretSaved, fetchHistory]);

  /* ─── Status icon ─── */

  function StatusIcon({ status }: { status: TaskResult["status"] }) {
    if (status === "ok")
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (status === "skipped")
      return <SkipForward className="h-4 w-4 text-yellow-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  }

  // Count tasks that will be skipped due to disabled modules
  const disabledTaskCount = TASK_NAMES.filter((name) => {
    const gate = TASK_META[name].gate;
    if (gate === "Always enabled") return false;
    const moduleKey = GATE_TO_MODULE[gate];
    return moduleKey ? !moduleStatus[moduleKey] : false;
  }).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="h-6 w-6" /> Cron Tasks
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {TASK_NAMES.length} automated tasks &middot; Triggered via Vercel Cron or manually
            {disabledTaskCount > 0 && (
              <span className="ml-2 text-red-500 dark:text-red-400">
                &middot; {disabledTaskCount} task{disabledTaskCount > 1 ? "s" : ""} disabled by module settings
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Trigger Section */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Shield className="h-4 w-4" /> Manual Trigger
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-50">
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              CRON_SECRET
            </label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Enter your CRON_SECRET..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <Button
            onClick={triggerCron}
            loading={running}
            icon={running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          >
            Run All Tasks
          </Button>
          {secret.trim() && (
            <Button
              onClick={() => fetchHistory(1)}
              loading={historyLoading}
              icon={<History className="h-4 w-4" />}
            >
              Load History
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          This calls <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">GET /api/cron</code> with
          your secret. Results appear below. History is persisted to the database.
        </p>
      </div>

      {/* Latest Run Results */}
      {latestRun && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Timer className="h-4 w-4" /> Latest Run
              <span className="text-xs font-normal text-gray-400">
                {new Date(latestRun.runAt).toLocaleString()}
              </span>
            </h2>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="text-green-600 dark:text-green-400">
                {latestRun.summary.ok} OK
              </span>
              <span className="text-yellow-600 dark:text-yellow-400">
                {latestRun.summary.skipped} Skipped
              </span>
              <span className="text-red-600 dark:text-red-400">
                {latestRun.summary.errors} Errors
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {latestRun.results.map((r) => {
              const meta = TASK_META[r.task];
              return (
                <div
                  key={r.task}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <StatusIcon status={r.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {meta?.label || r.task}
                    </p>
                    {r.reason && (
                      <p className="text-xs text-gray-400">{r.reason}</p>
                    )}
                  </div>
                  {r.duration !== undefined && (
                    <span className="text-xs text-gray-400 shrink-0">
                      {r.duration}ms
                    </span>
                  )}
                  <span
                    className={clsx(
                      "shrink-0 rounded px-1.5 py-0.5 text-xs font-medium",
                      r.status === "ok" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                      r.status === "skipped" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                      r.status === "error" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                    )}
                  >
                    {r.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task Catalog */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-100 p-5 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            All Registered Tasks
          </h2>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {TASK_NAMES.map((name) => {
            const meta = TASK_META[name];
            const latestResult = latestRun?.results.find((r) => r.task === name);
            return (
              <div key={name} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                  <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{meta.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{meta.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {(() => {
                    if (meta.gate === "Always enabled") {
                      return (
                        <span className="rounded-full px-2 py-0.5 text-xs bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                          Always on
                        </span>
                      );
                    }
                    const moduleKey = GATE_TO_MODULE[meta.gate];
                    const isEnabled = moduleKey ? moduleStatus[moduleKey] : true;
                    return (
                      <span className={clsx(
                        "rounded-full px-2 py-0.5 text-xs",
                        isEnabled
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                          : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                      )}>
                        {meta.gate}{isEnabled ? "" : " (off)"}
                      </span>
                    );
                  })()}
                  {latestResult && <StatusIcon status={latestResult.status} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Persistent History from Database */}
      {history.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <History className="h-4 w-4" /> Execution History
              <span className="text-xs font-normal text-gray-400">
                {historyTotal} total run{historyTotal !== 1 ? "s" : ""}
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => fetchHistory(historyPage - 1)}
                disabled={historyPage <= 1 || historyLoading}
                icon={<ChevronLeft className="h-4 w-4" />}
              >
                Prev
              </Button>
              <span className="text-xs text-gray-500">
                {historyPage} / {historyTotalPages}
              </span>
              <Button
                onClick={() => fetchHistory(historyPage + 1)}
                disabled={historyPage >= historyTotalPages || historyLoading}
                icon={<ChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            </div>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {history.map((log) => (
              <div key={log.id}>
                <button
                  onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                  className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <div className={clsx(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                    log.status === "ok" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                    log.status === "partial" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                    log.status === "error" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                  )}>
                    {log.status === "ok" ? <CheckCircle2 className="h-4 w-4" /> :
                     log.status === "partial" ? <AlertTriangle className="h-4 w-4" /> :
                     <XCircle className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">
                      ({log.triggeredBy})
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium shrink-0">
                    <span className="text-green-600 dark:text-green-400">
                      {log.summary.ok} OK
                    </span>
                    <span className="text-yellow-600 dark:text-yellow-400">
                      {log.summary.skipped} Skip
                    </span>
                    {log.summary.errors > 0 && (
                      <span className="text-red-600 dark:text-red-400">
                        {log.summary.errors} Err
                      </span>
                    )}
                    <span className="text-gray-400">
                      {log.durationMs}ms
                    </span>
                  </div>
                </button>

                {/* Expanded detail */}
                {expandedLogId === log.id && (
                  <div className="border-t border-gray-100 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50 px-5 py-3">
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {(log.results as TaskResult[]).map((r) => {
                        const meta = TASK_META[r.task];
                        return (
                          <div key={r.task} className="flex items-center gap-3 py-2">
                            <StatusIcon status={r.status} />
                            <span className="flex-1 text-xs text-gray-700 dark:text-gray-300">
                              {meta?.label || r.task}
                            </span>
                            {r.reason && (
                              <span className="text-xs text-gray-400 truncate max-w-48" title={r.reason}>
                                {r.reason}
                              </span>
                            )}
                            {r.duration !== undefined && (
                              <span className="text-xs text-gray-400 shrink-0">{r.duration}ms</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/20">
        <div className="flex items-start gap-3 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
          <div className="text-blue-700 dark:text-blue-300">
            <p className="font-medium">How Cron Works</p>
            <p className="mt-1 text-blue-600 dark:text-blue-400 text-xs">
              In production, these tasks run automatically via Vercel Cron (configured in <code className="rounded bg-blue-100 px-1 dark:bg-blue-900/50">vercel.json</code>).
              Each task checks its feature&apos;s kill switch in Site Settings before executing.
              A distributed lock prevents concurrent executions. Each task has a 30-second timeout.
              All runs are recorded to the database for auditing — view them in the Execution History section above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
