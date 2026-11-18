"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import AvatarViewer from "@/components/users/AvatarViewer";
import { isImageWeeklyPlanFile, weeklyPlanFileName } from "@/lib/weeklyPlans";
import { taskFeedbackSignedUrl } from "@/lib/taskFeedback";
import type { WeeklyPlanPerson } from "@/types/weeklyPlan";
import type { TaskFeedback } from "@/types/taskFeedback";

interface TaskFeedbackListProps {
  taskId: number;
  people: WeeklyPlanPerson[];
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

export default function TaskFeedbackList({
  taskId,
  people,
  heading = "Feedback",
  limit,
  hideWhenEmpty = false,
  action,
}: TaskFeedbackListProps) {
  const supabase = createClient();
  const [rows, setRows] = useState<TaskFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [viewer, setViewer] = useState<{ src: string; name: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("task_feedback")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error(error);
        toast.error("Could not load the feedback for this task.");
        setLoading(false);
        return;
      }
      setRows((data ?? []) as TaskFeedback[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [taskId, supabase]);

  useEffect(() => {
    const paths = rows.flatMap((row) => row.file_paths ?? []);
    if (paths.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        paths.map(async (path) => {
          try {
            return [path, await taskFeedbackSignedUrl(supabase, path)] as const;
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

  const nameOf = (id: string | null) =>
    people.find((person) => person.id === id)?.full_name || "Unknown user";

  if (!loading && rows.length === 0 && hideWhenEmpty) return null;
  const shown = limit ? rows.slice(-limit) : rows;

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
          No feedback yet. It appears here when the owner sends a revision or the assignee marks the
          task done.
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((row) => {
            const paths = row.file_paths ?? [];
            return (
              <li
                key={row.id}
                className="rounded-xl border border-gray-200 dark:border-slate-700 px-3.5 py-2.5 space-y-2"
              >
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {nameOf(row.created_by)}
                  </span>
                  <span
                    className={`px-1.5 py-px rounded-full text-[9px] font-bold uppercase tracking-wide ${
                      row.is_task_owner
                        ? "bg-[var(--sys-primary)]/10 text-[var(--sys-primary-text)]"
                        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                    }`}
                  >
                    {row.is_task_owner ? "Owner" : "Assignee"}
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
      )}
      {action && rows.length > 0 && <div className="mt-3">{action}</div>}
      {viewer && (
        <AvatarViewer
          src={viewer.src}
          name={viewer.name}
          eyebrow="Attachment preview"
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}