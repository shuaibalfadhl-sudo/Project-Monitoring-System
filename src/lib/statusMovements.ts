import { statusMeta } from "./moduleStatuses";

export interface StatusMovement {
  year: number;
  month: number; // 1-12
  status: string;
  count: number;
}

// Months are bucketed in Asia/Manila so the chart matches the timestamps
// shown in the status history timeline.
const MONTH_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "numeric",
});

export function aggregateStatusMovements(
  rows: { status?: string | null; created_at: string }[],
): StatusMovement[] {
  const counts = new Map<string, StatusMovement>();

  for (const row of rows) {
    const date = new Date(row.created_at);
    if (Number.isNaN(date.getTime())) continue;

    const [month, year] = MONTH_FMT.format(date).split("/").map(Number);
    if (!year || !month || month < 1 || month > 12) continue;

    const status = statusMeta(row.status).value;
    const key = `${year}-${month}-${status}`;
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { year, month, status, count: 1 });
  }

  return Array.from(counts.values());
}
