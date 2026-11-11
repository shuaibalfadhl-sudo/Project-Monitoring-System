"use client";

import { useMemo, useState } from "react";
import { statusLabel, statusMeta } from "@/lib/moduleStatuses";
import type { StatusMovement } from "@/lib/statusMovements";

interface ModuleMovementChartProps {
  movements: StatusMovement[];
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const OTHER_COLOR = "#94A3B8";
const MONTHLY_STATUS_LIMIT = 5;

interface MonthBucket {
  label: string;
  total: number;
  top: Map<string, number>;
  other: number;
}

export default function ModuleMovementChart({ movements }: ModuleMovementChartProps) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const years = useMemo(
    () => Array.from(new Set(movements.map((m) => m.year))).sort((a, b) => b - a),
    [movements],
  );
  const year = selectedYear ?? years[0] ?? null;

  const data = useMemo(() => {
    const monthly: MonthBucket[] = MONTH_LABELS.map((label) => ({
      label,
      total: 0,
      top: new Map<string, number>(),
      other: 0,
    }));
    let yearTotal = 0;

    if (year !== null) {
      const buckets = MONTH_LABELS.map(() => new Map<string, number>());
      for (const movement of movements) {
        if (movement.year !== year) continue;
        const bucket = buckets[movement.month - 1];
        if (!bucket) continue;
        bucket.set(
          movement.status,
          (bucket.get(movement.status) ?? 0) + movement.count,
        );
        yearTotal += movement.count;
      }

      buckets.forEach((counts, index) => {
        const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
        monthly[index] = {
          label: MONTH_LABELS[index],
          total: sorted.reduce((sum, [, count]) => sum + count, 0),
          top: new Map(sorted.slice(0, MONTHLY_STATUS_LIMIT)),
          other: sorted
            .slice(MONTHLY_STATUS_LIMIT)
            .reduce((sum, [, count]) => sum + count, 0),
        };
      });
    }

    const yearTotals = new Map<string, number>();
    for (const month of monthly) {
      for (const [status, count] of month.top) {
        yearTotals.set(status, (yearTotals.get(status) ?? 0) + count);
      }
    }
    const legend = Array.from(yearTotals.keys()).sort(
      (a, b) => (yearTotals.get(b) ?? 0) - (yearTotals.get(a) ?? 0),
    );

    const maxTotal = Math.max(1, ...monthly.map((month) => month.total));

    return {
      monthly,
      legend,
      axisMax: Math.max(4, Math.ceil(maxTotal / 4) * 4),
      yearTotal,
      hasOther: monthly.some((month) => month.other > 0),
    };
  }, [movements, year]);

  if (year === null) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-5">
          Module Movements per Month
        </h3>
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 italic py-6 text-center bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
          No module status changes recorded yet.
        </p>
      </div>
    );
  }

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(data.axisMax * ratio));

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-sm font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
            Module Movements per Month
          </h3>
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 mt-1">
            {data.yearTotal} status change{data.yearTotal === 1 ? "" : "s"} in {year} · top {MONTHLY_STATUS_LIMIT} statuses per month
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="movementYear" className="text-sm font-bold text-gray-500 dark:text-slate-400">
            Year
          </label>
          <select
            id="movementYear"
            value={year}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-sm font-semibold bg-gray-50 dark:bg-slate-800 text-[var(--sys-primary-text)] border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            {years.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-6">
        {data.legend.map((status) => (
          <span
            key={status}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            <span
              className="h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: statusMeta(status).chart }}
            />
            {statusLabel(status)}
          </span>
        ))}
        {data.hasOther && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: OTHER_COLOR }} />
            Other
          </span>
        )}
      </div>

      <div className="flex gap-2 sm:gap-3">
        <div className="flex h-72 w-7 shrink-0 flex-col justify-between text-right text-[10px] font-semibold text-gray-400 dark:text-slate-500">
          {[...ticks].reverse().map((tick, index) => (
            <span key={index}>{tick}</span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-72">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              {[...ticks].reverse().map((tick, index) => (
                <div key={index} className="w-full border-t border-gray-100 dark:border-slate-800" />
              ))}
            </div>

            <div className="absolute inset-0 flex items-end gap-1.5 sm:gap-2">
              {data.monthly.map((month, index) => (
                <div key={index} className="flex h-full min-w-0 flex-1 items-end">
                  {month.total > 0 && (
                    <div
                      className="flex w-full flex-col-reverse overflow-hidden rounded-md"
                      style={{
                        height: `${(month.total / data.axisMax) * 100}%`,
                        minHeight: "4px",
                      }}
                    >
                      {data.legend.map((status) => {
                        const count = month.top.get(status) ?? 0;
                        if (count === 0) return null;
                        const meta = statusMeta(status);
                        return (
                          <div
                            key={status}
                            title={`${meta.label}: ${count}`}
                            className="flex items-center justify-center overflow-hidden transition-[filter] duration-150 hover:brightness-110"
                            style={{
                              height: `${(count / month.total) * 100}%`,
                              minHeight: "2px",
                              backgroundColor: meta.chart,
                            }}
                          >
                            {count / data.axisMax >= 0.07 && (
                              <span className="text-[10px] font-bold text-white drop-shadow-sm">
                                {count}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {month.other > 0 && (
                        <div
                          title={`Other statuses: ${month.other}`}
                          className="flex items-center justify-center overflow-hidden transition-[filter] duration-150 hover:brightness-110"
                          style={{
                            height: `${(month.other / month.total) * 100}%`,
                            minHeight: "2px",
                            backgroundColor: OTHER_COLOR,
                          }}
                        >
                          {month.other / data.axisMax >= 0.07 && (
                            <span className="text-[10px] font-bold text-white drop-shadow-sm">
                              {month.other}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2 flex gap-1.5 sm:gap-2">
            {data.monthly.map((month, index) => (
              <span
                key={index}
                className="flex-1 text-center text-[10px] font-semibold text-gray-500 dark:text-slate-400"
              >
                {month.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
