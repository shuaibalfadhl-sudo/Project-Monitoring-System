interface ProjectOverviewRowProps {
  projects: {
    id: string;
    name: string;
    status?: string | null;
    project_modules?: { id: string }[] | null;
  }[];
}

const TOP_PROJECTS_LIMIT = 7;

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  planning: { label: "Planning", color: "#94A3B8" },
  active: { label: "Active", color: "#3B82F6" },
  in_progress: { label: "In Progress", color: "#3B82F6" },
  on_hold: { label: "On Hold", color: "#F59E0B" },
  completed: { label: "Completed", color: "#22C55E" },
  qa_approved: { label: "QA Approved", color: "#10B981" },
  for_qa: { label: "For QA", color: "#F97316" },
};

const FALLBACK_COLORS = ["#6366F1", "#EC4899", "#14B8A6", "#8B5CF6", "#0EA5E9"];

const BAR_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EC4899", "#06B6D4", "#8B5CF6", "#F97316"];

interface DonutSlice {
  id: string;
  value: number;
  color: string;
}

function StatusDonut({ data, total }: { data: DonutSlice[]; total: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        strokeWidth="14"
        stroke="currentColor"
        className="text-gray-100 dark:text-slate-800"
      />
      {data.map((slice, index) => {
        const length = (slice.value / total) * circumference;
        const start = data
          .slice(0, index)
          .reduce((sum, prev) => sum + (prev.value / total) * circumference, 0);
        return (
          <circle
            key={slice.id}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={slice.color}
            strokeWidth="14"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-start}
          />
        );
      })}
      <circle
        cx="50"
        cy="50"
        r={radius + 7}
        fill="none"
        strokeWidth="1"
        stroke="currentColor"
        className="text-gray-100 dark:text-slate-800"
      />
    </svg>
  );
}

export default function ProjectOverviewRow({ projects }: ProjectOverviewRowProps) {
  const totalProjects = projects.length;
  const totalModules = projects.reduce(
    (sum, project) => sum + (project.project_modules?.length ?? 0),
    0,
  );

  const topProjects = [...projects]
    .map((project) => ({
      id: project.id,
      name: project.name,
      count: project.project_modules?.length ?? 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, TOP_PROJECTS_LIMIT);
  const maxCount = Math.max(1, topProjects[0]?.count ?? 0);

  const statusCounts = new Map<string, number>();
  for (const project of projects) {
    const value = project.status ?? "planning";
    statusCounts.set(value, (statusCounts.get(value) ?? 0) + 1);
  }
  const statuses = Array.from(statusCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([value, count], index) => {
      const known = STATUS_STYLES[value];
      return {
        value,
        count,
        label:
          known?.label ??
          value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
        color: known?.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
      };
    });
  const pieData = statuses.map((status) => ({
    id: status.value,
    value: status.count,
    color: status.color,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
          Modules by Project
        </h3>
        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 mt-1 mb-6">
          Top {TOP_PROJECTS_LIMIT} projects by module count · share of all {totalModules} modules
        </p>

        {topProjects.length === 0 ? (
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400 italic py-6 text-center bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
            No projects to show yet.
          </p>
        ) : (
          <div className="space-y-3.5">
            {topProjects.map((project, index) => (
              <div
                key={project.id}
                className="grid grid-cols-[minmax(0,7.5rem)_1fr_4.75rem] items-center gap-3"
              >
                <span
                  className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate"
                  title={project.name}
                >
                  {project.name}
                </span>
                <div className="h-6 rounded-md bg-indigo-50 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-md"
                    style={{
                      width: `${(project.count / maxCount) * 100}%`,
                      backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                    }}
                  />
                </div>
                {project.count > 0 ? (
                  <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 text-right whitespace-nowrap">
                    {project.count} · {((project.count / totalModules) * 100).toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 italic text-right whitespace-nowrap">
                    No modules
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col">
        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
          Total Projects by Status
        </h3>
        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 mt-1 mb-6">
          Distribution of all {totalProjects} projects
        </p>

        {totalProjects === 0 ? (
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400 italic py-6 text-center bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
            No projects to show yet.
          </p>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <div className="relative w-52 h-52">
              <StatusDonut data={pieData} total={totalProjects} />
              <div className="absolute inset-[26%] flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-[var(--sys-primary-text)]">
                  {totalProjects}
                </span>
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-1 text-center">
                  Total Projects
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 w-full">
              {statuses.map((status) => (
                <div key={status.value} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                      {status.label}
                    </span>
                  </span>
                  <span className="text-xs font-bold text-[var(--sys-primary-text)] whitespace-nowrap">
                    {status.count} · {((status.count / totalProjects) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
