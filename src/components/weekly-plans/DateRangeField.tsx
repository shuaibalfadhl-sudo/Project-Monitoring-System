"use client";

import { useEffect, useRef, useState } from "react";

interface DateRangeFieldProps {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  placeholder?: string;
  invalid?: boolean;
}

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toIso(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function formatDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(
    new Date(year, month - 1, day),
  );
}

function formatDayYear(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export default function DateRangeField({
  start,
  end,
  onChange,
  placeholder = "Select date range",
  invalid = false,
}: DateRangeFieldProps) {
  const [open, setOpen] = useState(false);
  const anchor = start ? new Date(`${start}T00:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(anchor.getFullYear());
  const [viewMonth, setViewMonth] = useState(anchor.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocMouseDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const today = new Date();
  const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate());

  const display = start ? (end ? `${formatDay(start)} – ${formatDayYear(end)}` : formatDay(start)) : "";

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(viewYear, viewMonth, 1));

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const handleDay = (day: number) => {
    const iso = toIso(viewYear, viewMonth, day);
    if (!start || (start && end)) {
      onChange(iso, "");
      return;
    }
    if (iso >= start) {
      onChange(start, iso);
      setOpen(false);
    } else {
      onChange(iso, "");
    }
  };

  const dayState = (iso: string) => {
    if (iso === start || iso === end) return "edge";
    if (start && end && iso > start && iso < end) return "between";
    return "none";
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!open) {
            const next = start ? new Date(`${start}T00:00:00`) : new Date();
            setViewYear(next.getFullYear());
            setViewMonth(next.getMonth());
          }
          setOpen((prev) => !prev);
        }}
        className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-sm font-medium text-left flex justify-between items-center gap-2 focus:outline-none transition-colors ${
          invalid
            ? "border-red-400 focus:ring-2 focus:ring-red-400/30 focus:border-red-400"
            : "border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-[var(--sys-primary)]/30 focus:border-[var(--sys-primary)]"
        }`}
      >
        <span className={`truncate ${display ? "text-slate-800 dark:text-white" : "text-slate-400"}`}>
          {display || placeholder}
        </span>
        <svg
          className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <p className="text-sm font-bold text-slate-800 dark:text-white">{monthLabel}</p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAY_LABELS.map((label) => (
              <span
                key={label}
                className="text-[10px] font-bold text-slate-400 text-center py-1"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, index) =>
              day === null ? (
                <span key={`empty-${index}`} />
              ) : (() => {
                const iso = toIso(viewYear, viewMonth, day);
                const state = dayState(iso);
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => handleDay(day)}
                    className={`h-8 w-full rounded-lg text-xs font-semibold transition-colors ${
                      state === "edge"
                        ? "bg-[var(--sys-primary)] text-white shadow-sm"
                        : state === "between"
                          ? "bg-[var(--sys-primary)]/15 text-[var(--sys-primary-text)]"
                          : `text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 ${
                              iso === todayIso ? "ring-1 ring-inset ring-[var(--sys-primary)]/50" : ""
                            }`
                    }`}
                  >
                    {day}
                  </button>
                );
              })(),
            )}
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => onChange("", "")}
              className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Clear
            </button>
            <p className="text-[10px] font-medium text-slate-400">Pick a start day, then an end day</p>
          </div>
        </div>
      )}
    </div>
  );
}
