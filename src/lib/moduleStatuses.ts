// Single source of truth for module statuses.
// To add a new status: add one entry to MODULE_STATUSES (with display metadata)
// and include its value in the relevant STATUS_GROUPS below. Every filter, badge,
// Gantt bar, Excel export and Add/Edit/quick-status dropdown reads from here.

export interface StatusMeta {
  value: string;
  label: string;
  badge: string; // full Tailwind classes (light + dark)
  gantt: string; // Gantt bar background class
  excel: { fill: string; font: string }; // ARGB colors for Excel export
}

export const MODULE_STATUSES: StatusMeta[] = [
  {
    value: "pending",
    label: "Pending",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    gantt: "bg-slate-400",
    excel: { fill: "FFF3F4F6", font: "FF374151" },
  },
  {
    value: "for data gathering",
    label: "For Data Gathering",
    badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    gantt: "bg-teal-500",
    excel: { fill: "FFCCFBF1", font: "FF0F766E" },
  },
  {
    value: "development",
    label: "Development",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    gantt: "bg-blue-500",
    excel: { fill: "FFDBEAFE", font: "FF1D4ED8" },
  },
  {
    value: "developing",
    label: "Developing",
    badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    gantt: "bg-cyan-500",
    excel: { fill: "FFCFFAFE", font: "FF0E7490" },
  },
  {
    value: "pm_review",
    label: "PM Review",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    gantt: "bg-purple-500",
    excel: { fill: "FFEDE9FE", font: "FF6D28D9" },
  },
  {
    value: "for_qa",
    label: "For QA",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    gantt: "bg-orange-500",
    excel: { fill: "FFFFEDD5", font: "FFC2410C" },
  },
  {
    value: "auditing",
    label: "Auditing",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    gantt: "bg-amber-500",
    excel: { fill: "FFFEF3C7", font: "FFB45309" },
  },
  {
    value: "for revision",
    label: "For Revision",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    gantt: "bg-rose-500",
    excel: { fill: "FFFFE4E6", font: "FFBE123C" },
  },
  {
    value: "revision",
    label: "Revision",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    gantt: "bg-rose-500",
    excel: { fill: "FFFEE2E2", font: "FFBE123C" },
  },
  {
    value: "revising",
    label: "Revising",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    gantt: "bg-fuchsia-500",
    excel: { fill: "FFEDE9FE", font: "FF6D28D9" },
  },
  {
    value: "on_hold",
    label: "On Hold",
    badge: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700/60 dark:text-zinc-300",
    gantt: "bg-zinc-400",
    excel: { fill: "FFE4E4E7", font: "FF3F3F46" },
  },
  {
    value: "qa_approved",
    label: "QA Approved",
    badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    gantt: "bg-green-500",
    excel: { fill: "FFDCFCE7", font: "FF15803D" },
  },
  {
    value: "deployment",
    label: "Deployment",
    badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    gantt: "bg-indigo-500",
    excel: { fill: "FFE0E7FF", font: "FF4338CA" },
  },
  {
    value: "deployed",
    label: "Deployed",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    gantt: "bg-emerald-500",
    excel: { fill: "FFD1FAE5", font: "FF047857" },
  },
];

// Tolerate legacy snake_case variants (e.g. "for_data_gathering") used in some rows.
const ALIASES: Record<string, string> = {
  for_data_gathering: "for data gathering",
  for_revision: "for revision",
};

const byValue: Record<string, StatusMeta> = Object.fromEntries(
  MODULE_STATUSES.map((s) => [s.value, s]),
);

const FALLBACK: StatusMeta = byValue["pending"];

export function statusMeta(value?: string | null): StatusMeta {
  if (!value) return FALLBACK;
  const normalized = ALIASES[value] ?? value;
  return byValue[normalized] ?? FALLBACK;
}

export const statusLabel = (value?: string | null) => statusMeta(value).label;
export const statusBadgeClass = (value?: string | null) => statusMeta(value).badge;
export const statusGanttClass = (value?: string | null) => statusMeta(value).gantt;
export const statusExcelColors = (value?: string | null) => statusMeta(value).excel;

export const statusesIn = (values: readonly string[]): StatusMeta[] => values.map((v) => statusMeta(v));

// Role/context-scoped option groups. Add a new status to the groups that should offer it.
export const STATUS_GROUPS = {
  // Full list — used by the searchable status filter on the big module lists.
  full: MODULE_STATUSES.map((s) => s.value),

  // Narrow filter sets for the role-specific workspaces.
  devWorkspace: ["development", "developing", "revision", "revising"],
  qaMonitoring: ["for_qa", "auditing"],

  // Add-module modal.
  createManager: ["pending", "for data gathering", "development", "developing", "pm_review", "for_qa", "deployed"],
  createAll: [
    "pending", "for data gathering", "development", "developing", "pm_review", "for_qa",
    "auditing", "for revision", "revision", "revising", "qa_approved", "deployment", "deployed",
  ],

  // Edit-module modal (normal mode). Super/non-manager extras are appended at runtime.
  editBase: ["pending", "for data gathering", "development", "developing", "pm_review", "for_qa", "for revision", "revision", "revising", "on_hold"],
  editExtra: ["auditing", "qa_approved", "deployment", "deployed"],
  // Edit-module modal (QA revision mode).
  editQaRevision: ["revising", "pm_review", "for_qa"],

  // Quick-status dropdown in the module lists. Super-admin extras appended at runtime.
  quickBase: ["pending", "for data gathering", "development", "developing", "pm_review", "for_qa", "for revision", "revision", "revising", "on_hold"],
  quickSuperExtra: ["auditing", "qa_approved", "deployment", "deployed"],
} as const;
