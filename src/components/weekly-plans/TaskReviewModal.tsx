"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  isImageWeeklyPlanFile,
  WEEKLY_PLAN_ACCEPT,
  weeklyPlanFileError,
  weeklyPlanFileName,
  weeklyPlanModuleLabel,
  weeklyPlanSignedUrl,
  weeklyPlanWeekRange,
} from "@/lib/weeklyPlans";
import {
  removeTaskFeedbackFiles,
  taskFeedbackSignedUrl,
  uploadTaskFeedbackFile,
} from "@/lib/taskFeedback";
import {
  weeklyPlanStatusMeta,
  type WeeklyPlan,
  type WeeklyPlanPerson,
} from "@/types/weeklyPlan";
import type { TaskFeedback } from "@/types/taskFeedback";

type Decision = "completed" | "revision";

interface TaskReviewModalProps {
  plan: WeeklyPlan;
  people: WeeklyPlanPerson[];
  moduleNames: Record<string, string>;
  moduleProjects: Record<string, string>;
  viewerId: string;
  isSuperAdmin: boolean;
  canEdit: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (next: Decision) => void;
}

const CHOICES: {
  value: Decision;
  label: string;
  pill: string;
  pillClass: string;
  description: string;
}[] = [
  {
    value: "completed",
    label: "Completed",
    pill: "Final",
    pillClass: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
    description: "Work verified and finished. The task leaves the active pipelines and stays in your records.",
  },
  {
    value: "revision",
    label: "Revision",
    pill: "To Assignee",
    pillClass: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    description: "Send back to the assigned person for rework. It returns to their Weekly Tasks until resubmitted.",
  },
];

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

