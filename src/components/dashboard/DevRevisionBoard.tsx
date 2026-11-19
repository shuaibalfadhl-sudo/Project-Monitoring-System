"use client";

import { useTimeRange, timeRangeLabel } from "@/components/dashboard/TimeRangeContext";
import MemberAvatar from "@/components/dashboard/MemberAvatar";
import AnimatedProgress from "@/components/dashboard/AnimatedProgress";
import { useRevisionRanking, type RevisionModuleRow } from "@/components/dashboard/useRevisionRanking";
import type { AuditRecord } from "@/components/dashboard/FormulaAuditDrawer";

const AVATAR_TONES = [
  "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60",
  "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60",
  "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60",
];

export default function DevRevisionBoard({
  revisionModules,
  onInspect,
}: {
  revisionModules: RevisionModuleRow[];
  onInspect: (record: AuditRecord) => void;
}) {
  const ctx = useTimeRange();
  const { rows } = useRevisionRanking(revisionModules);

  const inspectDev = (idx: number) => {
    const dev = rows[idx];
    if (!dev) return;
    onInspect({
      kind: "revision",
      rank: idx + 1,
      name: dev.devName,
      avatar: dev.devAvatar ?? null,
      revisions: dev.totalRevisions,
      revisedModules: dev.totalModulesAssigned,
      rAvg: dev.rAvg,
      sharePct: dev.sharePct,
    });
  };

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0">
        <div className="flex items-stretch gap-3 min-w-0">
          <span className="w-1 shrink-0 rounded-full bg-amber-400 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Highest Revision Share
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Revision intensity, normalized by revised modules.
            </p>
          </div>
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/60 text-[10px] font-bold uppercase tracking-wider">
          Top 3 Devs
        </span>
      </div>

      <div className="grid grid-cols-12 items-center gap-3 px-5 py-2 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0">
        <span className="col-span-9">Rank / Team member &amp; intensity</span>
        <span className="col-span-3 text-right">Share</span>
      </div>

      {rows.length > 0 ? (
        <div className="no-scrollbar flex-1 flex flex-col divide-y divide-slate-100 dark:divide-slate-800 min-h-0 overflow-y-auto">
          {rows.map((dev, idx) => (
            <button
              key={dev.devId}
              type="button"
              onClick={() => inspectDev(idx)}
              className="flex-1 w-full grid grid-cols-12 items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition cursor-pointer group"
            >
              <div className="col-span-9 flex items-center gap-3 min-w-0">
                <span
                  className={`w-6 h-6 shrink-0 rounded-md border flex items-center justify-center font-mono text-[11px] font-bold ${
                    idx === 0
                      ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300/70 dark:border-amber-900/60"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {idx + 1}
                </span>
                <MemberAvatar
                  name={dev.devName}
                  src={dev.devAvatar}
                  className={`w-9 h-9 shrink-0 text-xs border ${AVATAR_TONES[idx] ?? AVATAR_TONES[2]}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-[var(--sys-primary-text)] transition-colors">
                      {dev.devName}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                    {dev.totalRevisions} revision{dev.totalRevisions !== 1 ? "s" : ""} ·{" "}
                    <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                      {dev.rAvg.toFixed(2)}
                    </span>{" "}
                    rev/module across {dev.totalModulesAssigned} revised module
                    {dev.totalModulesAssigned !== 1 ? "s" : ""}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 max-w-[180px] rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <AnimatedProgress
                        percentage={Math.min(100, Math.round((dev.sharePct / 25) * 100))}
                        className="bg-amber-500"
                      />
                    </div>
                    <span className="font-mono text-[10px] font-medium text-slate-400 dark:text-slate-500 shrink-0">
                      {dev.sharePct.toFixed(1)}% of team
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-span-3 text-right">
                <p className="font-mono text-lg sm:text-xl font-extrabold text-[var(--sys-primary-text)] leading-none tabular-nums">
                  {Math.round(dev.sharePct)}%
                </p>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1">
                  revision share
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="flex-1 px-5 py-10 text-center text-sm font-medium text-slate-400 dark:text-slate-500 italic">
          No revisions recorded in this period.
        </p>
      )}

      <div className="px-5 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-[11px] font-medium text-slate-400 dark:text-slate-500 shrink-0">
        <span className="truncate">{timeRangeLabel(ctx?.timeRange ?? "This Week")} · Ranked by revision intensity share</span>
        <button
          type="button"
          onClick={() => inspectDev(0)}
          disabled={rows.length === 0}
          className="shrink-0 inline-flex items-center gap-1 font-semibold text-[var(--sys-primary-text)] hover:opacity-80 transition disabled:opacity-40"
        >
          Inspect math
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H8M17 7v9" />
          </svg>
        </button>
      </div>
    </section>
  );
}