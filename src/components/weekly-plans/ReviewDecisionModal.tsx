"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Decision = "completed" | "revision";

interface ReviewDecisionModalProps {
  title: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (next: Decision) => void;
  onViewDetails: () => void;
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

export default function ReviewDecisionModal({
  title,
  busy,
  onCancel,
  onConfirm,
  onViewDetails,
}: ReviewDecisionModalProps) {
  const [choice, setChoice] = useState<Decision | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !busy && onCancel()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Review decision"
        className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-gray-100 dark:border-slate-800"
      >
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--sys-primary-text)]">
          Review Decision: Set Next Status
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 mb-5">
          Select whether to close <span className="font-bold text-slate-700 dark:text-slate-200">&quot;{title}&quot;</span> as
          completed or send it back to the assignee for revision:
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

        <div className="flex items-center justify-between gap-3 mt-6">
          <button
            type="button"
            onClick={onViewDetails}
            disabled={busy}
            className="text-xs font-bold text-[var(--sys-primary-text)] hover:underline underline-offset-2 disabled:opacity-50"
          >
            View full details
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => choice && onConfirm(choice)}
              disabled={!choice || busy}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-bold bg-[var(--sys-primary)] hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              {busy && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {busy ? "Updating..." : "Confirm Decision"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}