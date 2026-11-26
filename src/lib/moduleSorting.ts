export type ModuleSortOrder =
  | "default"
  | "newest"
  | "oldest"
  | "priority_high"
  | "priority_low";

interface SortableModule {
  priority?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function sortModuleList<T extends SortableModule>(
  modules: T[],
  sortOrder: ModuleSortOrder,
): T[] {
  if (sortOrder === "default") return modules;

  return [...modules].sort((a, b) => {
    if (sortOrder === "priority_high" || sortOrder === "priority_low") {
      const diff =
        (PRIORITY_RANK[a.priority ?? ""] ?? 4) -
        (PRIORITY_RANK[b.priority ?? ""] ?? 4);
      return sortOrder === "priority_high" ? diff : -diff;
    }

    const aTime = Date.parse(a.updated_at ?? a.created_at ?? "") || 0;
    const bTime = Date.parse(b.updated_at ?? b.created_at ?? "") || 0;
    return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
  });
}
