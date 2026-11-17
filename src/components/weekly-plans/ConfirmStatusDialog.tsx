"use client";

import { createPortal } from "react-dom";
import { weeklyPlanStatusMeta, type WeeklyPlanStatus } from "@/types/weeklyPlan";

interface ConfirmStatusDialogProps {
  title: string;
  next: WeeklyPlanStatus;
  irreversible: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmStatusDialog({
  title,
  next,
  irreversible,
  busy,
  onCancel,
  onConfirm,
}: ConfirmStatusDialogProps) {
  const meta = weeklyPlanStatusMeta(next);
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <div
          className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4"
          style={{ backgroundColor: `${meta.dot}1F`, color: meta.dot }}
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-extrabold text-center text-slate-900 dark:text-white mb-2">
          Update Status
        </h3>
        <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-2">
          Mark <span className="font-bold text-slate-700 dark:text-slate-200">&quot;{title}&quot;</span> as{" "}
          <span className="font-bold" style={{ color: meta.dot }}>
            {meta.label}
          </span>
          ?
        </p>
        {irreversible && next === "done" && (
          <p className="text-xs text-center font-semibold text-amber-600 dark:text-amber-400 mb-4">
            Once marked done, you can no longer change the status.
          </p>
        )}
        <div className="flex justify-center gap-3 mt-4">
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
            onClick={onConfirm}
            disabled={busy}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50"
            style={{ backgroundColor: meta.dot }}
          >
            {busy ? "Updating..." : `Mark as ${meta.label}`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}