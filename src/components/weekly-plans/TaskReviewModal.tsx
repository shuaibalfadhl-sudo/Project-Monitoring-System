"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import AvatarViewer from "@/components/users/AvatarViewer";
import {
  isImageWeeklyPlanFile,
  weeklyPlanFileName,
  weeklyPlanModuleLabel,
  weeklyPlanSignedUrl,
  weeklyPlanWeekRange,
} from "@/lib/weeklyPlans";
import {
  weeklyPlanStatusMeta,
  type WeeklyPlan,
  type WeeklyPlanPerson,
} from "@/types/weeklyPlan";
import TaskFeedbackList from "./TaskFeedbackList";
import TaskFeedbackHistoryModal from "./TaskFeedbackHistoryModal";
import FeedbackFilePicker from "./FeedbackFilePicker";

type Decision = "completed" | "revision";

export interface RevisionFeedback {
  message: string;
  files: File[];
}

interface TaskReviewModalProps {
  plan: WeeklyPlan;
  people: WeeklyPlanPerson[];
  moduleNames: Record<string, string>;
  moduleProjects: Record<string, string>;
  canEdit: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (next: Decision, feedback?: RevisionFeedback) => void;
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
  canEdit,
  busy,
  onClose,
  onConfirm,
}: TaskReviewModalProps) {
  const supabase = createClient();
  const [choice, setChoice] = useState<Decision | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [viewer, setViewer] = useState<{ src: string; name: string } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [feedbackTouched, setFeedbackTouched] = useState(false);
  const attachments = useMemo(() => plan.document_attachments ?? [], [plan.document_attachments]);
  const meta = weeklyPlanStatusMeta(plan.status);
  const nameOf = (id: string | null) =>
    people.find((person) => person.id === id)?.full_name || "Unknown user";
  const assigneeFirst = plan.assigned_personnel
    ? nameOf(plan.assigned_personnel).split(" ")[0]
    : "the assignee";
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

  const handleConfirm = () => {
    if (!choice || busy) return;
    if (choice === "revision") {
      const message = feedbackMessage.trim();
      if (!message) {
        setFeedbackTouched(true);
        return;
      }
      onConfirm(choice, { message, files: pendingFiles });
      return;
    }
    onConfirm(choice);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy && !viewer && !historyOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose, viewer, historyOpen]);

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
              <ul className="flex flex-wrap items-start gap-2.5 pt-1">
                {attachments.map((path) => {
                  const url = signedUrls[path];
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
          </div>

          <div className="border-t border-gray-100 dark:border-slate-800 pt-5">
            <TaskFeedbackList
              taskId={plan.id}
              people={people}
              heading="Latest feedback"
              limit={1}
              action={
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--sys-primary)]/30 bg-[var(--sys-primary)]/10 text-[11px] font-bold text-[var(--sys-primary-text)] hover:bg-[var(--sys-primary)]/20 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  View all feedback history
                </button>
              }
            />
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

              {choice === "revision" && (
                <div className="mt-4 rounded-2xl border-2 border-rose-200 dark:border-rose-400/25 bg-rose-50/60 dark:bg-rose-500/5 p-4 animate-fade-in">
                  <label
                    htmlFor="revision-feedback"
                    className="flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-300"
                  >
                    Revision feedback <span className="text-red-500">*</span>
                  </label>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                    Tell {assigneeFirst} what needs to change. This message is saved with the task and shown to them.
                  </p>
                  <textarea
                    id="revision-feedback"
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    disabled={busy}
                    rows={3}
                    placeholder="e.g. The login flow still fails on expired sessions — please rework and resubmit."
                    className={`mt-2 w-full rounded-xl border bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors resize-none disabled:opacity-50 ${
                      feedbackTouched && !feedbackMessage.trim()
                        ? "border-red-400 focus:ring-red-300/40"
                        : "border-gray-200 dark:border-slate-700 focus:border-[var(--sys-primary)] focus:ring-[var(--sys-primary)]/30"
                    }`}
                  />
                  {feedbackTouched && !feedbackMessage.trim() && (
                    <p className="text-[11px] font-bold text-red-500 mt-1">
                      Please write the feedback before sending the task back.
                    </p>
                  )}
                  <FeedbackFilePicker busy={busy} onChange={setPendingFiles} />
                </div>
              )}
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
              onClick={handleConfirm}
              disabled={!choice || busy}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-bold bg-[var(--sys-primary)] hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              {busy && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {busy ? "Updating..." : "Confirm Decision"}
            </button>
          )}
        </div>
      </div>
      {historyOpen && (
        <TaskFeedbackHistoryModal
          plan={plan}
          people={people}
          onClose={() => setHistoryOpen(false)}
        />
      )}
      {viewer && (
        <AvatarViewer
          src={viewer.src}
          name={viewer.name}
          eyebrow="Attachment preview"
          onClose={() => setViewer(null)}
        />
      )}
    </div>,
    document.body,
  );
}