"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import DocumentHistorySection from "@/components/modules/DocumentHistorySection";
import StatusHistorySection from "@/components/modules/StatusHistorySection";
import ConfirmStatusModal from "@/components/modules/ConfirmStatusModal";

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export default function QaRevisionClient({
  initialModules,
}: {
  initialModules: any[];
}) {
  const [modules, setModules] = useState(initialModules);

  useEffect(() => {
    setModules(initialModules);
  }, [initialModules]);

  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"pm_review" | "revising" | "for_qa">("pm_review");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [assignedDevId, setAssignedDevId] = useState<string>("");
  const [newDeadline, setNewDeadline] = useState<string>("");
  const [projectDevs, setProjectDevs] = useState<{ id: string; full_name: string }[]>([]);
  const [loadingDevs, setLoadingDevs] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProjectDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("qa-revision-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "project_modules" }, () => {
        router.refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, router]);

  const handleOpenReview = async (mod: any) => {
    setSelectedModule(mod);
    // For revision modules → acknowledge → pm_review
    setReviewStatus("pm_review");
    setAssignedDevId(mod.assigned_developer_id || "");
    const deadlineVal = mod.deadline
      ? mod.deadline.includes("T")
        ? mod.deadline.split("T")[0]
        : mod.deadline
      : "";
    setNewDeadline(deadlineVal);
    setCopiedLink(false);

    if (mod.project?.id) {
      setLoadingDevs(true);
      try {
        const { data, error } = await supabase
          .from("project_members")
          .select("user_id, profiles!inner(id, full_name, role)")
          .eq("project_id", mod.project.id)
          .in("profiles.role", ["developer", "devops"]);
        if (!error && data) {
          const devs = data.map((d: any) => ({
            id: d.profiles.id,
            full_name: d.profiles.full_name || "Unnamed Developer",
          }));
          setProjectDevs(devs);
        }
      } catch (err) {
        console.error("Error fetching project developers:", err);
      } finally {
        setLoadingDevs(false);
      }
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedModule) return;
    setIsSubmittingReview(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const updates: any = {
        status: "pm_review",
        qa_result_acknowledged_at: new Date().toISOString(),
        qa_result_acknowledged_by: user?.id ?? null,
      };

      // Try RPC acknowledgement (best-effort)
      try {
        await supabase.rpc("acknowledge_qa_result", { p_module_id: selectedModule.id });
      } catch (rpcErr) {
        console.warn("acknowledge_qa_result RPC notice:", rpcErr);
      }

      const { error } = await supabase
        .from("project_modules")
        .update(updates)
        .eq("id", selectedModule.id);

      if (error) throw error;

      toast.success(`"${selectedModule.name}" acknowledged — status set to PM Review.`);

      setModules((prev) => prev.filter((m) => m.id !== selectedModule.id));
      setShowConfirmModal(false);
      setSelectedModule(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to acknowledge module.");
      setShowConfirmModal(false);
    } finally {
      setIsSubmittingReview(false);
    }
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

  const projectOptions = Array.from(
    new Map(
      modules.map((m: any) => [m.project.id, m.project.name] as [string, string]),
    ).entries(),
  )
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredModules = modules.filter((m: any) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.project.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = m.status === "for revision" || m.status === "for_revision";
    const matchesPriority =
      priorityFilter === "all" || m.priority === priorityFilter;
    const matchesProject =
      projectFilter === "all" || m.project.id === projectFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesProject;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-sm">
          <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
            For Revision
          </span>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-300">
            {filteredModules.length}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row w-full gap-3 items-center sm:justify-end">
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
        <div className="relative w-full sm:w-64">
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
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white dark:bg-slate-800 dark:text-white transition-colors"
            placeholder="Search modules..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>


        {/* Project Filter (searchable) */}
        <div ref={projectDropdownRef} className="relative w-full sm:w-64">
          <button
            type="button"
            onClick={() => setIsProjectDropdownOpen((o) => !o)}
            className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white dark:bg-slate-800 dark:text-white transition-colors flex justify-between items-center gap-2 text-left"
          >
            <span className="truncate">
              {projectFilter === "all"
                ? "All Projects"
                : projectOptions.find((p) => p.id === projectFilter)?.name || "All Projects"}
            </span>
            <svg
              className={`w-4 h-4 shrink-0 text-gray-500 dark:text-slate-400 transition-transform ${isProjectDropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isProjectDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 flex flex-col overflow-hidden">
              <div className="p-2 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white"
                  placeholder="Search projects..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="overflow-y-auto p-1 flex-1">
                <button
                  type="button"
                  onClick={() => {
                    setProjectFilter("all");
                    setIsProjectDropdownOpen(false);
                    setProjectSearch("");
                    setCurrentPage(1);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${projectFilter === "all" ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
                >
                  All Projects
                </button>
                {projectOptions
                  .filter((p) => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setProjectFilter(p.id);
                        setIsProjectDropdownOpen(false);
                        setProjectSearch("");
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium truncate ${projectFilter === p.id ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
                    >
                      {p.name}
                    </button>
                  ))}
                {projectOptions.filter((p) => p.name.toLowerCase().includes(projectSearch.toLowerCase())).length === 0 && (
                  <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-slate-400 font-medium">
                    No projects found.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <select
          className="w-full sm:w-32 px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white dark:bg-slate-800 dark:text-white transition-colors"
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
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-transparent dark:border-slate-700 overflow-hidden">
        {(() => {
          const totalPages = Math.ceil(filteredModules.length / itemsPerPage);
          const paginatedModules = filteredModules.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage,
          );

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                      Priority
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Module
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      QA Auditor
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      QA Document
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {paginatedModules.map((module: any) => (
                    <tr
                      key={module.id}
                      onClick={() => handleOpenReview(module)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full border text-xs font-bold capitalize ${getPriorityColor(module.priority)}`}
                        >
                          {module.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 dark:text-white block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {module.name}
                        </span>
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                          FOR REVISION
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {module.project.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {module.auditor_name || "Unknown"}
                          </span>
                          {module.qa_acknowledged_at && (
                            <span className="text-xs text-slate-400">
                              {(() => {
                                try {
                                  return DATE_FMT.format(new Date(module.qa_acknowledged_at));
                                } catch {
                                  return module.qa_acknowledged_at;
                                }
                              })()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {module.qa_result_document_url ? (
                          <a
                            href={module.qa_result_document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold hover:underline"
                          >
                            View Document ↗
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">
                            No Document
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenReview(module)}
                          className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md whitespace-nowrap flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Acknowledge
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredModules.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                      >
                        {modules.length === 0
                          ? "You have no modules currently returned for revision."
                          : "No modules match your filters."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {totalPages > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 dark:border-slate-700 px-6 py-4 gap-4">
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                      Showing{" "}
                      <span className="font-bold">
                        {(currentPage - 1) * itemsPerPage +
                          (paginatedModules.length > 0 ? 1 : 0)}
                      </span>{" "}
                      to{" "}
                      <span className="font-bold">
                        {Math.min(
                          currentPage * itemsPerPage,
                          filteredModules.length,
                        )}
                      </span>{" "}
                      of{" "}
                      <span className="font-bold">
                        {filteredModules.length}
                      </span>{" "}
                      modules
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 font-medium">
                        Show
                      </span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white dark:bg-slate-800 dark:text-white px-2 py-1 cursor-pointer"
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
                        {generatePagination(currentPage, totalPages).map(
                          (page, i) =>
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
                                className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold transition-all ${currentPage === page ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"}`}
                              >
                                {page}
                              </button>
                            ),
                        )}
                      </div>

                      <button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages),
                          )
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
            </div>
          );
        })()}
      </div>

      {/* Review Result Modal */}
      {selectedModule && mounted && createPortal(
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setSelectedModule(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl sm:max-w-3xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-[var(--sys-primary)]">Review Result</h2>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-bold capitalize ${selectedModule.status === "revision"
                      ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                      : selectedModule.status === "pm_review"
                        ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                        : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                    }`}>
                    {selectedModule.status === "pm_review" ? "PM Review" : selectedModule.status}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 mt-1">
                  {selectedModule.project.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedModule(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Module Name */}
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Module Name
                </p>
                <p className="text-lg font-extrabold text-slate-800 dark:text-white">
                  {selectedModule.name}
                </p>
              </div>

              {/* Description */}
              {selectedModule.description && (
                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Description
                  </p>
                  <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 space-y-3">
                    {selectedModule.description.split("\n").map((line: string, i: number) =>
                      line.trim() === "" ? (
                        <div key={i} className="h-2" />
                      ) : (
                        <p key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-7">
                          {line}
                        </p>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Priority, Category, Deadline, Dev grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Priority</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-bold capitalize ${getPriorityColor(selectedModule.priority)}`}>
                    {selectedModule.priority}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Category</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 capitalize">
                    {selectedModule.category ? selectedModule.category.replace(/_/g, " ") : "General"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Deadline</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {selectedModule.deadline
                      ? new Date(selectedModule.deadline).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                      : "No deadline"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Assigned Dev</p>
                  {selectedModule.assigned_developer_name ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-[10px] font-black flex items-center justify-center uppercase">
                        {selectedModule.assigned_developer_name.charAt(0)}
                      </span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {selectedModule.assigned_developer_name}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-slate-500 italic">Unassigned</span>
                  )}
                </div>
              </div>

              {/* Document & Testing Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Module Document
                  </h3>
                  {selectedModule.module_document_url ? (
                    <a
                      href={selectedModule.module_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View Document ↗
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-gray-400 dark:text-slate-500 italic">
                      No attached document by PM
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Website Link (Testing)
                  </h3>
                  {selectedModule.website_link ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedModule.website_link) {
                            navigator.clipboard.writeText(selectedModule.website_link);
                            setCopiedLink(true);
                            toast.success("Website link copied to clipboard!");
                            setTimeout(() => setCopiedLink(false), 2000);
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copiedLink
                            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                            : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800"
                          }`}
                        title="Copy website link"
                      >
                        {copiedLink ? (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            Copy Link
                          </>
                        )}
                      </button>
                      <a
                        href={selectedModule.website_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-300 hover:underline"
                      >
                        Open ↗
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-gray-400 dark:text-slate-500 italic">
                      No website link provided
                    </p>
                  )}
                </div>
              </div>

              {/* QA Result Document */}
              <div className="p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                <h3 className="text-xs font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider mb-2">
                  QA Result Document
                </h3>
                {selectedModule.qa_result_document_url ? (
                  <a
                    href={selectedModule.qa_result_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View QA Results ↗
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-gray-400 dark:text-slate-500 italic">
                    No QA result document uploaded yet
                  </p>
                )}
              </div>

              {/* Workflow Acknowledgements */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-700/80">
                <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                  Workflow Acknowledgements
                </h3>
                <div className="space-y-3">
                  {/* System Auditor QA Acknowledgement */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase block">
                        System Auditor QA
                      </span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {selectedModule.auditor_name || selectedModule.qa_acknowledged_by_name || "Unknown Auditor"}
                      </span>
                    </div>
                    {selectedModule.qa_acknowledged_at ? (
                      <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                        {(() => {
                          try {
                            return DATE_FMT.format(new Date(selectedModule.qa_acknowledged_at));
                          } catch {
                            return selectedModule.qa_acknowledged_at;
                          }
                        })()}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 inline-block"></span>
                        Not yet acknowledged
                      </span>
                    )}
                  </div>

                  <div className="border-t border-gray-200/60 dark:border-slate-700/60"></div>

                  {/* Project Manager QA Result Acknowledgement */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase block">
                        Project Manager QA Result
                      </span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {selectedModule.qa_result_acknowledged_by_name || (selectedModule.qa_result_acknowledged_at ? "Project Manager" : "Pending Review")}
                      </span>
                    </div>
                    {selectedModule.qa_result_acknowledged_at ? (
                      <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                        {(() => {
                          try {
                            return DATE_FMT.format(new Date(selectedModule.qa_result_acknowledged_at));
                          } catch {
                            return selectedModule.qa_result_acknowledged_at;
                          }
                        })()}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse"></span>
                        Will be acknowledged on submit
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Acknowledge Notice */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-start gap-3">
                <div className="mt-0.5 w-8 h-8 shrink-0 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-0.5">
                    Acknowledge &amp; Forward to PM Review
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                    Clicking <span className="font-bold">Acknowledge</span> will record your acknowledgement and move this module to <span className="font-bold">PM Review</span> status. The project manager will then take the next action on this module.
                  </p>
                </div>
              </div>

              {/* QA Document History */}
              <DocumentHistorySection moduleId={selectedModule.id} />
              <StatusHistorySection moduleId={selectedModule.id} />
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900 flex justify-end gap-3">
              <button
                onClick={() => setSelectedModule(null)}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={isSubmittingReview}
                className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingReview ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Acknowledging...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Acknowledge
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal */}
      <ConfirmStatusModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleSubmitReview}
        isLoading={isSubmittingReview}
        title="Acknowledge Module"
        message={
          <>
            Acknowledge{" "}
            <span className="font-bold text-slate-800 dark:text-white">"{selectedModule?.name}"</span>?{" "}
            The status will be set to{" "}
            <span className="font-bold text-emerald-600 dark:text-emerald-400">PM Review</span>{" "}
            and your acknowledgement will be recorded.
          </>
        }
        confirmText="Acknowledge"
        confirmButtonClass="bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
      />
    </div>
  );
}
