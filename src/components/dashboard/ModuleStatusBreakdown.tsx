"use client";

import { useState } from "react";
import { MODULE_STATUSES, statusMeta } from "@/lib/moduleStatuses";

interface ModuleStatusBreakdownProps {
  modules: { status?: string | null }[];
}

export default function ModuleStatusBreakdown({ modules }: ModuleStatusBreakdownProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const counts = new Map<string, number>();
  for (const mod of modules) {
    const value = statusMeta(mod.status).value;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const total = modules.length;
  const items = MODULE_STATUSES
    .map((s) => ({ ...s, count: counts.get(s.value) ?? 0 }))
    .filter((s) => s.count > 0)
    .map((s) => ({ ...s, percent: (s.count / total) * 100 }));

  const focused = selected ? items.find((i) => i.value === selected) ?? null : null;
  const toggle = (value: string) => setSelected((prev) => (prev === value ? null : value));

  // While a status is focused the others share what it leaves behind, so estimate
  // their rendered width to decide whether their labels still fit.
  const focusedPercent = focused?.percent ?? 0;
  const othersModules = total - (focused?.count ?? 0);
  const remainingWidth = 100 - focusedPercent;

  // Minimum flex-basis that fits "100.0%" over "123 modules".
  const FOCUSED_MIN_BASIS = "7rem";

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
          Module Status Breakdown
        </h3>
        {focused ? (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-400 dark:text-slate-500">
              {focused.count} of {total} modules · {focused.percent.toFixed(1)}%
            </span>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Show all
            </button>
          </div>
        ) : (
          <span className="text-xs font-semibold text-gray-400 dark:text-slate-500">
            {total} module{total === 1 ? "" : "s"} across all projects · click a status to expand
          </span>
        )}
      </div>

      {total === 0 ? (
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 italic py-6 text-center bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
          No modules to show yet.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-6">
            {items.map((item) => {
              const isActive = selected === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => toggle(item.value)}
                  aria-pressed={isActive}
                  title={isActive ? "Click to collapse" : "Click to expand"}
                  className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-2 py-1 transition-all ${
                    isActive
                      ? "bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.chart }}
                  />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex w-full items-end h-24">
            {items.map((item) => {
              const isActive = selected === item.value;
              // Same flex model for every segment so changes interpolate: the focused
              // one holds its real share of the bar, or a basis wide enough for its
              // labels when that share is too narrow.
              const estimatedWidth = focused
                ? othersModules > 0
                  ? (item.count / othersModules) * remainingWidth
                  : 0
                : item.percent;
              const showLabel = isActive || estimatedWidth >= 8;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => toggle(item.value)}
                  title={`${item.label}: ${item.count} (${item.percent.toFixed(1)}%)`}
                  aria-label={`${item.label}: ${item.count} modules, ${item.percent.toFixed(1)}%`}
                  aria-pressed={isActive}
                  className={`relative flex flex-col items-center justify-center min-w-0 overflow-hidden first:rounded-l-md last:rounded-r-md transition-all duration-500 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                    isActive ? "h-24 z-10 rounded-md shadow-lg" : "h-16 hover:h-[4.5rem]"
                  }`}
                  style={{
                    flexGrow: isActive ? 0 : focused ? item.count : item.percent,
                    flexBasis: isActive ? `max(${item.percent}%, ${FOCUSED_MIN_BASIS})` : 0,
                    backgroundColor: item.chart,
                    boxShadow: "inset -1px 0 0 rgba(255,255,255,0.18)",
                  }}
                >
                  <span
                    className={`text-sm font-bold text-white drop-shadow-sm whitespace-nowrap transition-opacity duration-300 ${
                      showLabel ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {item.percent.toFixed(1)}%
                  </span>
                  {isActive && (
                    <span className="text-[10px] font-semibold text-white/85 whitespace-nowrap">
                      {item.count} module{item.count === 1 ? "" : "s"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Kept in the layout (not removed) so focusing a status doesn't resize the card. */}
          <div
            aria-hidden={!!focused}
            className={`mt-2 flex justify-between text-[10px] font-semibold text-gray-500 dark:text-slate-400 transition-opacity duration-300 ${
              focused ? "opacity-0" : "opacity-100"
            }`}
          >
            {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((tick) => (
              <span key={tick}>{tick}%</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
