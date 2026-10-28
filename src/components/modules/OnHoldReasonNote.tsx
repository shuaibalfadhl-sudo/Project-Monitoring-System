"use client";

export default function OnHoldReasonNote({ remarks }: { remarks?: string | null }) {
  if (!remarks || !remarks.trim()) return null;

  return (
    <div className="mt-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 p-3">
      <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
        On-hold reason
      </p>
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 whitespace-pre-line">
        {remarks}
      </p>
    </div>
  );
}
