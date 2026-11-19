"use client";

import { useState, type ReactNode } from "react";
import AnimatedProgress from "@/components/dashboard/AnimatedProgress";
import DevRevisionBoard from "@/components/dashboard/DevRevisionBoard";
import FormulaAuditDrawer, { type AuditRecord } from "@/components/dashboard/FormulaAuditDrawer";
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
  totalModules: number;
  deployedModules: number;
}

const CARD_SHELL =
  "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0";

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
        className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm outline-none focus:ring-2 focus:ring-[var(--sys-primary)]/30 cursor-pointer"
      >
        {TIME_RANGES.map((range) => (
          <option key={range} value={range}>
            {timeRangeLabel(range)}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

const KPI_ICON_TONES: Record<string, string> = {
  slate: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
  rose: "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400",
  indigo: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
  amber: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
};

function KpiCard({
  label,
  value,
  sub,
  tone,
  valueClass,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone: keyof typeof KPI_ICON_TONES;
  valueClass?: string;
  icon: ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm min-w-0">
      <div className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${KPI_ICON_TONES[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={HEAD_CELL}>{label}</p>
        <p className={`font-mono text-xl font-extrabold leading-tight tabular-nums mt-0.5 ${valueClass ?? "text-slate-900 dark:text-white"}`}>
          {value}
        </p>
        <p className="font-mono text-[11px] text-slate-400 dark:text-slate-500 truncate">{sub}</p>
      </div>
    </div>
  );
}

function PmDeploymentCard({
  rows,
  onInspect,
}: {
  rows: PmLeaderboardRow[];
  onInspect: (record: AuditRecord) => void;
}) {
  const ctx = useTimeRange();

  const inspectPm = (idx: number) => {
    const pm = rows[idx];
    if (!pm) return;
    onInspect({
      kind: "deployment",
      rank: idx + 1,
      name: pm.pmName,
      avatar: pm.pmAvatar,
      deployed: pm.deployedModules,
      total: pm.totalModules,
      rate: pm.deployedPercentage,
    });
  };

  return (
    <section className={CARD_SHELL}>
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0">
        <div className="flex items-stretch gap-3 min-w-0">
          <span className="w-1 shrink-0 rounded-full bg-rose-500 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Lowest Deployment Rates
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Project managers with the lowest deployment rates.
            </p>
          </div>
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 text-[10px] font-bold uppercase tracking-wider">
          Top 3 PMs
        </span>
      </div>

      <div className="grid grid-cols-12 items-center gap-3 px-5 py-2 bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <span className={`${HEAD_CELL} col-span-7`}>Rank / Team member</span>
        <span className={`${HEAD_CELL} col-span-2 text-right`}>Rate</span>
        <span className={`${HEAD_CELL} col-span-3 text-right`}>Deployed</span>
      </div>

      {rows.length > 0 ? (
        <div className="no-scrollbar flex-1 flex flex-col divide-y divide-slate-100 dark:divide-slate-800 min-h-0 overflow-y-auto">
          {rows.map((pm, idx) => (
            <button
              key={pm.pmId}
              type="button"
              onClick={() => inspectPm(idx)}
              className="flex-1 w-full grid grid-cols-12 items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition cursor-pointer group"
            >
              <div className="col-span-7 flex items-center gap-3 min-w-0">
                <span
                  className={`w-6 h-6 shrink-0 rounded-md border flex items-center justify-center font-mono text-[11px] font-bold ${
                    idx === 0
                      ? "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 border-rose-300/70 dark:border-rose-900/60"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {idx + 1}
                </span>
                <MemberAvatar
                  name={pm.pmName}
                  src={pm.pmAvatar}
                  className="w-9 h-9 shrink-0 text-xs border bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-[var(--sys-primary-text)] transition-colors">
                    {pm.pmName}
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">deployment rate</p>
                  <div className="mt-1.5 h-1.5 w-full max-w-[180px] rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <AnimatedProgress
                      percentage={pm.deployedPercentage}
                      className="bg-slate-900 dark:bg-slate-200"
                    />
                  </div>
                </div>
              </div>
              <p className="col-span-2 font-mono text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-none tabular-nums text-right">
                {Math.round(pm.deployedPercentage)}%
              </p>
              <div className="col-span-3 text-right">
                <p className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100 leading-none tabular-nums">
                  {pm.deployedModules} / {pm.totalModules}
                </p>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1">deployed</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="flex-1 px-5 py-10 text-center text-sm font-medium text-slate-400 dark:text-slate-500 italic">
          No deployment activity recorded yet.
        </p>
      )}

      <div className="px-5 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-[11px] font-medium text-slate-400 dark:text-slate-500 shrink-0">
        <span className="truncate">{timeRangeLabel(ctx?.timeRange ?? "This Week")} · Deployment counts shown as deployed / total</span>
        <button
          type="button"
          onClick={() => inspectPm(0)}
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

function HallOfFameContent({
  pmLeaderboard,
  revisionModules,
  totalModules,
  deployedModules,
}: HallOfFameClientProps) {
  const ctx = useTimeRange();
  const { rows, teamRAvg, teamIntensitySum } = useRevisionRanking(revisionModules);
  const [audit, setAudit] = useState<AuditRecord | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const inspect = (record: AuditRecord) => {
    setAudit(record);
    setAuditOpen(true);
  };

  const hasData = pmLeaderboard.length > 0 || revisionModules.length > 0;
  const periodLabel = timeRangeLabel(ctx?.timeRange ?? "This Week");
  const lowestPm = pmLeaderboard[0];
  const topDev = rows[0];
  const tieCount = topDev ? rows.filter((r) => r.rAvg === topDev.rAvg).length : 0;
  const topDevSub = topDev
    ? `${topDev.rAvg.toFixed(2)} rev/module · ${
        tieCount > 1 ? `${tieCount}-way tie` : rows.length === 1 ? "Leading developer" : `Top ${rows.length} devs`
      }`
    : "No revisions in period";

  const topMean = rows.length > 0 ? rows.reduce((sum, r) => sum + r.rAvg, 0) / rows.length : 0;
  const benchmark =
    rows.length > 0 && teamRAvg > 0
      ? `Top ${rows.length} are ${(((topMean - teamRAvg) / teamRAvg) * 100).toFixed(1)}% vs avg`
      : null;

  return (
    <div id="hall-of-fame-container" className="w-full min-h-full overflow-y-auto flex flex-col gap-3.5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            People &amp; Performance
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Hall of fame
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            A closer look at deployment rates and revision intensity across your team.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <FullscreenButton />
          <PeriodSelect />
        </div>
      </header>

      {hasData ? (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiCard
              label="Total Tracked Modules"
              value={String(totalModules)}
              sub={`${deployedModules} deployed / ${totalModules - deployedModules} pending`}
              tone="slate"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              }
            />
            <KpiCard
              label="Lowest PM Deployment"
              value={lowestPm ? `${Math.round(lowestPm.deployedPercentage)}%` : "—"}
              sub={lowestPm ? `${lowestPm.pmName.split(" ")[0]} · ${lowestPm.deployedModules}/${lowestPm.totalModules}` : "No PM data"}
              tone="rose"
              valueClass="text-rose-600 dark:text-rose-400"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M22 17l-8.5-8.5-5 5L2 7M16 17h6v-6" />
                </svg>
              }
            />
            <KpiCard
              label="Team Revision Average"
              value={teamRAvg.toFixed(2)}
              sub="revisions per module"
              tone="indigo"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="18" cy="18" r="3" />
                  <circle cx="6" cy="6" r="3" />
                  <path strokeLinecap="round" d="M13 6h3a2 2 0 0 1 2 2v7M6 9v12" />
                </svg>
              }
            />
            <KpiCard
              label="Highest Revision Intensity"
              value={topDev ? `${Math.round(topDev.sharePct)}%` : "—"}
              sub={topDevSub}
              tone="amber"
              valueClass="text-amber-600 dark:text-amber-400"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
                </svg>
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch lg:flex-1 lg:min-h-0">
            <PmDeploymentCard rows={pmLeaderboard} onInspect={inspect} />
            <DevRevisionBoard revisionModules={revisionModules} onInspect={inspect} />
          </div>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Understanding revision share
                </h3>
                <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Intensity = Revisions ÷ Revised Modules
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Share % is each developer&apos;s revision intensity relative to the whole team, normalized by revised modules.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-4">
              {benchmark && (
                <span className="hidden sm:inline font-mono text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  {benchmark}
                </span>
              )}
              <div className="sm:border-l sm:border-slate-200 dark:sm:border-slate-700 sm:pl-4">
                <p className={HEAD_CELL}>Team average</p>
                <p className="font-mono text-xl font-extrabold text-slate-900 dark:text-white leading-none tabular-nums mt-0.5">
                  {teamRAvg.toFixed(2)}
                </p>
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                  revisions per module
                </p>
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className={`${CARD_SHELL} px-6 py-16 items-center justify-center text-center`}>
          <p className="text-sm font-medium text-slate-400 dark:text-slate-500 italic">
            No deployment or revision activity recorded yet.
          </p>
        </div>
      )}

      <FormulaAuditDrawer
        record={audit}
        open={auditOpen}
        teamRAvg={teamRAvg}
        teamIntensitySum={teamIntensitySum}
        periodLabel={periodLabel}
        onClose={() => setAuditOpen(false)}
      />
    </div>
  );
}

export default function HallOfFameClient(props: HallOfFameClientProps) {
  return (
    <TimeRangeProvider>
      <HallOfFameContent {...props} />
    </TimeRangeProvider>
  );
}