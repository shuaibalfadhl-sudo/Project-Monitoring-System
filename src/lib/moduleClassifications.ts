// Single source of truth for the two module classification dimensions:
// `platform` (delivery target) and `workstream` (business purpose).
// Both are nullable text columns on project_modules guarded by CHECK constraints,
// so an unset module renders no chip rather than falling back to a default value.

export interface ClassMeta {
  value: string;
  label: string;
  badge: string; // full Tailwind classes (light + dark)
  excel: { fill: string; font: string }; // ARGB colors for Excel export
}

export const MODULE_PLATFORMS: ClassMeta[] = [
  {
    value: "web",
    label: "Web",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    excel: { fill: "FFE0F2FE", font: "FF0369A1" },
  },
  {
    value: "mobile",
    label: "Mobile",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    excel: { fill: "FFEDE9FE", font: "FF6D28D9" },
  },
  {
    value: "kiosk",
    label: "Kiosk",
    badge: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300",
    excel: { fill: "FFFAE8FF", font: "FFA21CAF" },
  },
];

export const MODULE_WORKSTREAMS: ClassMeta[] = [
  {
    value: "reports",
    label: "Reports",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    excel: { fill: "FFFEF3C7", font: "FFB45309" },
  },
  {
    value: "operations",
    label: "Operations",
    badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    excel: { fill: "FFCCFBF1", font: "FF0F766E" },
  },
];

const buildIndex = (list: ClassMeta[]) =>
  Object.fromEntries(list.map((c) => [c.value, c])) as Record<string, ClassMeta>;

const platforms = buildIndex(MODULE_PLATFORMS);
const workstreams = buildIndex(MODULE_WORKSTREAMS);

export const platformMeta = (value?: string | null) => (value ? platforms[value] : undefined);
export const workstreamMeta = (value?: string | null) => (value ? workstreams[value] : undefined);

export const platformLabel = (value?: string | null) => platformMeta(value)?.label ?? "";
export const workstreamLabel = (value?: string | null) => workstreamMeta(value)?.label ?? "";

export const platformBadgeClass = (value?: string | null) => platformMeta(value)?.badge ?? "";
export const workstreamBadgeClass = (value?: string | null) => workstreamMeta(value)?.badge ?? "";

export const platformExcelColors = (value?: string | null) => platformMeta(value)?.excel ?? null;
export const workstreamExcelColors = (value?: string | null) => workstreamMeta(value)?.excel ?? null;

export const PLATFORM_OPTIONS = MODULE_PLATFORMS.map((c) => ({ value: c.value, label: c.label }));
export const WORKSTREAM_OPTIONS = MODULE_WORKSTREAMS.map((c) => ({ value: c.value, label: c.label }));
