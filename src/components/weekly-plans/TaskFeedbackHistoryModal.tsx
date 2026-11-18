"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { WeeklyPlan, WeeklyPlanPerson } from "@/types/weeklyPlan";
import TaskFeedbackList from "./TaskFeedbackList";

interface TaskFeedbackHistoryModalProps {
  plan: WeeklyPlan;
  people: WeeklyPlanPerson[];
  onClose: () => void;
}

export default function TaskFeedbackHistoryModal({
  plan,
  people,
  onClose,
}: TaskFeedbackHistoryModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Feedback history for ${plan.title}`}
        className="relative w-full max-w-xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col overflow-hidden animate-scale-in"
      >
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-gray-100 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--sys-primary-text)]">
              Feedback history
            </p>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white truncate mt-0.5">{plan.title}</h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Every message and file sent for this task, oldest first.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="no-scrollbar flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <TaskFeedbackList taskId={plan.id} people={people} heading="All feedback" />
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}