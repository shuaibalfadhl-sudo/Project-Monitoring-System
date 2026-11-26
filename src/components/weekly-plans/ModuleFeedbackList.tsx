"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { isImageWeeklyPlanFile, weeklyPlanFileName } from "@/lib/weeklyPlans";
import { moduleFeedbackSignedUrl } from "@/lib/moduleFeedback";
import AvatarViewer from "@/components/users/AvatarViewer";
import type { ModuleFeedback } from "@/types/moduleFeedback";

interface ModuleFeedbackListProps {
  moduleId: string;
  heading?: string;
  limit?: number;
  hideWhenEmpty?: boolean;
  action?: ReactNode;
}

function formatTimestamp(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  project_manager: "Project Manager",
  system_auditor: "System Auditor",
  developer: "Developer",
  devops: "DevOps",
  pending: "Pending",
  qa_auditor: "QA Auditor",
  project_member: "Project Member",
  other: "Other",
};

function roleLabel(role: string | null | undefined) {
  if (!role) return "Other";
  return ROLE_LABELS[role] ?? role.replaceAll("_", " ");
}

function roleBadgeClass(role: string | null | undefined) {
  switch (role) {
    case "developer":
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
    case "system_auditor":
    case "qa_auditor":
      return "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300";
    case "project_manager":
      return "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300";
    case "super_admin":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
    case "devops":
      return "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300";
  }
}

export default function ModuleFeedbackList({
  moduleId,
  heading = "Feedback",
  limit,
  hideWhenEmpty = false,
  action,
}: ModuleFeedbackListProps) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<ModuleFeedback[]>([]);
  const [authors, setAuthors] = useState<Record<string, { full_name: string | null; role: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [showAll, setShowAll] = useState(false);
  const [viewer, setViewer] = useState<{ src: string; name: string } | null>(null);

  useEffect(() => {
    if (!showAll && !viewer) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowAll(false);
        setViewer(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showAll, viewer]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("module_feedback")
        .select("*")
        .eq("module_id", moduleId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error(error);
        toast.error("Could not load the feedback for this module.");
        setLoading(false);
        return;
      }
      const feedbackRows = (data ?? []) as ModuleFeedback[];
      const authorIds = [...new Set(feedbackRows.map((row) => row.feedback_user_id).filter(Boolean))];
      let authorMap: Record<string, { full_name: string | null; role: string | null }> = {};

      if (authorIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .in("id", authorIds);

        if (profileError) {
          console.error("Could not load module feedback authors:", profileError);
        } else {
          authorMap = Object.fromEntries(
            (profiles ?? []).map((profile) => [
              profile.id,
              { full_name: profile.full_name, role: profile.role },
            ]),
          );
        }
      }

      if (cancelled) return;
      setRows(feedbackRows);
      setAuthors(authorMap);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [moduleId, supabase]);

  useEffect(() => {
    const paths = rows.flatMap((row) => row.file_paths ?? []);
    if (paths.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        paths.map(async (path) => {
          try {
            return [path, await moduleFeedbackSignedUrl(supabase, path)] as const;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      setUrls(Object.fromEntries(entries.filter((entry) => entry !== null)));
    })();
    return () => {
      cancelled = true;
    };
  }, [rows, supabase]);

  if (!loading && rows.length === 0 && hideWhenEmpty) return null;
  const shown = limit ? rows.slice(-limit) : rows;

  const renderFeedbackList = (feedbackRows: ModuleFeedback[]) => (
    <ul className="space-y-2">
      {feedbackRows.map((row) => {
            const paths = row.file_paths ?? [];
            const author = authors[row.feedback_user_id];
            const displayRole = author?.role || row.user_role;
            return (
              <li
                key={row.id}
                className="rounded-xl border border-gray-200 dark:border-slate-700 px-3.5 py-2.5 space-y-2"
              >
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {author?.full_name || "Unknown User"}
                  </span>
                  <span
                    className={`px-1.5 py-px rounded-full text-[9px] font-bold uppercase tracking-wide ${roleBadgeClass(displayRole)}`}
                  >
                    {roleLabel(displayRole)}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    {formatTimestamp(row.created_at)}
                  </span>
                </div>
                {row.feedback && (
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {row.feedback}
                  </p>
                )}
                {paths.length > 0 && (
                  <ul className="flex flex-wrap items-start gap-2.5 pt-1">
                    {paths.map((path) => {
                      const url = urls[path];
                      const image = isImageWeeklyPlanFile(path);
                      const name = weeklyPlanFileName(path);
                      return (
                        <li key={path} className="group relative shrink-0">
                          <button
                            type="button"
                            disabled={!url}
                            onClick={() => {
                              if (!url) return;
                              if (image) setViewer({ src: url, name });
                              else window.open(url, "_blank", "noopener");
                            }}
                            title={image ? `View ${name}` : `Open ${name}`}
                            className={
                              image
                                ? "block h-16 w-16 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 transition-shadow hover:ring-2 hover:ring-[var(--sys-primary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)]/50 disabled:cursor-default"
                                : "flex h-16 w-32 items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 text-left transition-shadow hover:ring-2 hover:ring-[var(--sys-primary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)]/50 disabled:cursor-default"
                            }
                          >
                            {image ? (
                              url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={url} alt={name} className="h-full w-full object-cover" />
                              ) : (
                                <span className="block h-full w-full animate-pulse bg-slate-200 dark:bg-slate-700" />
                              )
                            ) : (
                              <>
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-900">
                                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                    />
                                  </svg>
                                </span>
                                <span className="min-w-0 text-[10px] font-bold leading-tight text-slate-700 dark:text-slate-100 line-clamp-2 break-words">
                                  {name}
                                </span>
                              </>
                            )}
                          </button>
                          {url && (
                            <a
                              href={url}
                              download
                              title="Download"
                              aria-label={`Download ${name}`}
                              className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900/70 text-white opacity-0 transition-opacity hover:bg-slate-900 focus:opacity-100 group-hover:opacity-100"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
                                />
                              </svg>
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      );

  return (
    <div>
      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
        {heading}
        {rows.length > 0 && (
          <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
            {rows.length}
          </span>
        )}
      </p>
      {loading ? (
        <p className="text-xs font-medium text-slate-400 italic">Loading feedback...</p>
      ) : rows.length === 0 ? (
        <p className="text-xs font-medium text-slate-400 italic">
          No feedback yet. It appears here when project members submit their feedback.
        </p>
      ) : (
        <>
          {renderFeedbackList(shown)}
          {limit && rows.length > limit && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[var(--sys-primary-text)] bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-100 dark:border-blue-900/40 transition-colors"
              >
                View All Feedback
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-white dark:bg-slate-800 text-[10px] font-black">
                  {rows.length}
                </span>
              </button>
            </div>
          )}
        </>
      )}
      {action && rows.length > 0 && <div className="mt-3">{action}</div>}

      {showAll && createPortal(
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowAll(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="All module feedback"
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-gray-100 dark:border-slate-800 animate-in zoom-in-95 duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                Module Feedback
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-black">
                  {rows.length}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="no-scrollbar px-6 py-5 overflow-y-auto">
              {renderFeedbackList(rows)}
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setShowAll(false)}
                className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {viewer && (
        <AvatarViewer
          src={viewer.src}
          name={viewer.name}
          eyebrow="Feedback attachment"
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
