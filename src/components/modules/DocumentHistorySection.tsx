"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { QaDocumentHistory } from "@/types/qa";

interface DocumentHistorySectionProps {
  moduleId: string;
}

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export default function DocumentHistorySection({
  moduleId,
}: DocumentHistorySectionProps) {
  const supabase = createClient();

  const [history, setHistory] = useState<QaDocumentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // ── Fetch history ─────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setFetchError("");
    try {
      const { data, error } = await supabase
        .from("qa_document_history")
        .select("id, module_id, document_url, uploaded_by, created_at")
        .eq("module_id", moduleId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const records = data ?? [];

      // Fetch profiles manually to resolve uploader names
      const uploaderIds = Array.from(
        new Set(records.map((r: any) => r.uploaded_by).filter(Boolean))
      );

      let profileMap = new Map<string, string>();
      if (uploaderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", uploaderIds);

        if (profiles) {
          profileMap = new Map(
            profiles.map((p: any) => [p.id, p.full_name || "System Auditor"])
          );
        }
      }

      const mapped: QaDocumentHistory[] = records.map((row: any) => ({
        id: row.id,
        module_id: row.module_id,
        document_url: row.document_url,
        uploaded_by: row.uploaded_by,
        created_at: row.created_at,
        uploader_name: row.uploaded_by
          ? profileMap.get(row.uploaded_by) || "System Auditor"
          : "System Auditor",
      }));

      setHistory(mapped);
    } catch (err: any) {
      setFetchError(err.message || "Failed to load document history.");
    } finally {
      setIsLoading(false);
    }
  }, [moduleId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          QA Document History
          {!isLoading && history.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-[10px] font-black">
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
        /* Empty state */
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
            No document history recorded yet.
          </p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
            Documents submitted during QA revisions will appear here.
          </p>
        </div>
      ) : (
        /* Records list — newest first */
        <ol className="relative border-l-2 border-gray-100 dark:border-slate-800 space-y-0 ml-3">
          {history.map((record, idx) => (
            <li key={record.id} className="relative pl-6 pb-4 last:pb-0">
              {/* Timeline dot */}
              <span
                className={`absolute -left-[9px] top-3 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-sm ${
                  idx === 0
                    ? "bg-rose-500"
                    : "bg-gray-300 dark:bg-slate-600"
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
                    ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 shadow-sm"
                    : "bg-gray-50/60 dark:bg-slate-800/40 border-gray-100 dark:border-slate-800"
                }`}
              >
                {/* Header: uploader + timestamp */}
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-[var(--sys-primary)] text-white text-[11px] font-black flex items-center justify-center shrink-0">
                      {(record.uploader_name ?? "U").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-[var(--sys-primary)] truncate">
                      {record.uploader_name ?? "System Auditor"}
                    </span>
                    {idx === 0 && (
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 shrink-0">
                        Latest
                      </span>
                    )}
                  </div>

                  <time
                    dateTime={record.created_at}
                    className="text-[11px] font-semibold text-gray-600 dark:text-slate-300 shrink-0"
                  >
                    {(() => {
                      try {
                        return DATE_FMT.format(new Date(record.created_at));
                      } catch {
                        return record.created_at;
                      }
                    })()}
                  </time>
                </div>

                {/* Clickable document URL */}
                <a
                  href={record.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-rose-400 dark:hover:border-rose-500 transition-all text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-rose-600 dark:hover:text-rose-400 shadow-sm"
                >
                  <svg
                    className="w-4 h-4 shrink-0 text-gray-400 group-hover:text-rose-500 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  <span className="truncate flex-1">
                    {record.document_url}
                  </span>
                  <span className="text-[11px] font-bold text-gray-600 dark:text-slate-300 shrink-0 group-hover:translate-x-0.5 transition-transform">
                    Open ↗
                  </span>
                </a>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
