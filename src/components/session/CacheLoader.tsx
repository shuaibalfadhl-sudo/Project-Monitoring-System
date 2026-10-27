"use client";

export default function CacheLoader({ error }: { error?: string | null }) {
  if (error) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-sm text-center">
        <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">Could not load your workspace data</p>
        <p className="text-xs text-gray-500 dark:text-slate-400">{error}</p>
      </div>
    );
  }
  return (
    <div className="w-full bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-center gap-3">
      <svg className="animate-spin h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-sm font-bold text-gray-400 dark:text-slate-500">Loading workspace…</span>
    </div>
  );
}
