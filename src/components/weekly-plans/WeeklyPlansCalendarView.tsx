"use client";

import { useMemo, useState } from "react";
import { weeklyPlanModuleLabel } from "@/lib/weeklyPlans";
import {
  weeklyPlanStatusMeta,
  type WeeklyPlan,
} from "@/types/weeklyPlan";

interface WeeklyPlansCalendarViewProps {
  plans: WeeklyPlan[];
  moduleNames: Record<string, string>;
  nameOf: (id: string | null) => string;
  firstWord: (name: string) => string;
  onSelectPlan: (plan: WeeklyPlan) => void;
  onCreateForDate?: (dateString: string) => void;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function WeeklyPlansCalendarView({
  plans,
  moduleNames,
  nameOf,
  firstWord,
  onSelectPlan,
  onCreateForDate,
}: WeeklyPlansCalendarViewProps) {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  const todayStr = useMemo(() => toDateString(today), [today]);

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
      new Date(currentYear, currentMonth, 1),
    );
  }, [currentYear, currentMonth]);

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Build calendar matrix (42 cells: 6 rows of 7 days, Monday start)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    // getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
    const dayOfWeek = firstDayOfMonth.getDay();
    // In Monday-start calendar: Monday is 0, Sunday is 6
    const offset = (dayOfWeek + 6) % 7;

    const startDate = new Date(currentYear, currentMonth, 1 - offset);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      const isCurrentMonth = d.getMonth() === currentMonth;
      const dateStr = toDateString(d);
      cells.push({
        date: d,
        dateStr,
        dayNum: d.getDate(),
        isCurrentMonth,
        isToday: dateStr === todayStr,
      });
    }
    return cells;
  }, [currentYear, currentMonth, todayStr]);

  // Map each calendar day to plans active on that day (where plan.date_weekly <= dateStr <= (plan.date_weekly_end ?? date_weekly + 6))
  const plansByDate = useMemo(() => {
    const map = new Map<string, WeeklyPlan[]>();

    for (const plan of plans) {
      if (!plan.date_weekly) continue;
      const start = plan.date_weekly;
      let end = plan.date_weekly_end;
      if (!end) {
        // Fallback: start + 6 days
        const [y, m, d] = start.split("-").map(Number);
        const endDateObj = new Date(y, m - 1, d + 6);
        end = toDateString(endDateObj);
      }

      for (const cell of calendarCells) {
        if (cell.dateStr >= start && cell.dateStr <= end) {
          const list = map.get(cell.dateStr);
          if (list) list.push(plan);
          else map.set(cell.dateStr, [plan]);
        }
      }
    }

    return map;
  }, [plans, calendarCells]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* Calendar Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {monthLabel}
          </h2>
          <button
            type="button"
            onClick={goToToday}
            className="px-2.5 py-1 text-xs font-bold rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goToPreviousMonth}
            aria-label="Previous month"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={goToNextMonth}
            aria-label="Next month"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-slate-800 text-center text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-50/60 dark:bg-slate-800/40">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2.5">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-gray-100 dark:divide-slate-800/80 min-h-[560px]">
        {calendarCells.map((cell) => {
          const dayPlans = plansByDate.get(cell.dateStr) ?? [];
          return (
            <div
              key={cell.dateStr}
              onClick={() => onCreateForDate && onCreateForDate(cell.dateStr)}
              className={`group relative p-2 min-h-24 sm:min-h-28 flex flex-col transition-colors cursor-pointer ${
                cell.isCurrentMonth
                  ? "bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  : "bg-slate-50/50 dark:bg-slate-900/40 opacity-50 hover:opacity-80"
              }`}
            >
              {/* Day Number and Add Button */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                    cell.isToday
                      ? "bg-[var(--sys-primary)] text-white shadow-sm"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {cell.dayNum}
                </span>

                {onCreateForDate && (
                  <button
                    type="button"
                    title={`Create plan starting ${cell.dateStr}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateForDate(cell.dateStr);
                    }}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs"
                  >
                    +
                  </button>
                )}
              </div>

              {/* Task Pills */}
              <div className="flex-1 space-y-1 overflow-y-auto max-h-24 no-scrollbar">
                {dayPlans.slice(0, 3).map((plan) => {
                  const meta = weeklyPlanStatusMeta(plan.status);
                  const moduleLabel = weeklyPlanModuleLabel(plan.module, moduleNames);
                  const assignee = plan.assigned_personnel
                    ? firstWord(nameOf(plan.assigned_personnel))
                    : null;

                  return (
                    <div
                      key={plan.id}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPlan(plan);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          onSelectPlan(plan);
                        }
                      }}
                      className="px-1.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border-l-2 truncate block cursor-pointer"
                      style={{ borderLeftColor: meta.dot }}
                      title={`${plan.title} (${meta.label}) - ${assignee || "Unassigned"}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-slate-800 dark:text-slate-100 font-bold">
                          {plan.title}
                        </span>
                      </div>
                      {(moduleLabel || assignee) && (
                        <div className="flex items-center gap-1 text-[9px] text-slate-400 truncate">
                          {moduleLabel && <span className="truncate">{moduleLabel}</span>}
                          {moduleLabel && assignee && <span>•</span>}
                          {assignee && <span className="truncate">{assignee}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}

                {dayPlans.length > 3 && (
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 pl-1">
                    +{dayPlans.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