export default function TaskReviewModal({
  plan,
  people,
  moduleNames,
  moduleProjects,
  viewerId,
  isSuperAdmin,
  canEdit,
  busy,
  onClose,
  onConfirm,
}: TaskReviewModalProps) {
  const supabase = createClient();
  const [choice, setChoice] = useState<Decision | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<TaskFeedback[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackUrls, setFeedbackUrls] = useState<Record<string, string>>({});
  const [uploadingFeedback, setUploadingFeedback] = useState(false);
  const feedbackInputRef = useRef<HTMLInputElement>(null);
  const canFeedback = viewerId === plan.created_by || viewerId === plan.assigned_personnel;
  const attachments = useMemo(() => plan.document_attachments ?? [], [plan.document_attachments]);
  const meta = weeklyPlanStatusMeta(plan.status);
  const nameOf = (id: string | null) =>
    people.find((person) => person.id === id)?.full_name || "Unknown user";
  const linkedModule = weeklyPlanModuleLabel(plan.module, moduleNames);
  const linkedModuleProject = plan.module ? moduleProjects[plan.module] ?? "" : "";

  useEffect(() => {
    if (attachments.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        attachments.map(async (path) => {
          try {
            return [path, await weeklyPlanSignedUrl(supabase, path)] as const;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      setSignedUrls(Object.fromEntries(entries.filter((entry) => entry !== null)));
    })();
    return () => {
      cancelled = true;
    };
  }, [attachments, supabase]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("task_feedback")
        .select("*")
        .eq("task_id", plan.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error(error);
        toast.error("Could not load the feedback for this task.");
        setFeedbackLoading(false);
        return;
      }
      setFeedback((data ?? []) as TaskFeedback[]);
      setFeedbackLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [plan.id, supabase]);

  useEffect(() => {
    if (feedback.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        feedback.map(async (row) => {
          try {
            return [row.file_path, await taskFeedbackSignedUrl(supabase, row.file_path)] as const;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      setFeedbackUrls(Object.fromEntries(entries.filter((entry) => entry !== null)));
    })();
    return () => {
      cancelled = true;
    };
  }, [feedback, supabase]);

  const handleFeedbackFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingFeedback(true);
    try {
      for (const file of Array.from(files)) {
        const problem = weeklyPlanFileError(file);
        if (problem) {
          toast.error(problem);
          continue;
        }
        const path = await uploadTaskFeedbackFile(supabase, viewerId, file);
        const { data, error } = await supabase
          .from("task_feedback")
          .insert({ task_id: plan.id, file_path: path })
          .select()
          .single();
        if (error) {
          await removeTaskFeedbackFiles(supabase, [path]);
          throw error;
        }
        setFeedback((prev) => [...prev, data as TaskFeedback]);
        toast.success("Feedback added.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Could not add the feedback. Please try again.");
    } finally {
      setUploadingFeedback(false);
      if (feedbackInputRef.current) feedbackInputRef.current.value = "";
    }
  };

  const handleRemoveFeedback = async (row: TaskFeedback) => {
    const { error } = await supabase.from("task_feedback").delete().eq("id", row.id);
    if (error) {
      console.error(error);
      toast.error("Could not remove the feedback. Please try again.");
      return;
    }
    setFeedback((prev) => prev.filter((item) => item.id !== row.id));
    if (row.file_path.startsWith(`${viewerId}/`)) {
      await removeTaskFeedbackFiles(supabase, [row.file_path]);
    }
    toast.success("Feedback removed.");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => !busy && onClose()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Review ${plan.title}`}
        className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col overflow-hidden animate-scale-in"
      >
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-gray-100 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--sys-primary-text)]">
              Task Review
            </p>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white truncate mt-0.5">{plan.title}</h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Created by {nameOf(plan.created_by)} · {formatTimestamp(plan.created_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="no-scrollbar flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${meta.badge}`}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
              {meta.label}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              {weeklyPlanWeekRange(plan.date_weekly, plan.date_weekly_end)}
            </span>
          </div>

          <div>
            {linkedModule && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--sys-primary)]/25 bg-[var(--sys-primary)]/10 text-[11px] font-bold text-[var(--sys-primary-text)]">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <span>{linkedModule}</span>
                {linkedModuleProject && <span className="font-semibold opacity-70">· {linkedModuleProject}</span>}
              </span>
            )}
            <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {plan.description || "No description."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned to</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {plan.assigned_personnel ? nameOf(plan.assigned_personnel) : "Unassigned"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marked done</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {plan.updated_at
                  ? `${formatTimestamp(plan.updated_at)}${plan.updated_by ? ` · ${nameOf(plan.updated_by)}` : ""}`
                  : "—"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Attachments
            </p>
            {attachments.length === 0 ? (
              <p className="text-xs font-medium text-slate-400 italic">No files attached.</p>
            ) : (
              <ul className="space-y-2">
                {attachments.map((path) => {
                  const url = signedUrls[path];
                  return (
                    <li
                      key={path}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-slate-700 px-3.5 py-2.5"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        {isImageWeeklyPlanFile(path) && url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={url}
                            alt={weeklyPlanFileName(path)}
                            className="h-9 w-9 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <span className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {weeklyPlanFileName(path)}
                        </span>
                      </span>
                      {url ? (
                        <span className="flex items-center gap-3 shrink-0 text-[11px] font-bold">
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--sys-primary-text)] hover:underline"
                          >
                            Preview
                          </a>
                          <a href={url} download className="text-slate-500 dark:text-slate-400 hover:underline">
                            Download
                          </a>
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400 shrink-0">Loading...</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-gray-100 dark:border-slate-800 pt-5">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Feedback
                {feedback.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {feedback.length}
                  </span>
                )}
              </p>
              {canFeedback && (
                <>
                  <button
                    type="button"
                    onClick={() => feedbackInputRef.current?.click()}
                    disabled={uploadingFeedback}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--sys-primary)] text-white text-[11px] font-bold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
                  >
                    {uploadingFeedback ? (
                      <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                    )}
                    {uploadingFeedback ? "Uploading..." : "Add file"}
                  </button>
                  <input
                    ref={feedbackInputRef}
                    type="file"
                    multiple
                    accept={WEEKLY_PLAN_ACCEPT}
                    onChange={(e) => void handleFeedbackFiles(e.target.files)}
                    className="hidden"
                  />
                </>
              )}
            </div>
            {feedbackLoading ? (
              <p className="text-xs font-medium text-slate-400 italic">Loading feedback...</p>
            ) : feedback.length === 0 ? (
              <p className="text-xs font-medium text-slate-400 italic">
                No feedback yet.{canFeedback ? " Attach a file to leave feedback for the other party." : ""}
              </p>
            ) : (
              <ul className="space-y-2">
                {feedback.map((row) => {
                  const url = feedbackUrls[row.file_path];
                  const removable = row.created_by === viewerId || isSuperAdmin;
                  return (
                    <li
                      key={row.id}
                      className="rounded-xl border border-gray-200 dark:border-slate-700 px-3.5 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 min-w-0">
                          {isImageWeeklyPlanFile(row.file_path) && url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={url}
                              alt={weeklyPlanFileName(row.file_path)}
                              className="h-9 w-9 rounded-lg object-cover shrink-0"
                            />
                          ) : (
                            <span className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                              </svg>
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {weeklyPlanFileName(row.file_path)}
                            </span>
                            <span className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
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
                            </span>
                          </span>
                        </span>
                        <span className="flex items-center gap-3 shrink-0 text-[11px] font-bold">
                          {url ? (
                            <>
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[var(--sys-primary-text)] hover:underline"
                              >
                                Preview
                              </a>
                              <a href={url} download className="text-slate-500 dark:text-slate-400 hover:underline">
                                Download
                              </a>
                            </>
                          ) : (
                            <span className="font-medium text-slate-400">Loading...</span>
                          )}
                          {removable && (
                            <button
                              type="button"
                              onClick={() => void handleRemoveFeedback(row)}
                              className="text-red-500 hover:text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          )}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {canFeedback && (
              <p className="text-[11px] font-medium text-slate-400 mt-2">Images and documents, up to 20 MB each.</p>
            )}
          </div>

          {canEdit && (
            <div className="border-t border-gray-100 dark:border-slate-800 pt-5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--sys-primary-text)]">
                Review Decision: Set Next Status
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 mb-4">
                Select whether to close this task as completed or send it back to the assignee for revision:
              </p>
              <div role="radiogroup" aria-label="Next status" className="grid sm:grid-cols-2 gap-3">
                {CHOICES.map((option) => {
                  const selected = choice === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setChoice(option.value)}
                      className={`text-left rounded-2xl border-2 p-4 transition-all ${
                        selected
                          ? "border-[var(--sys-primary)] ring-2 ring-[var(--sys-primary)]/20 bg-[var(--sys-primary)]/5"
                          : "border-gray-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <span className="flex items-center gap-2.5 flex-wrap">
                        <span
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            selected ? "border-[var(--sys-primary)]" : "border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {selected && <span className="w-2 h-2 rounded-full bg-[var(--sys-primary)]" />}
                        </span>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">{option.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${option.pillClass}`}>
                          {option.pill}
                        </span>
                      </span>
                      <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Close
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => choice && onConfirm(choice)}
              disabled={!choice || busy}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-bold bg-[var(--sys-primary)] hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              {busy && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {busy ? "Updating..." : "Confirm Decision"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}