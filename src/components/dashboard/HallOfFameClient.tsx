"use client";

import AnimatedProgress from "@/components/dashboard/AnimatedProgress";
import DevRevisionBoard from "@/components/dashboard/DevRevisionBoard";
import FullscreenButton from "@/components/dashboard/FullscreenButton";
import MemberAvatar from "@/components/dashboard/MemberAvatar";
import {
  TimeRangeProvider,
  TIME_RANGES,
  timeRangeLabel,
  useTimeRange,
} from "@/components/dashboard/TimeRangeContext";
import { useRevisionRanking, type RevisionModuleRow } from "@/components/dashboard/useRevisionRanking";

export interface PmLeaderboardRow {
  pmId: string;
  pmName: string;
  pmAvatar: string | null;
  totalModules: number;
  deployedModules: number;
  deployedPercentage: number;
}

interface HallOfFameClientProps {
  pmLeaderboard: PmLeaderboardRow[];
  revisionModules: RevisionModuleRow[];
}

const CARD_SHELL =
  "bg-white dark:bg-slate-900 border border-gray-200/70 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col";

const HEAD_CELL =
  "text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500";

function PeriodSelect() {
  const ctx = useTimeRange();
  const timeRange = ctx?.timeRange ?? "This Week";
  const setTimeRange = ctx?.setTimeRange ?? (() => {});

  return (
    <div className="relative shrink-0">
      <select
        value={timeRange}
        onChange={(e) => setTimeRange(e.target.value)}
        aria-label="Period"
        className="appearance-none bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg pl-4 pr-9 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm outline-none focus:ring-2 focus:ring-[var(--sys-primary)]/30 cursor-pointer"
      >
        {TIME_RANGES.map((range) => (
          <option key={range} value={range}>
            {timeRangeLabel(range)}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

function PmDeploymentCard({ rows }: { rows: PmLeaderboardRow[] }) {
  return (
    <section className={`${CARD_SHELL} animate-slide-up`} style={{ animationDelay: "0.05s" }}>
      <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4">
        <div className="flex items-stretch gap-3 min-w-0">
          <span className="w-1 shrink-0 rounded-full bg-rose-500" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              Lowest Deployment Rates
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
              Developers with the lowest deployment rates.
            </p>
          </div>
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-900/30 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
          Top 3 PMs
        </span>
      </div>

      <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_4.5rem_5rem] gap-x-5 items-center bg-slate-50 dark:bg-slate-800/60 border-y border-gray-100 dark:border-slate-800 px-6 py-2.5">
        <span aria-hidden="true" />
        <span className={HEAD_CELL}>Rank / Team member</span>
        <span className={`${HEAD_CELL} text-right`}>Rate</span>
        <span className={`${HEAD_CELL} text-right`}>Deployed</span>
      </div>

      {rows.length > 0 ? (
        <ul className="flex-1 flex flex-col">
          {rows.map((pm, idx) => (
            <li
              key={pm.pmId}
              className="flex-1 grid grid-cols-[1.75rem_minmax(0,1fr)_4.5rem_5rem] gap-x-5 items-center px-6 py-4 border-b last:border-0 border-gray-100 dark:border-slate-800"
            >
              <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                  idx === 0
                    ? "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}
              >
                {idx + 1}
              </span>
              <div className="flex items-center gap-3 min-w-0">
                <MemberAvatar
                  name={pm.pmName}
                  src={pm.pmAvatar}
                  className="w-9 h-9 text-sm bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 ring-2 ring-rose-100 dark:ring-rose-900/50"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    {pm.pmName}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                    deployment rate
                  </p>
                  <div className="mt-2 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <AnimatedProgress
                      percentage={pm.deployedPercentage}
                      className="bg-[var(--sys-primary)]"
                    />
                  </div>
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none tabular-nums text-right">
                {Math.round(pm.deployedPercentage)}%
              </p>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none tabular-nums">
                  {pm.deployedModules} / {pm.totalModules}
                </p>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1">
                  deployed
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex-1 px-6 py-10 text-center text-sm font-medium text-slate-400 dark:text-slate-500 italic">
          No deployment activity recorded yet.
        </p>
      )}

      <div className="bg-slate-50/70 dark:bg-slate-800/40 border-t border-gray-100 dark:border-slate-800 px-6 py-3 text-[11px] font-medium text-slate-400 dark:text-slate-500">
        Deployment counts shown as deployed / total.
      </div>
    </section>
  );
}

function RevisionShareExplainer({ revisionModules }: { revisionModules: RevisionModuleRow[] }) {
  const { rows, teamRAvg } = useRevisionRanking(revisionModules);
  if (rows.length === 0) return null;

  return (
    <section className="lg:col-span-2 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/80 dark:bg-indigo-950/30 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 animate-slide-up" style={{ animationDelay: "0.25s" }}>
      <div className="min-w-0">
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
          Understanding revision share
        </h3>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          Share % is each developer&apos;s revision intensity relative to the whole team.
          <br />
          Revision intensity is normalized by revised modules.
        </p>
      </div>
      <div className="shrink-0 sm:border-l sm:border-indigo-200/70 dark:sm:border-indigo-900/50 sm:pl-6">
        <p className={HEAD_CELL}>Team average</p>
        <p className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none tabular-nums mt-1">
          {teamRAvg.toFixed(2)}
        </p>
        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1">
          revisions per module
        </p>
      </div>
    </section>
  );
}

export default function HallOfFameClient({
  pmLeaderboard,
  revisionModules,
}: HallOfFameClientProps) {
  const hasData = pmLeaderboard.length > 0 || revisionModules.length > 0;

  return (
    <TimeRangeProvider>
      <div id="hall-of-fame-container" className="w-full min-h-full overflow-y-auto">
        <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sys-primary-text)]">
              People &amp; Performance
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1.5">
              Hall of fame
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">
              A closer look at deployment rates and revision intensity across your team.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <FullscreenButton />
            <PeriodSelect />
          </div>
        </header>

        {hasData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <PmDeploymentCard rows={pmLeaderboard} />
            <DevRevisionBoard revisionModules={revisionModules} />
            <RevisionShareExplainer revisionModules={revisionModules} />
          </div>
        ) : (
          <div className={`${CARD_SHELL} px-6 py-16 items-center justify-center text-center`}>
            <p className="text-sm font-medium text-slate-400 dark:text-slate-500 italic">
              No deployment or revision activity recorded yet.
            </p>
          </div>
        )}
      </div>
    </TimeRangeProvider>
  );
}