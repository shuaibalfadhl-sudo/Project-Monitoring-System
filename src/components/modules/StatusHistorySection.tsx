"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { statusLabel, statusBadgeClass } from "@/lib/moduleStatuses";

interface StatusHistorySectionProps {
  moduleId: string;
}

interface StatusHistoryEntry {
  id: number;
  module_id: string;
  created_by: string | null;
  status: string;
  created_at: string;
  user_name: string;
}

const EMBEDDED_LIMIT = 3;

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

function formatDate(value: string) {
  try {
    return DATE_FMT.format(new Date(value));
  } catch {
    return value;
  }
}

export default function StatusHistorySection({
  moduleId,
}: StatusHistorySectionProps) {
  const supabase = createClient();

  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close the full-history modal on Escape.
  useEffect(() => {
    if (!showAll) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAll(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAll]);

  // ── Fetch history ─────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setFetchError("");
    try {
      const { data, error } = await supabase
        .from("project_module_status_history")
        .select("id, module_id, created_by, status, created_at")
        .eq("module_id", moduleId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const records = data ?? [];

      // Resolve user names from profiles (created_by references auth.users).
      const userIds = Array.from(
        new Set(records.map((r: any) => r.created_by).filter(Boolean))
      );

      let profileMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        if (profiles) {
          profileMap = new Map(
            profiles.map((p: any) => [p.id, p.full_name || "System"])
          );
        }
      }

      const mapped: StatusHistoryEntry[] = records.map((row: any) => ({
        id: row.id,
        module_id: row.module_id,
        created_by: row.created_by,
        status: row.status,
        created_at: row.created_at,
        user_name: row.created_by
          ? profileMap.get(row.created_by) || "System"
          : "System",
      }));

      setHistory(mapped);
    } catch (err: any) {
      setFetchError(err.message || "Failed to load status history.");
    } finally {
      setIsLoading(false);
    }
  }, [moduleId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Shared timeline renderer used by both the embedded list and the modal.
  const renderTimeline = (records: StatusHistoryEntry[]) => (
    <ol className="relative border-l-2 border-gray-100 dark:border-slate-800 space-y-0 ml-3">
      {records.map((record, idx) => (
        <li key={record.id} className="relative pl-6 pb-4 last:pb-0">
          {/* Timeline dot */}
          <span
            className={`absolute -left-[9px] top-3 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-sm ${
              idx === 0 ? "bg-blue-500" : "bg-gray-300 dark:bg-slate-600"
            }`}
          >
            {idx === 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            )}
          </span>

          {/* Record card */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              idx === 0
                ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30 shadow-sm"
                : "bg-gray-50/60 dark:bg-slate-800/40 border-gray-100 dark:border-slate-800"
            }`}
          >
            {/* Header: user + timestamp */}
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-[var(--sys-primary)] text-white text-[11px] font-black flex items-center justify-center shrink-0">
                  {(record.user_name ?? "S").charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-[var(--sys-primary)] truncate">
                  {record.user_name ?? "System"}
                </span>
                {idx === 0 && (
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0">
                    Latest
                  </span>
                )}
              </div>

              <time
                dateTime={record.created_at}
                className="text-[11px] font-semibold text-gray-600 dark:text-slate-300 shrink-0"
              >
                {formatDate(record.created_at)}
              </time>
            </div>

            {/* Status change */}
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-slate-300">
              <span>changed status to</span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold border border-transparent ${statusBadgeClass(record.status)}`}
              >
                {statusLabel(record.status)}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="border-t border-gray-100 dark:border-slate-800 pt-6 mt-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <svg
            className="w-3.5 h-3.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Status History
          {!isLoading && history.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-black">
              {history.length}
            </span>
          )}
        </h3>

        {/* Manual refresh */}
        <button
          onClick={fetchHistory}
          disabled={isLoading}
          title="Refresh history"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors disabled:opacity-40 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          <svg
            className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* History list */}
      {isLoading ? (
        /* Loading skeleton */
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50"
            >
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-2 bg-gray-100 dark:bg-slate-700/60 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : fetchError ? (
        /* Fetch error */
        <div className="flex items-start justify-between gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium">
          <div className="flex items-start gap-2">
            <svg
              className="w-4 h-4 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{fetchError}</span>
          </div>
          <button
            onClick={fetchHistory}
            className="text-xs font-bold underline hover:no-underline shrink-0"
          >
            Retry
          </button>
        </div>
      ) : history.length === 0 ? (
        /* Empty state — no history, so no "View All" button */
        <div className="flex flex-col items-center justify-center py-6 text-center bg-gray-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
          <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-2">
            <svg
              className="w-4 h-4 text-gray-400 dark:text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
            No status changes recorded yet.
          </p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
            Every status update to this module will appear here.
          </p>
        </div>
      ) : (
        /* Latest 3 + View All */
        <>
          {renderTimeline(history.slice(0, EMBEDDED_LIMIT))}

          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[var(--sys-primary)] bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-100 dark:border-blue-900/40 transition-colors"
            >
              View All History
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-white dark:bg-slate-800 text-[10px] font-black">
                {history.length}
              </span>
            </button>
          </div>
        </>
      )}

      {/* Full history modal */}
      {showAll &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setShowAll(false)}
          >
            <div
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-gray-100 dark:border-slate-800 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  Status History
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-black">
                    {history.length}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
                  aria-label="Close"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Modal body */}
              <div className="px-6 py-5 overflow-y-auto">
                {renderTimeline(history)}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
