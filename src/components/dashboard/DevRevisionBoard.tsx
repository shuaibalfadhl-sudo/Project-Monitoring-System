"use client";

import { useMemo } from "react";
import { useTimeRange } from "@/components/dashboard/TimeRangeContext";
import { computeRevisionShares } from "@/lib/revisionShares";

export interface RevisionModuleRow {
  devId: string;
  devName: string;
  devAvatar: string | null;
  revisionCount: number;
  revisionDate: string | null;
}

export default function DevRevisionBoard({
  revisionModules,
}: {
  revisionModules: RevisionModuleRow[];
}) {
  const ctx = useTimeRange();
  const bounds = ctx?.bounds;

  const { rows, teamRAvg } = useMemo(() => {
    if (!bounds) return { rows: [], teamRAvg: 0 };

    const stats: Record<string, { devId: string; devName: string; devAvatar: string | null; totalRevisions: number; revisedModules: number }> = {};

    revisionModules.forEach((m) => {
      if (!m.devId || !m.revisionDate) return;
      const d = new Date(m.revisionDate);
      if (d < bounds.startDate || d > bounds.endDate) return;
      // Only modules that actually have a revision count are summed into the base.
      if (!m.revisionCount || m.revisionCount <= 0) return;

      if (!stats[m.devId]) {
        stats[m.devId] = {
          devId: m.devId,
          devName: m.devName || "Unknown Developer",
          devAvatar: m.devAvatar,
          totalRevisions: 0,
          revisedModules: 0,
        };
      }
      stats[m.devId].totalRevisions += m.revisionCount;
      stats[m.devId].revisedModules += 1;
    });

    const perDev = Object.values(stats).map((s) => ({
      devId: s.devId,
      devName: s.devName,
      devAvatar: s.devAvatar,
      totalRevisions: s.totalRevisions,
      totalModulesAssigned: s.revisedModules,
    }));

    // Revision Share % normalizes R_avg across every developer that has
    // revised modules in the period, so shares sum to 100 as a team metric.
    const { shares, teamRAvg: avg } = computeRevisionShares(perDev);

    const ranked = [...shares]
      .sort((a, b) => b.sharePct - a.sharePct)
      .slice(0, 3)
      .map((s) => ({ ...s, share: s }));

    return { rows: ranked, teamRAvg: avg };
  }, [revisionModules, bounds]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex-1 animate-slide-up" style={{ animationDelay: "0.2s" }}>
      <div className="flex justify-between items-start mb-6">
        <div className="flex gap-3 items-start">
          <div className="w-10 h-10 shrink-0 bg-orange-50 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
            <svg className="w-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-gray-100 leading-tight">Highest Revision Share</h2>
            <p className="text-xs font-medium text-gray-500 mt-1">
              Revision intensity, normalized by revised modules · {ctx?.timeRange ?? "This Week"}.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400 px-3 py-1.5 rounded-full uppercase tracking-wider shrink-0 mt-1">Top 3 Devs</span>
      </div>

      <div className="flex flex-col gap-6">
        {rows.length > 0 ? (
          rows.map((dev, idx) => (
            <div key={dev.devId} className="flex items-center gap-4">
              <div className="w-8 h-8 shrink-0 bg-orange-50 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-xs font-black text-orange-500">
                {idx + 1}
              </div>
              <div className="w-10 h-10 shrink-0 bg-amber-50 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-sm font-black text-amber-500 dark:text-amber-400 overflow-hidden border-2 border-amber-100 dark:border-amber-800/50">
                {dev.devAvatar ? (
                  <img src={dev.devAvatar} alt={dev.devName} className="w-full h-full object-cover" />
                ) : (
                  dev.devName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-none truncate">{dev.devName}</h3>
                  {dev.share?.aboveTeamAverage && (
                    <span className="text-[9px] font-black text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                      Above avg
                    </span>
                  )}
                </div>
                <p className="text-xs mb-2">
                  <span className="text-lg font-black text-orange-500">{dev.share ? Math.round(dev.share.sharePct) : 0}%</span>{" "}
                  <span className="text-gray-500 font-medium">revision share</span>
                </p>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${dev.share?.aboveTeamAverage ? "bg-red-500" : "bg-orange-500"}`}
                    style={{ width: `${dev.share ? Math.min(dev.share.sharePct, 100) : 0}%` }}
                  />
                </div>
                <p className="text-[10px] font-medium text-gray-400 mt-2">
                  {dev.totalRevisions} revision{dev.totalRevisions !== 1 ? "s" : ""} ·{" "}
                  {dev.share ? dev.share.rAvg.toFixed(2) : "0.00"} rev/module across {dev.totalModulesAssigned} revised module{dev.totalModulesAssigned !== 1 ? "s" : ""} ·{" "}
                  {dev.share?.sharePct ? dev.share.sharePct.toFixed(1) : "0.0"}% of team
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-sm text-gray-500 dark:text-slate-400 italic">
            No revisions recorded in this period.
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <p className="text-[10px] font-medium text-gray-400 dark:text-slate-500 mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
          Team average: {teamRAvg.toFixed(2)} revisions per module. Share % is each developer&apos;s revision intensity relative to the whole team.
        </p>
      )}
    </div>
  );
}
