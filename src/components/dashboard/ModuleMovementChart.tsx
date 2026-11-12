"use client";

import { useMemo, useRef, useState } from "react";
import { statusLabel, statusMeta } from "@/lib/moduleStatuses";
import type { StatusMovement } from "@/lib/statusMovements";

interface ModuleMovementChartProps {
  movements: StatusMovement[];
}

type Mode = "year" | "month" | "week";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STATUS_LIMIT = 5;

const CHART_WIDTH = 900;
const CHART_HEIGHT = 210;
const PAD_LEFT = 30;
const PAD_RIGHT = 10;
const PAD_TOP = 8;
const PAD_BOTTOM = 18;

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export default function ModuleMovementChart({ movements }: ModuleMovementChartProps) {
  const [mode, setMode] = useState<Mode>("year");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const years = useMemo(
    () => Array.from(new Set(movements.map((m) => m.year))).sort((a, b) => b - a),
    [movements],
  );
  const year = selectedYear ?? years[0] ?? null;

  const monthsWithData = useMemo(() => {
    const set = new Set<number>();
    for (const m of movements) if (m.year === year) set.add(m.month);
    return Array.from(set).sort((a, b) => a - b);
  }, [movements, year]);

  const month = selectedMonth ?? monthsWithData[0] ?? 1;

  const weeksWithData = useMemo(() => {
    const set = new Set<number>();
    for (const m of movements) {
      if (m.year === year && m.month === month) set.add(Math.ceil(m.day / 7));
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [movements, year, month]);

  const week = selectedWeek ?? weeksWithData[0] ?? 1;

  const data = useMemo(() => {
    const build = (labels: string[]) =>
      labels.map((label) => ({ label, values: new Map<string, number>() }));
    let buckets: { label: string; values: Map<string, number> }[] = [];
    let scopeTotal = 0;

    if (mode === "year") {
      if (year === null) return null;
      buckets = build(MONTH_LABELS);
      for (const movement of movements) {
        if (movement.year !== year) continue;
        const bucket = buckets[movement.month - 1];
        if (!bucket) continue;
        bucket.values.set(movement.status, (bucket.values.get(movement.status) ?? 0) + movement.count);
        scopeTotal += movement.count;
      }
    } else if (mode === "month") {
      if (year === null) return null;
      const daysInMonth = new Date(year, month, 0).getDate();
      const weekCount = Math.ceil(daysInMonth / 7);
      buckets = build(Array.from({ length: weekCount }, (_, i) => `W${i + 1}`));
      for (const movement of movements) {
        if (movement.year !== year || movement.month !== month) continue;
        const weekIndex = Math.min(Math.ceil(movement.day / 7), weekCount) - 1;
        const bucket = buckets[weekIndex];
        if (!bucket) continue;
        bucket.values.set(movement.status, (bucket.values.get(movement.status) ?? 0) + movement.count);
        scopeTotal += movement.count;
      }
    } else {
      if (year === null) return null;
      const daysInMonth = new Date(year, month, 0).getDate();
      const startDay = (week - 1) * 7 + 1;
      const endDay = Math.min(week * 7, daysInMonth);
      buckets = build(
        Array.from({ length: endDay - startDay + 1 }, (_, i) => String(startDay + i)),
      );
      for (const movement of movements) {
        if (movement.year !== year || movement.month !== month) continue;
        if (movement.day < startDay || movement.day > endDay) continue;
        const bucket = buckets[movement.day - startDay];
        if (!bucket) continue;
        bucket.values.set(movement.status, (bucket.values.get(movement.status) ?? 0) + movement.count);
        scopeTotal += movement.count;
      }
    }

    const scopeTotals = new Map<string, number>();
    for (const bucket of buckets) {
      for (const [status, count] of bucket.values) {
        scopeTotals.set(status, (scopeTotals.get(status) ?? 0) + count);
      }
    }
    const legend = Array.from(scopeTotals.keys())
      .sort((a, b) => (scopeTotals.get(b) ?? 0) - (scopeTotals.get(a) ?? 0))
      .slice(0, STATUS_LIMIT);

    const maxValue = Math.max(
      1,
      ...buckets.map((bucket) =>
        Math.max(0, ...legend.map((status) => bucket.values.get(status) ?? 0)),
      ),
    );

    return {
      buckets,
      legend,
      axisMax: Math.max(1, Math.ceil(maxValue * 1.15)),
      scopeTotal,
    };
  }, [movements, mode, year, month, week]);

  if (years.length === 0 || !data) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-4">
          Module Movements
        </h3>
        <p className="text-xs font-medium text-gray-500 dark:text-slate-400 italic py-5 text-center bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
          No module status changes recorded yet.
        </p>
      </div>
    );
  }

  const pointCount = data.buckets.length;
  const plotWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const x = (index: number) => PAD_LEFT + (index / (pointCount - 1)) * plotWidth;
  const y = (value: number) => PAD_TOP + plotHeight - (value / data.axisMax) * plotHeight;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(data.axisMax * ratio));

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = CHART_WIDTH / rect.width;
    const mx = (e.clientX - rect.left) * scale;
    const index = Math.round(((mx - PAD_LEFT) / plotWidth) * (pointCount - 1));
    setHoverIndex(Math.max(0, Math.min(pointCount - 1, index)));
  };

  const hovered = hoverIndex !== null ? data.buckets[hoverIndex] : null;
  const hoveredRows = hovered
    ? data.legend
        .map((status) => ({ status, value: hovered.values.get(status) ?? 0 }))
        .filter((row) => row.value > 0 && (selectedStatus === null || row.status === selectedStatus))
    : [];
  const hoveredTotal = hoveredRows.reduce((sum, row) => sum + row.value, 0);

  const selectClass =
    "text-xs font-semibold bg-gray-50 dark:bg-slate-800 text-[var(--sys-primary-text)] border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

  const scopeLabel =
    mode === "year"
      ? `in ${year}`
      : mode === "month"
        ? `in ${MONTH_LABELS[month - 1]} ${year}`
        : `in ${MONTH_LABELS[month - 1]} ${year} · Week ${week}`;

  const daysInMonth = year !== null ? new Date(year, month, 0).getDate() : 31;
  const weekCount = Math.ceil(daysInMonth / 7);

  const chartKey = JSON.stringify([
    mode,
    year,
    month,
    week,
    data.legend,
    data.axisMax,
    data.buckets.map((bucket) => [bucket.label, ...bucket.values.entries()]),
  ]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
            Module Movements
          </h3>
          <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 mt-0.5">
            {data.scopeTotal} status change{data.scopeTotal === 1 ? "" : "s"} {scopeLabel} · top {STATUS_LIMIT} statuses
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            aria-label="View"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as Mode);
              setHoverIndex(null);
            }}
            className={selectClass}
          >
            <option value="year">Per Year</option>
            <option value="month">Per Month</option>
            <option value="week">Per Week</option>
          </select>
          <select
            aria-label="Year"
            value={year ?? ""}
            onChange={(e) => {
              setSelectedYear(Number(e.target.value));
              setSelectedMonth(null);
              setSelectedWeek(null);
              setHoverIndex(null);
            }}
            className={selectClass}
          >
            {years.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {mode !== "year" && (
            <select
              aria-label="Month"
              value={month}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value));
                setSelectedWeek(null);
                setHoverIndex(null);
              }}
              className={selectClass}
            >
              {MONTH_LABELS.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          )}
          {mode === "week" && (
            <select
              aria-label="Week"
              value={week}
              onChange={(e) => {
                setSelectedWeek(Number(e.target.value));
                setHoverIndex(null);
              }}
              className={selectClass}
            >
              {Array.from({ length: weekCount }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  Week {index + 1}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {data.scopeTotal === 0 ? (
        <p className="text-xs font-medium text-gray-500 dark:text-slate-400 italic py-5 text-center bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
          No module status changes recorded {scopeLabel}.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 mb-4">
            {data.legend.map((status) => {
              const meta = statusMeta(status);
              const isSelected = selectedStatus === status;
              return (
                <button
                  type="button"
                  key={status}
                  onClick={() => setSelectedStatus(isSelected ? null : status)}
                  aria-pressed={isSelected}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-all duration-200 ${
                    isSelected
                      ? "text-white shadow-sm border-transparent"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                  }`}
                  style={isSelected ? { backgroundColor: meta.chart } : undefined}
                >
                  <span
                    className="h-2 w-2 rounded-sm shrink-0"
                    style={{ backgroundColor: isSelected ? "#ffffff" : meta.chart }}
                  />
                  {statusLabel(status)}
                </button>
              );
            })}
          </div>

          <div className="relative" key={chartKey}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              className="w-full h-auto"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverIndex(null)}
            >
              {ticks.map((tick, index) => (
                <g key={index}>
                  <line
                    x1={PAD_LEFT}
                    x2={CHART_WIDTH - PAD_RIGHT}
                    y1={y(tick)}
                    y2={y(tick)}
                    strokeWidth="1"
                    className="stroke-gray-100 dark:stroke-slate-800"
                  />
                  <text
                    x={PAD_LEFT - 6}
                    y={y(tick) + 3}
                    textAnchor="end"
                    fontSize="8"
                    fontWeight="600"
                    className="fill-gray-400 dark:fill-slate-500"
                  >
                    {tick}
                  </text>
                </g>
              ))}

              {hoverIndex !== null && (
                <line
                  x1={x(hoverIndex)}
                  x2={x(hoverIndex)}
                  y1={PAD_TOP}
                  y2={PAD_TOP + plotHeight}
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  className="stroke-gray-300 dark:stroke-slate-600"
                />
              )}

              {data.buckets.map((bucket, index) => (
                <text
                  key={bucket.label}
                  x={x(index)}
                  y={CHART_HEIGHT - 5}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="600"
                  className="fill-gray-500 dark:fill-slate-400"
                >
                  {bucket.label}
                </text>
              ))}

              {data.legend.map((status) => {
                const isSelected = selectedStatus === status;
                const dimmed = selectedStatus !== null && !isSelected;
                const d = smoothPath(
                  data.buckets.map((bucket, index) => ({
                    x: x(index),
                    y: y(bucket.values.get(status) ?? 0),
                  })),
                );
                return (
                  <g key={status}>
                    {isSelected && (
                      <path
                        d={d}
                        pathLength={100}
                        fill="none"
                        stroke={statusMeta(status).chart}
                        strokeWidth="8"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        opacity="0.3"
                        className="animate-stroke-draw"
                      />
                    )}
                    <path
                      d={d}
                      pathLength={100}
                      fill="none"
                      stroke={statusMeta(status).chart}
                      strokeWidth={isSelected ? 3 : 2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      className={`animate-stroke-draw transition-opacity duration-300 ${dimmed ? "opacity-20" : "opacity-100"}`}
                    />
                  </g>
                );
              })}

              {data.legend.map((status) => {
                const isSelected = selectedStatus === status;
                const dimmed = selectedStatus !== null && !isSelected;
                return data.buckets.map((bucket, index) => {
                  const value = bucket.values.get(status) ?? 0;
                  const isHovered = hoverIndex === index;
                  return (
                    <circle
                      key={`${status}-${index}`}
                      cx={x(index)}
                      cy={y(value)}
                      r={isHovered ? 4 : isSelected ? 3.5 : 2.5}
                      fill={statusMeta(status).chart}
                      stroke="#ffffff"
                      strokeWidth="1"
                      className={`animate-stroke-dots transition-all duration-100 ${dimmed ? "opacity-20" : "opacity-100"}`}
                      style={{ animationDelay: "0.6s" }}
                    />
                  );
                });
              })}

              {data.legend.map((status) => (
                <path
                  key={`hit-${status}`}
                  d={smoothPath(
                    data.buckets.map((bucket, index) => ({
                      x: x(index),
                      y: y(bucket.values.get(status) ?? 0),
                    })),
                  )}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="14"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  pointerEvents="stroke"
                  className="cursor-pointer"
                  onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
                >
                  <title>{statusLabel(status)}</title>
                </path>
              ))}
            </svg>

            {hovered && (
              <div
                className="pointer-events-none absolute z-10 min-w-[9rem] rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-2 shadow-lg animate-fade-in"
                style={{
                  left: `${(x(hoverIndex!) / CHART_WIDTH) * 100}%`,
                  top: 0,
                  transform:
                    hoverIndex === 0
                      ? "translateX(8px)"
                      : hoverIndex === pointCount - 1
                        ? "translateX(calc(-100% - 8px))"
                        : "translateX(-50%)",
                }}
              >
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {mode === "year"
                    ? `${hovered.label} ${year}`
                    : `${MONTH_LABELS[month - 1]} ${year} · ${mode === "week" ? `Day ${hovered.label}` : hovered.label}`}
                </p>
                {hoveredRows.map((row) => (
                  <div key={row.status} className="flex items-center justify-between gap-3 text-[10px] font-bold">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: statusMeta(row.status).chart }}
                      />
                      {statusLabel(row.status)}
                    </span>
                    <span className="text-[var(--sys-primary-text)]">{row.value}</span>
                  </div>
                ))}
                {selectedStatus === null && (
                  <div className="flex items-center justify-between gap-3 border-t border-gray-100 dark:border-slate-700 mt-1.5 pt-1 text-[10px] font-black text-slate-900 dark:text-white">
                    <span>Total</span>
                    <span>{hoveredTotal}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
