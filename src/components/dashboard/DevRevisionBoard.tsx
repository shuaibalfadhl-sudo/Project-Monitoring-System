"use client";

import { useTimeRange, timeRangeLabel } from "@/components/dashboard/TimeRangeContext";
import MemberAvatar from "@/components/dashboard/MemberAvatar";
import { useRevisionRanking, type RevisionModuleRow } from "@/components/dashboard/useRevisionRanking";

const CARD_SHELL =
  "bg-white dark:bg-slate-900 border border-gray-200/70 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col";

export default function DevRevisionBoard({
  revisionModules,
}: {
  revisionModules: RevisionModuleRow[];
}) {
  const ctx = useTimeRange();
  const { rows } = useRevisionRanking(revisionModules);

  return (
    <section className={`${CARD_SHELL} animate-slide-up`} style={{ animationDelay: "0.15s" }}>
      <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4">
        <div className="flex items-stretch gap-3 min-w-0">
          <span className="w-1 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              Highest Revision Share
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
              Revision intensity, normalized by revised modules.
            </p>
          </div>
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-900/30 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
          Top 3 Devs
        </span>
      </div>

      <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_4.5rem] gap-x-5 items-center bg-slate-50 dark:bg-slate-800/60 border-y border-gray-100 dark:border-slate-800 px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        <span aria-hidden="true" />
        <span>Rank / Team member</span>
        <span className="text-right">Share</span>
      </div>

      {rows.length > 0 ? (
        <ul className="flex-1 flex flex-col">
          {rows.map((dev, idx) => (
            <li
              key={dev.devId}
              className="flex-1 grid grid-cols-[1.75rem_minmax(0,1fr)_4.5rem] gap-x-5 items-center px-6 py-4 border-b last:border-0 border-gray-100 dark:border-slate-800"
            >
              <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                  idx === 0
                    ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}
              >
                {idx + 1}
              </span>
              <div className="flex items-center gap-3 min-w-0">
                <MemberAvatar
                  name={dev.devName}
                  src={dev.devAvatar}
                  className="w-9 h-9 text-sm bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 ring-2 ring-amber-100 dark:ring-amber-900/50"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    {dev.devName}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1.5">
                    {dev.totalRevisions} revision{dev.totalRevisions !== 1 ? "s" : ""} ·{" "}
                    {dev.rAvg.toFixed(2)} rev/module across {dev.totalModulesAssigned} revised module
                    {dev.totalModulesAssigned !== 1 ? "s" : ""}
                  </p>
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                    {dev.sharePct.toFixed(1)}% of team
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-[var(--sys-primary-text)] leading-none tabular-nums">
                  {Math.round(dev.sharePct)}%
                </p>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1">
                  revision share
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex-1 px-6 py-10 text-center text-sm font-medium text-slate-400 dark:text-slate-500 italic">
          No revisions recorded in this period.
        </p>
      )}

      <div className="bg-slate-50/70 dark:bg-slate-800/40 border-t border-gray-100 dark:border-slate-800 px-6 py-3 text-[11px] font-medium text-slate-400 dark:text-slate-500">
        {timeRangeLabel(ctx?.timeRange ?? "This Week")} · Ranked by revision intensity share
      </div>
    </section>
  );
}