"use client";

import { useMemo } from "react";
import { useTimeRange } from "@/components/dashboard/TimeRangeContext";
import { computeRevisionShares, type DevRevisionShare } from "@/lib/revisionShares";

export interface RevisionModuleRow {
  devId: string;
  devName: string;
  devAvatar: string | null;
  revisionCount: number;
  revisionDate: string | null;
}

export function useRevisionRanking(revisionModules: RevisionModuleRow[]) {
  const bounds = useTimeRange()?.bounds;

  return useMemo(() => {
    if (!bounds) return { rows: [] as DevRevisionShare[], teamRAvg: 0 };

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
      .slice(0, 3);

    return { rows: ranked, teamRAvg: avg };
  }, [revisionModules, bounds]);
}