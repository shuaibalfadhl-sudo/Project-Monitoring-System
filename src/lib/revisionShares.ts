export interface DevModuleStat {
  devId: string;
  devName: string;
  devAvatar?: string | null;
  totalRevisions: number;
  totalModulesAssigned: number;
}

export interface DevRevisionShare extends DevModuleStat {
  rAvg: number;
  sharePct: number;
  aboveTeamAverage: boolean;
}

export interface RevisionShareSummary {
  shares: DevRevisionShare[];
  teamRAvg: number;
}

/**
 * R_avg = total revisions / total modules assigned.
 * Revision Share % = developer R_avg / sum of R_avg across all active
 * developers × 100 — active means at least one assigned module.
 * Shares always sum to 100 when any developer is active.
 */
export function computeRevisionShares(stats: DevModuleStat[]): RevisionShareSummary {
  const active = stats.filter((s) => s.totalModulesAssigned > 0);
  const rAvgs = active.map((s) => s.totalRevisions / s.totalModulesAssigned);
  const sumRAvg = rAvgs.reduce((a, b) => a + b, 0);
  const teamRAvg = active.length > 0 ? sumRAvg / active.length : 0;

  const shares: DevRevisionShare[] = active
    .map((s, i) => ({
      ...s,
      rAvg: rAvgs[i],
      sharePct: sumRAvg > 0 ? (rAvgs[i] / sumRAvg) * 100 : 0,
      aboveTeamAverage: rAvgs[i] > teamRAvg,
    }))
    .sort((a, b) => b.sharePct - a.sharePct);

  return { shares, teamRAvg };
}
