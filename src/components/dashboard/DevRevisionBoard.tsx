"use client";

import { useMemo } from "react";
import { useTimeRange } from "@/components/dashboard/TimeRangeContext";

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

  const rows = useMemo(() => {
    if (!bounds) return [];
    const map: Record<
      string,
      { devId: string; devName: string; devAvatar: string | null; totalRevisions: number; totalModules: number }
    > = {};

    revisionModules.forEach((m) => {
      if (!m.devId || !m.revisionDate) return;
      const d = new Date(m.revisionDate);
      if (d < bounds.startDate || d > bounds.endDate) return;

      if (!map[m.devId]) {
        map[m.devId] = {
          devId: m.devId,
          devName: m.devName || "Unknown Developer",
          devAvatar: m.devAvatar,
          totalRevisions: 0,
          totalModules: 0,
        };
      }
      map[m.devId].totalRevisions += m.revisionCount || 0;
      map[m.devId].totalModules += 1;
    });

    return Object.values(map)
      .filter((r) => r.totalRevisions > 0)
      .sort((a, b) => b.totalRevisions - a.totalRevisions)
      .slice(0, 3);
  }, [revisionModules, bounds]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex-1 animate-slide-up" style={{ animationDelay: "0.2s" }}>
      <div className="flex justify-between items-start mb-6">
        <div className="flex gap-3 items-start">
          <div className="w-10 h-10 shrink-0 bg-orange-50 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-gray-100 leading-tight">Highest Revision Counts</h2>
            <p className="text-xs font-medium text-gray-500 mt-1">
              Revisions in {ctx?.timeRange ?? "This Week"}.
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
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-none mb-1">{dev.devName}</h3>
                <p className="text-xs mb-1">
                  <span className="text-lg font-black text-orange-500">{dev.totalRevisions}</span> <span className="text-gray-500 font-medium">revisions</span>
                </p>
                <p className="text-[10px] font-medium text-gray-400">
                  Across {dev.totalModules} module{dev.totalModules !== 1 ? "s" : ""} revised this period
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
    </div>
  );
}
