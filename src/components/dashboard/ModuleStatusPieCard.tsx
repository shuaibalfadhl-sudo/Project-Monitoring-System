"use client";

import { useState } from "react";
import { MODULE_STATUSES, statusMeta } from "@/lib/moduleStatuses";

interface ProjectCardData {
  id: string;
  name: string;
  status?: string | null;
  target_date?: string | null;
  project_members?: { user_id: string }[] | null;
  project_modules?: { id: string; status?: string | null }[] | null;
}

interface ModuleStatusPieCardProps {
  projects: ProjectCardData[];
}

interface Slice {
  value: string;
  label: string;
  color: string;
  count: number;
}

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const STROKE = 14;
const ACTIVE_STROKE = 26;

const PROJECT_STATUS_STYLES: Record<string, { label: string; badge: string }> = {
  planning: {
    label: "Planning",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
  active: {
    label: "Active",
    badge: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300",
  },
  in_progress: {
    label: "In Progress",
    badge: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300",
  },
  on_hold: {
    label: "On Hold",
    badge: "bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
  },
  completed: {
    label: "Completed",
    badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
};

function projectStatusMeta(value?: string | null) {
  const key = value ?? "planning";
  const known = PROJECT_STATUS_STYLES[key];
  if (known) return known;
  return {
    label: key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
}

function formatPercent(part: number, whole: number) {
  if (whole === 0) return "0%";
  const pct = (part / whole) * 100;
  return `${pct >= 10 ? Math.round(pct) : pct.toFixed(1)}%`;
}

function buildSlices(modules: { id: string; status?: string | null }[]): Slice[] {
  const counts = new Map<string, number>();
  for (const mod of modules) {
    const value = statusMeta(mod.status).value;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return MODULE_STATUSES.map((meta) => ({
    value: meta.value,
    label: meta.label,
    color: meta.chart,
    count: counts.get(meta.value) ?? 0,
  })).filter((slice) => slice.count > 0);
}

function ProjectStatusRing({
  slices,
  total,
  active,
}: {
  slices: Slice[];
  total: number;
  active: Slice | null;
}) {
  return (
    <div className="relative w-44 h-44">
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          stroke="currentColor"
          className="text-gray-100 dark:text-slate-800"
        />
        {slices.map((slice, index) => {
          const length = (slice.count / total) * CIRCUMFERENCE;
          const start = slices
            .slice(0, index)
            .reduce((sum, prev) => sum + (prev.count / total) * CIRCUMFERENCE, 0);
          const isActive = active?.value === slice.value;
          const dimmed = active !== null && !isActive;
          return (
            <g key={slice.value}>
              <circle
                cx="50"
                cy="50"
                r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth={STROKE}
                strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                strokeDashoffset={-start}
                className={`transition-opacity duration-300 ${dimmed ? "opacity-25" : "opacity-100"}`}
              />
              <circle
                cx="50"
                cy="50"
                r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth={ACTIVE_STROKE}
                strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                strokeDashoffset={-start}
                className={`transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-0"}`}
              />
            </g>
          );
        })}
        <circle
          cx="50"
          cy="50"
          r={RADIUS + 7}
          fill="none"
          strokeWidth="1"
          stroke="currentColor"
          className="text-gray-100 dark:text-slate-800"
        />
      </svg>

      <div className="absolute inset-[23%] flex flex-col items-center justify-center pointer-events-none">
        <span className="text-3xl font-black text-[var(--sys-primary-text)]">
          {active ? formatPercent(active.count, total) : total}
        </span>
        <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-1 text-center leading-tight">
          {active ? active.label : "Modules"}
        </span>
      </div>
    </div>
  );
}

export default function ModuleStatusPieCard({ projects }: ModuleStatusPieCardProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const globalCounts = new Map<string, number>();
  for (const project of projects) {
    for (const mod of project.project_modules ?? []) {
      const value = statusMeta(mod.status).value;
      globalCounts.set(value, (globalCounts.get(value) ?? 0) + 1);
    }
  }

  return (
    <section>
      <h3 className="text-sm font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
        Modules by Status per Project
      </h3>
      <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 mt-1">
        Status distribution of each project · select a status to enlarge its slice
      </p>

      <div className="flex flex-wrap items-center gap-2 mt-4 mb-5">
        {MODULE_STATUSES.map((meta) => {
          const count = globalCounts.get(meta.value) ?? 0;
          const isActive = selectedStatus === meta.value;
          return (
            <button
              type="button"
              key={meta.value}
              onClick={() => setSelectedStatus(isActive ? null : meta.value)}
              disabled={count === 0}
              aria-pressed={isActive}
              title={count === 0 ? "No modules with this status" : `${meta.label}: ${count}`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition-all duration-200 ${
                isActive
                  ? "text-white shadow-sm border-transparent"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
              } ${count === 0 ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              style={isActive ? { backgroundColor: meta.chart } : undefined}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: isActive ? "#ffffff" : meta.chart }}
              />
              {meta.label}
              <span className={isActive ? "text-white/80" : "text-gray-400 dark:text-slate-500"}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {projects.length === 0 ? (
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 italic py-6 text-center bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
          No projects to show yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => {
            const modules = project.project_modules ?? [];
            const total = modules.length;
            const slices = buildSlices(modules);
            const active = selectedStatus
              ? slices.find((slice) => slice.value === selectedStatus) ?? null
              : null;
            const teamCount = new Set(
              (project.project_members ?? []).map((member) => member.user_id),
            ).size;
            const status = projectStatusMeta(project.status);
            const dueDate = project.target_date ? project.target_date.slice(0, 10) : null;

            return (
              <div
                key={project.id}
                className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4
                      className="text-base font-extrabold text-slate-900 dark:text-white truncate"
                      title={project.name}
                    >
                      {project.name}
                    </h4>
                    <span
                      className={`mt-2 inline-flex rounded-md px-2.5 py-1 text-[11px] font-bold ${status.badge}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                      Due Date
                    </span>
                    <span className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-gray-50 dark:bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-3 w-3"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {dueDate ?? "—"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col items-center justify-center py-7">
                  {total === 0 ? (
                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400 italic py-6 text-center">
                      No modules yet.
                    </p>
                  ) : (
                    <ProjectStatusRing slices={slices} total={total} active={active} />
                  )}
                  <p className="mt-5 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                    Module Status
                  </p>
                </div>

                <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-slate-800 border-t border-gray-100 dark:border-slate-800 pt-5">
                  <div className="text-center">
                    <p className="text-xl font-black text-slate-900 dark:text-white">{total}</p>
                    <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                      Modules
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-slate-900 dark:text-white">{teamCount}</p>
                    <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                      Team
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
