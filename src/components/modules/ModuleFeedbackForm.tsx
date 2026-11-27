"use client";

import { useId, useRef } from "react";
import FeedbackFilePicker from "@/components/weekly-plans/FeedbackFilePicker";
import type { ModuleFeedbackDraft } from "@/types/moduleFeedback";

interface ModuleFeedbackFormProps {
  draft: ModuleFeedbackDraft;
  onDraftChange: (draft: ModuleFeedbackDraft) => void;
  busy?: boolean;
}

export default function ModuleFeedbackForm({
  draft,
  onDraftChange,
  busy = false,
}: ModuleFeedbackFormProps) {
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 space-y-4">
      <div>
        <label
          htmlFor={textareaId}
          className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2"
        >
          Your Feedback <span className="font-medium normal-case text-slate-400">(optional)</span>
        </label>
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden transition-colors focus-within:border-[var(--sys-primary)] focus-within:ring-2 focus-within:ring-[var(--sys-primary)]/30">
        <textarea
          id={textareaId}
          ref={textareaRef}
          value={draft.text}
          onChange={(e) => onDraftChange({ ...draft, text: e.target.value })}
          rows={3}
          disabled={busy}
          placeholder="Add your feedback here..."
          className="w-full bg-transparent px-3.5 py-3 text-sm font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none resize-none disabled:opacity-60"
        />
        <FeedbackFilePicker
          embedded
          busy={busy}
          pasteTargetRef={textareaRef}
          onChange={(files) => onDraftChange({ ...draft, files })}
        />
      </div>
      </div>

      <p className="text-[11px] font-medium text-slate-400">
        Paste images or files into the feedback box. Saved with the next module status change.
      </p>
    </div>
  );
}
