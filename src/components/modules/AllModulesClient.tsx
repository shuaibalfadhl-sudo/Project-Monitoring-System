"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import DocumentHistorySection from "@/components/modules/DocumentHistorySection";
import StatusHistorySection from "@/components/modules/StatusHistorySection";
import EditModuleModal from "@/components/modules/EditModuleModal";
import ModuleClassChips from "@/components/modules/ModuleClassChips";
import OnHoldReasonModal from "@/components/modules/OnHoldReasonModal";
import OnHoldReasonNote from "@/components/modules/OnHoldReasonNote";
import QaResultCard from "@/components/modules/QaResultCard";
import ExcelJS from "exceljs";
import SearchableSelect from "@/components/ui/SearchableSelect";
import {
  STATUS_GROUPS,
  statusesIn,
  statusLabel,
  statusBadgeClass,
  statusGanttClass,
  statusExcelColors,
} from "@/lib/moduleStatuses";
import {
  platformLabel,
  workstreamLabel,
  platformExcelColors,
  workstreamExcelColors,
} from "@/lib/moduleClassifications";

export default function AllModulesClient({
  initialModules,
  role,
}: {
  initialModules: any[];
  role: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "gantt">("table");

  const [selectedModule, setSelectedModule] = useState<any | null>(null);
  const [holdTarget, setHoldTarget] = useState<{ id: string; name: string } | null>(null);
  const [isHolding, setIsHolding] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const router = useRouter();
  const supabase = createClient();

  const applyQuickStatus = async (moduleId: string, newStatus: string, remarks?: string) => {
    try {
      const { error: updateError } = await supabase
        .from("project_modules")
        .update(
          remarks !== undefined
            ? { status: newStatus, on_hold_remarks: remarks }
            : { status: newStatus }
        )
        .eq("id", moduleId);

      if (updateError) throw updateError;
      router.refresh();
      toast.success("Status updated");
    } catch (err: any) {
      toast.error(err.message || "An error occurred while updating the status.");
    }
  };

  // On hold is the one status that carries a mandatory reason, so it is collected in a modal.
  const handleQuickStatusChange = (moduleId: string, newStatus: string, moduleName: string) => {
    if (newStatus === "on_hold") {
      setHoldTarget({ id: moduleId, name: moduleName });
      return;
    }
    void applyQuickStatus(moduleId, newStatus);
  };

  const confirmOnHold = async (reason: string) => {
    if (!holdTarget) return;
    setIsHolding(true);
    await applyQuickStatus(holdTarget.id, "on_hold", reason);
    setIsHolding(false);
    setHoldTarget(null);
  };

  const generatePagination = (currentPage: number, totalPages: number) => {
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, "...", totalPages];
    if (currentPage >= totalPages - 2)
      return [
        1,
        "...",
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  };

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    initialModules.forEach((m: any) => {
      if (m.project?.id) map.set(m.project.id, m.project.name || "Unnamed Project");
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [initialModules]);

  const filteredModules = initialModules.filter((m: any) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.assigned_developer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || m.priority === priorityFilter;
    const matchesProject =
      projectFilter === "all" || m.project?.id === projectFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesProject;
  });

  const totalPages = Math.ceil(filteredModules.length / itemsPerPage);
  const paginatedModules = filteredModules.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const getStatusColor = (status?: string) => statusBadgeClass(status);

  const formatStatus = (status?: string) => statusLabel(status);

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800/50";
      case "high":
        return "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800/50";
      case "medium":
        return "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50";
      case "low":
        return "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800/50";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  const getGanttBarColor = (status?: string) => statusGanttClass(status);

  const ganttDomain = (() => {
    const rows = filteredModules;
    if (rows.length === 0) return null;
    let start = Infinity;
    let end = -Infinity;
    rows.forEach((m) => {
      const s = new Date(m.development_date || m.created_at).getTime();
      if (!Number.isNaN(s)) start = Math.min(start, s);
      const e = m.deadline ? new Date(m.deadline).getTime() : s;
      if (!Number.isNaN(e)) end = Math.max(end, e);
    });
    const today = Date.now();
    start = Math.min(start, today);
    end = Math.max(end, today);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      end = start + 86400000;
    }
    const total = end - start;
    const pos = (ms: number) => Math.min(100, Math.max(0, ((ms - start) / total) * 100));
    return { start, end, total, pos };
  })();

  const ganttTicks = ganttDomain
    ? Array.from({ length: 5 }, (_, i) => {
        const ms = ganttDomain.start + (ganttDomain.total * i) / 4;
        return {
          pct: (i / 4) * 100,
          label: new Date(ms).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "2-digit",
          }),
        };
      })
    : [];

  const fmtDate = (v?: string | null) =>
    v
      ? new Date(v).toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        })
      : "";

  const hexToArgb = (input: string, fallback: string): string => {
    const s = input.trim();
    if (s.startsWith("#")) {
      let h = s.slice(1);
      if (h.length === 3) h = h.split("").map((c) => c + c).join("");
      if (/^[0-9a-fA-F]{6}$/.test(h)) return `FF${h.toUpperCase()}`;
      return fallback;
    }
    const m = s.match(/rgba?\(([^)]+)\)/i);
    if (m) {
      const [r, g, b] = m[1].split(",").map((n) => parseInt(n.trim(), 10));
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        const to = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
        return `FF${to(r)}${to(g)}${to(b)}`;
      }
    }
    return fallback;
  };

  const priorityColors: Record<string, { fill: string; font: string }> = {
    critical: { fill: "FFFEE2E2", font: "FFB91C1C" },
    high: { fill: "FFFFEDD5", font: "FFC2410C" },
    medium: { fill: "FFFEF9C3", font: "FFA16207" },
    low: { fill: "FFDCFCE7", font: "FF15803D" },
  };

  const handleExportExcel = async () => {
    type Cell = {
      header: string;
      width: number;
      value: (m: any) => string;
      badge?: (m: any) => { fill: string; font: string } | null;
    };

    const statusBadge = (m: any) => statusExcelColors(m.status);

    let cols: Cell[];
    let fileName: string;
    let sheetName: string;

    if (viewMode === "gantt") {
      cols = [
        { header: "Module Name", width: 34, value: (m) => m.name },
        { header: "Project", width: 26, value: (m) => m.project?.name || "" },
        { header: "Developer", width: 22, value: (m) => m.assigned_developer_name || "Unassigned" },
        { header: "Status", width: 18, value: (m) => formatStatus(m.status), badge: statusBadge },
        { header: "Start (Development Date)", width: 22, value: (m) => fmtDate(m.development_date || m.created_at) },
        { header: "End (Deadline)", width: 18, value: (m) => fmtDate(m.deadline) },
        {
          header: "Duration (Days)",
          width: 16,
          value: (m) => {
            const startMs = new Date(m.development_date || m.created_at).getTime();
            const endMs = m.deadline ? new Date(m.deadline).getTime() : null;
            return endMs != null && Number.isFinite(startMs)
              ? String(Math.max(0, Math.ceil((endMs - startMs) / 86400000)))
              : "";
          },
        },
        {
          header: "Overdue",
          width: 12,
          value: (m) => {
            const endMs = m.deadline ? new Date(m.deadline).getTime() : null;
            return endMs != null && endMs < Date.now() && m.status !== "deployed" ? "Yes" : "No";
          },
          badge: (m) => {
            const endMs = m.deadline ? new Date(m.deadline).getTime() : null;
            const overdue = endMs != null && endMs < Date.now() && m.status !== "deployed";
            return overdue ? { fill: "FFFEE2E2", font: "FFB91C1C" } : null;
          },
        },
      ];
      fileName = "all-modules-gantt.xlsx";
      sheetName = "Gantt";
    } else {
      cols = [
        { header: "Module Name", width: 34, value: (m) => m.name },
        { header: "Project", width: 26, value: (m) => m.project?.name || "" },
        {
          header: "Platform",
          width: 14,
          value: (m) => platformLabel(m.platform),
          badge: (m) => platformExcelColors(m.platform),
        },
        {
          header: "Workstream",
          width: 16,
          value: (m) => workstreamLabel(m.workstream),
          badge: (m) => workstreamExcelColors(m.workstream),
        },
        {
          header: "Priority",
          width: 14,
          value: (m) => m.priority,
          badge: (m) => priorityColors[m.priority] ?? null,
        },
        { header: "Developer", width: 22, value: (m) => m.assigned_developer_name || "Unassigned" },
        { header: "Status", width: 18, value: (m) => formatStatus(m.status), badge: statusBadge },
        { header: "Development Date", width: 20, value: (m) => fmtDate(m.development_date) },
        { header: "Deadline", width: 16, value: (m) => fmtDate(m.deadline) },
        { header: "Revision Count", width: 16, value: (m) => String(m.revision_count ?? 0) },
        { header: "Website Link", width: 30, value: (m) => m.website_link || "" },
        { header: "Description", width: 50, value: (m) => m.description || "" },
      ];
      fileName = "all-modules.xlsx";
      sheetName = "Modules";
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = "Project Monitoring System";
    const ws = wb.addWorksheet(sheetName, {
      views: [{ state: "frozen", ySplit: 2 }],
    });

    const brandArgb = hexToArgb(
      getComputedStyle(document.documentElement).getPropertyValue("--sys-primary") || "",
      "FF1A2333",
    );
    ws.mergeCells(1, 1, 1, cols.length);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = "All Modules";
    titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: brandArgb } };
    titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(1).height = 28;

    const headerRow = ws.getRow(2);
    cols.forEach((c, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = c.header;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: brandArgb } };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFFFFFFF" } },
        left: { style: "thin", color: { argb: "FFFFFFFF" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      };
    });
    headerRow.height = 22;
    ws.columns = cols.map((c) => ({ width: c.width }));

    filteredModules.forEach((m) => {
      const row = ws.addRow(cols.map((c) => c.value(m)));
      cols.forEach((c, i) => {
        const cell = row.getCell(i + 1);
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: c.width >= 40 };
        cell.border = {
          bottom: { style: "hair", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFF3F4F6" } },
          right: { style: "thin", color: { argb: "FFF3F4F6" } },
        };
        const badge = c.badge?.(m);
        if (badge) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: badge.fill } };
          cell.font = { bold: true, color: { argb: badge.font } };
        }
      });
      row.height = 20;
    });

    ws.autoFilter = {
      from: { row: 2, column: 1 },
      to: { row: 2, column: cols.length },
    };

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Module count — reflects the current filters */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 p-5 rounded-2xl shadow-sm inline-block min-w-48">
        <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-wider mb-2">
          Total Modules
        </h3>
        <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">
          {filteredModules.length}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {/* View toggle */}
        <div className="inline-flex rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1">
          <button
            onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors ${
              viewMode === "table"
                ? "bg-[var(--sys-primary)] text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            Table
          </button>
          <button
            onClick={() => {
              setViewMode("gantt");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors ${
              viewMode === "gantt"
                ? "bg-[var(--sys-primary)] text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            Gantt
          </button>
        </div>
        {/* Refresh Button */}
        <button
          onClick={() => {
            setIsRefreshing(true);
            router.refresh();
            setTimeout(() => setIsRefreshing(false), 1000);
          }}
          disabled={isRefreshing}
          title="Refresh table"
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
        >
          <svg
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            placeholder="Search modules, projects, developers..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <SearchableSelect
          className="w-full sm:w-44"
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setCurrentPage(1);
          }}
          options={statusesIn(STATUS_GROUPS.full).map((s) => ({ value: s.value, label: s.label }))}
          allValue="all"
          allLabel="All Statuses"
          placeholder="All Statuses"
          searchPlaceholder="Search statuses..."
        />

        <select
          className="w-full sm:w-32 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <SearchableSelect
          className="w-full sm:w-52"
          value={projectFilter}
          onChange={(v) => {
            setProjectFilter(v);
            setCurrentPage(1);
          }}
          options={projectOptions}
          allValue="all"
          allLabel="All Projects"
          placeholder="All Projects"
          searchPlaceholder="Search projects..."
        />

        <button
          onClick={handleExportExcel}
          disabled={filteredModules.length === 0}
          title={`Download the current ${viewMode === "gantt" ? "Gantt" : "table"} data as Excel`}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3"
            />
          </svg>
          Export
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-transparent dark:border-slate-700 overflow-hidden">
        {viewMode === "gantt" ? (
          ganttDomain ? (
            <div className="overflow-x-auto p-8">
              <div className="min-w-[640px]">
                <div className="flex items-center mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">
                  <div className="w-56 shrink-0 px-1 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                    Module
                  </div>
                  <div className="relative flex-1 h-5">
                    {ganttTicks.map((t, i) => (
                      <span
                        key={i}
                        className="absolute -translate-x-1/2 text-[10px] font-bold text-gray-400 dark:text-slate-500 whitespace-nowrap"
                        style={{ left: `${t.pct}%` }}
                      >
                        {t.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredModules.map((module: any) => {
                    const s = new Date(module.development_date || module.created_at).getTime();
                    const e = module.deadline ? new Date(module.deadline).getTime() : s;
                    const left = ganttDomain.pos(s);
                    const width = Math.max(ganttDomain.pos(e) - left, 0.8);
                    const overdue =
                      !!module.deadline && e < Date.now() && module.status !== "deployed";
                    return (
                      <div
                        key={module.id}
                        onClick={() => setSelectedModule(module)}
                        className="flex items-center cursor-pointer group"
                      >
                        <div className="w-56 shrink-0 px-1 pr-3">
                          <span className="block truncate text-sm font-bold text-[var(--sys-primary)]">
                            {module.name}
                          </span>
                          <span className="block truncate text-[11px] text-gray-400 dark:text-slate-500">
                            {module.project?.name} · {formatStatus(module.status)}
                          </span>
                        </div>
                        <div className="relative flex-1 h-9 rounded-lg bg-gray-50 dark:bg-slate-900/60">
                          {ganttTicks.map((t, i) => (
                            <span
                              key={i}
                              className="absolute top-0 bottom-0 w-px bg-gray-100 dark:bg-slate-700/60"
                              style={{ left: `${t.pct}%` }}
                            />
                          ))}
                          <span
                            className="absolute top-0 bottom-0 w-px bg-gray-400/70 dark:bg-slate-500"
                            style={{ left: `${ganttDomain.pos(Date.now())}%` }}
                            title="Today"
                          />
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 h-5 rounded-full ${getGanttBarColor(
                              module.status,
                            )} shadow-sm transition-all group-hover:h-6 ${
                              overdue ? "ring-2 ring-red-400" : ""
                            }`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={`${module.name} · ${formatStatus(module.status)}${
                              module.deadline
                                ? ` · due ${new Date(module.deadline).toLocaleDateString()}`
                                : " · no deadline"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-4 text-xs text-gray-400 dark:text-slate-500 font-medium">
                  Bars span development date to deadline · vertical line is today · red ring marks overdue.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-slate-400 font-medium">
                No timeline data.
              </p>
            </div>
          )
        ) : (
          <>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Module Name
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Developer
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                {(role === 'project_manager' || role === 'super_admin') && (
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {paginatedModules.map((mod: any) => (
                <tr
                  key={mod.id}
                  onClick={() => setSelectedModule(mod)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full border text-xs font-bold capitalize ${getPriorityColor(mod.priority)}`}
                    >
                      {mod.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {mod.name}
                    </span>
                    <ModuleClassChips platform={mod.platform} workstream={mod.workstream} />
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                      {mod.project.name}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mt-1">
                      By: {mod.project.creator_name || "Unknown"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {mod.assigned_developer_name ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0">
                          {mod.assigned_developer_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {mod.assigned_developer_name}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center text-xs font-medium text-slate-400 dark:text-slate-500 italic">
                        No developer assigned
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {role === 'super_admin' ||
                    (role === 'project_manager' &&
                      !(STATUS_GROUPS.quickSuperExtra as readonly string[]).includes(mod.status || '')) ? (
                      <div onClick={(e) => e.stopPropagation()} className="relative inline-block group">
                        <select
                          className={`pl-2.5 pr-7 py-1 rounded-lg text-xs font-bold border-2 focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] cursor-pointer ${getStatusColor(mod.status)} border-transparent hover:border-gray-300 dark:hover:border-slate-600 transition-colors appearance-none relative z-0`}
                          value={mod.status || 'pending'}
                          onChange={(e) => handleQuickStatusChange(mod.id, e.target.value, mod.name)}
                        >
                          {statusesIn(
                            role === 'super_admin'
                              ? [...STATUS_GROUPS.quickBase, ...STATUS_GROUPS.quickSuperExtra]
                              : STATUS_GROUPS.quickBase
                          ).map((s) => (
                            <option key={s.value} value={s.value} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white">
                              {s.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-50 group-hover:opacity-100 transition-opacity z-10">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border-2 border-transparent ${getStatusColor(mod.status)}`}
                      >
                        {formatStatus(mod.status)}
                      </span>
                    )}
                  </td>
                  {(role === 'project_manager' || role === 'super_admin') && (
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end">
                        {/* Edit Button - not available for deployment status */}
                        {mod.status !== 'deployment' && (
                          <EditModuleModal
                            module={mod}
                            isManager={role === 'project_manager'}
                            isSuperAdmin={role === 'super_admin'}
                          />
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredModules.length === 0 && (
                <tr>
                  <td
                    colSpan={role === 'project_manager' || role === 'super_admin' ? 6 : 5}
                    className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                  >
                    {initialModules.length === 0
                      ? "You have no modules."
                      : "No modules match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 dark:border-slate-700 px-6 py-4 gap-4 bg-white dark:bg-slate-800">
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                Showing{" "}
                <span className="font-bold">
                  {(currentPage - 1) * itemsPerPage +
                    (paginatedModules.length > 0 ? 1 : 0)}
                </span>{" "}
                to{" "}
                <span className="font-bold">
                  {Math.min(currentPage * itemsPerPage, filteredModules.length)}
                </span>{" "}
                of <span className="font-bold">{filteredModules.length}</span>{" "}
                modules
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 font-medium">Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium bg-white dark:bg-slate-800 dark:text-white px-2 py-1 cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                <div className="flex items-center gap-1">
                  {generatePagination(currentPage, totalPages).map((page, i) =>
                    page === "..." ? (
                      <span
                        key={`ellipsis-${i}`}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 font-bold tracking-widest"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={`page-${page}`}
                        onClick={() => setCurrentPage(page as number)}
                        className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold transition-all ${currentPage === page ? "bg-[var(--sys-primary)] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"}`}
                      >
                        {page}
                      </button>
                    ),
                  )}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>

      {selectedModule && mounted && createPortal(
        <div
          className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setSelectedModule(null)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-xl font-extrabold text-[var(--sys-primary)]">
                Module Details
              </h2>
              <button
                onClick={() => setSelectedModule(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Module Name
                </h3>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedModule.name}
                </p>
                <ModuleClassChips
                  platform={selectedModule.platform}
                  workstream={selectedModule.workstream}
                />
                <OnHoldReasonNote remarks={selectedModule.on_hold_remarks} />
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Project
                </h3>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {selectedModule.project.name}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Description
                </h3>
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium text-sm">
                  {selectedModule.description || (
                    <span className="italic text-slate-400">
                      No description provided.
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Priority
                  </h3>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-bold capitalize ${getPriorityColor(selectedModule.priority)}`}
                  >
                    {selectedModule.priority}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Status
                  </h3>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(selectedModule.status)}`}
                  >
                    {formatStatus(selectedModule.status)}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Assigned Developer
                  </h3>
                  {selectedModule.assigned_developer_name ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-bold border border-blue-100 dark:border-blue-800">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      {selectedModule.assigned_developer_name}
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-sm font-semibold text-slate-400 dark:text-slate-500 italic">
                      No developer assigned
                    </span>
                  )}
                </div>
              </div>

              {/* Document and Testing Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Module Document
                  </h3>
                  {selectedModule.module_document_url ? (
                    <a
                      href={selectedModule.module_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View Document ↗
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-slate-400 italic">
                      No attached document by PM
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Website Link (Testing)
                  </h3>
                  {selectedModule.website_link ? (
                    <a
                      href={selectedModule.website_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-bold text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Open Link ↗
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-slate-400 italic">
                      No website link provided
                    </p>
                  )}
                </div>
              </div>

              {/* QA Result: document + remarks */}
              <QaResultCard
                documentUrl={selectedModule.qa_result_document_url}
                remarks={selectedModule.qa_remarks}
              />

              {/* Workflow Acknowledgements - always visible */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                  Workflow Acknowledgements
                </h3>
                <div className="space-y-3">
                  {/* System Auditor QA Acknowledgement */}
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                      System Auditor QA
                    </span>
                    {selectedModule.qa_acknowledged_at ? (
                      <span className="text-sm font-semibold text-[var(--sys-primary)]">
                        {selectedModule.qa_acknowledged_by_name ||
                          "Unknown Auditor"}{" "}
                        —{" "}
                        {new Intl.DateTimeFormat("en-US", {
                          timeZone: "Asia/Manila",
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        }).format(new Date(selectedModule.qa_acknowledged_at))}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 inline-block"></span>
                        Not yet acknowledged
                      </span>
                    )}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-700/50"></div>

                  {/* Project Manager Rework Acknowledgement */}
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                      Project Manager QA Result
                    </span>
                    {selectedModule.qa_result_acknowledged_at ? (
                      <span className="text-sm font-semibold text-[var(--sys-primary)]">
                        {selectedModule.qa_result_acknowledged_by_name ||
                          "Unknown PM"}{" "}
                        —{" "}
                        {new Intl.DateTimeFormat("en-US", {
                          timeZone: "Asia/Manila",
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        }).format(
                          new Date(selectedModule.qa_result_acknowledged_at),
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 inline-block"></span>
                        Not yet acknowledged
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Document History */}
              <DocumentHistorySection moduleId={selectedModule.id} />
              <StatusHistorySection moduleId={selectedModule.id} />
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setSelectedModule(null)}
                className="px-6 py-2.5 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <OnHoldReasonModal
        isOpen={!!holdTarget}
        moduleName={holdTarget?.name}
        isLoading={isHolding}
        onClose={() => setHoldTarget(null)}
        onConfirm={confirmOnHold}
      />
    </div>
  );
}
