"use client";

import { useState } from "react";
import Link from "next/link";
import { ProjectModule } from "@/types/project";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import CreateModuleModal from "@/components/modules/CreateModuleModal";
import EditModuleModal from "@/components/modules/EditModuleModal";

interface ModuleListProps {
  modules: ProjectModule[];
  projectId: string;
  isManager: boolean;
  isAuditor: boolean;
  isDeveloper?: boolean;
}

export default function ModuleList({
  modules,
  projectId,
  isManager,
  isAuditor,
  isDeveloper,
}: ModuleListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedModule, setSelectedModule] = useState<ProjectModule | null>(
    null,
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [newStatus, setNewStatus] = useState<string>("");
  const [reworkLink, setReworkLink] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const supabase = createClient();

  const openModal = (module: ProjectModule) => {
    setSelectedModule(module);
    setNewStatus("");
    setReworkLink("");
    setError("");
  };

  const handleSave = async () => {
    if (!selectedModule || !newStatus) return;

    if (newStatus === "rework" && !reworkLink.trim()) {
      setError("Please provide a document link or description for the rework.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      let updatedDescription = selectedModule.description;
      if (newStatus === "rework") {
        updatedDescription = updatedDescription
          ? `${updatedDescription}\n\n[Rework Note]: ${reworkLink}`
          : `[Rework Note]: ${reworkLink}`;
      }

      const { error: updateError } = await supabase
        .from("project_modules")
        .update({
          status: newStatus,
          description: updatedDescription,
        })
        .eq("id", selectedModule.id);

      if (updateError) throw updateError;

      setSelectedModule(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred while updating the module.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generatePagination = (currentPage: number, totalPages: number) => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, "...", totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [
        1,
        "...",
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
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

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "development":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
      case "pm_review":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
      case "for_qa":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300";
      case "auditing":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
      case "revision":
        return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
      case "revising":
        return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
      case "qa_approved":
        return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
      case "deployment":
        return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300";
      case "deployed":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
      case "pending":
      default:
        return "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300";
    }
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

  const filteredModules = modules.filter((module) => {
    const matchesSearch = module.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || module.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || module.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const totalPages = Math.ceil(filteredModules.length / itemsPerPage);
  const paginatedModules = filteredModules.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-transparent dark:border-slate-800 overflow-hidden">
      <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-[var(--sys-primary)]">Modules</h2>

        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3 items-center">
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
          {/* Search Bar */}
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
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium bg-white dark:bg-slate-800 dark:text-white"
              placeholder="Search modules..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            className="w-full sm:w-40 px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium bg-white dark:bg-slate-800 dark:text-white"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="development">Development</option>
            <option value="pm_review">PM Review</option>
            <option value="for_qa">For QA</option>
            <option value="auditing">Auditing</option>
            <option value="revision">Revision</option>
            <option value="revising">Revising</option>
            <option value="qa_approved">QA Approved</option>
            <option value="deployment">Deployment</option>
            <option value="deployed">Deployed</option>
          </select>

          {/* Priority Filter */}
          <select
            className="w-full sm:w-32 px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium bg-white dark:bg-slate-800 dark:text-white"
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

          <CreateModuleModal projectId={projectId} />
        </div>
      </div>

      <div className="p-8">
        {!modules || modules.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-slate-400 font-medium">
              No modules have been created yet.
            </p>
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-slate-400 font-medium">
              No modules match your filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-100 dark:border-slate-800">
                  <th className="pb-4 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Module Name
                  </th>
                  <th className="pb-4 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider text-center">
                    Category
                  </th>
                  <th className="pb-4 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider text-center">
                    Priority
                  </th>
                  <th className="pb-4 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  {isManager ? (
                    <th className="pb-4 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  ) : (
                    <th className="pb-4 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Description
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/50">
                {paginatedModules.map((module: ProjectModule) => (
                  <tr
                    key={module.id}
                    onClick={() => openModal(module)}
                    className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <td className="py-4 font-bold text-[var(--sys-primary)]">
                      {module.name}
                      {module.revision_count ? (
                        <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                          {module.revision_count} Rev
                        </span>
                      ) : null}
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-xs font-bold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded capitalize">
                        {module.category
                          ? module.category.replace("_", " ")
                          : "New Module"}
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full border text-xs font-bold capitalize ${getPriorityColor(module.priority)}`}
                      >
                        {module.priority}
                      </span>
                    </td>
                    <td className="py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${module.status === 'qa_approved' || module.status === 'for_qa' ? '' : 'capitalize'} ${getStatusColor(module.status)}`}
                      >
                        {module.status === 'qa_approved' ? 'QA Approved' : module.status === 'for_qa' ? 'For QA' : (module.status || "pending").replace("_", " ")}
                      </span>
                    </td>
                    {isManager ? (
                      <td className="py-4 text-right">
                        <div
                          className="flex justify-end gap-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <EditModuleModal module={module} />
                          <button className="text-sm font-semibold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                            Delete
                          </button>
                        </div>
                      </td>
                    ) : (
                      <td className="py-4 text-sm text-gray-600 dark:text-slate-400 font-medium">
                        <div className="line-clamp-1 max-w-xs">
                          {module.description || (
                            <span className="italic text-gray-400 dark:text-slate-500">
                              No description
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 dark:border-slate-800 px-6 py-4 gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                  <p className="text-sm text-gray-700 dark:text-slate-300 font-medium">
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
                    <span className="font-bold">{filteredModules.length}</span>{" "}
                    modules
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-slate-400 font-medium">
                      Show
                    </span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="border border-gray-200 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium bg-white dark:bg-slate-800 dark:text-white px-2 py-1 cursor-pointer"
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
                      className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
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
                              className="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-slate-500 font-bold tracking-widest"
                            >
                              ...
                            </span>
                          ) : (
                            <button
                              key={`page-${page}`}
                              onClick={() => setCurrentPage(page as number)}
                              className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold transition-all ${
                                currentPage === page
                                  ? "bg-[#3b82f6] text-white shadow-sm"
                                  : "text-gray-500 hover:bg-gray-100"
                              }`}
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
                      className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 text-gray-400 hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-gray-100 transition-colors"
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
        )}
      </div>

      {/* Module Details Modal */}
      {selectedModule && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-extrabold text-[var(--sys-primary)]">
                Module Details
              </h2>
              <button
                onClick={() => setSelectedModule(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
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
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Module Name
                </h3>
                <p className="text-lg font-bold text-[var(--sys-primary)]">
                  {selectedModule.name}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Description
                </h3>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-gray-700 whitespace-pre-wrap font-medium">
                  {selectedModule.description || (
                    <span className="italic text-gray-400">
                      No description provided for this module.
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Priority
                  </h3>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-bold capitalize ${getPriorityColor(selectedModule.priority)}`}
                  >
                    {selectedModule.priority}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Status
                  </h3>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${selectedModule.status === 'qa_approved' || selectedModule.status === 'for_qa' ? '' : 'capitalize'} ${getStatusColor(selectedModule.status)}`}
                  >
                    {selectedModule.status === 'qa_approved' ? 'QA Approved' : selectedModule.status === 'for_qa' ? 'For QA' : (selectedModule.status || "pending").replace("_", " ")}
                  </span>
                </div>
              </div>

              {(selectedModule.qa_acknowledged_at ||
                selectedModule.qa_result_acknowledged_at) && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Workflow Acknowledgements
                  </h3>
                  <div className="space-y-3">
                    {selectedModule.qa_acknowledged_at && (
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                          System Auditor QA
                        </span>
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
                          }).format(
                            new Date(selectedModule.qa_acknowledged_at),
                          )}
                        </span>
                      </div>
                    )}
                    {selectedModule.qa_result_acknowledged_at && (
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                          Project Manager Rework
                        </span>
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
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isAuditor && selectedModule.status === "for_qa" && (
                <div className="border-t border-gray-100 pt-6 mt-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    QA Decision
                  </h3>
                  <div className="flex gap-4">
                    <label
                      className={`flex-1 flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${newStatus === "qa_approved" ? "border-green-500 bg-green-50 text-green-700 shadow-[0_4px_12px_rgba(34,197,94,0.15)]" : "border-gray-200 hover:border-green-200 text-gray-500 hover:bg-green-50/50"}`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value="qa_approved"
                        className="hidden"
                        checked={newStatus === "qa_approved"}
                        onChange={(e) => setNewStatus(e.target.value)}
                      />
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${newStatus === "qa_approved" ? "bg-green-100" : "bg-gray-100"}`}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <span className="font-bold">QA Passed</span>
                    </label>

                    <label
                      className={`flex-1 flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${newStatus === "revision" ? "border-red-500 bg-red-50 text-red-700 shadow-[0_4px_12px_rgba(225,29,72,0.15)]" : "border-gray-200 hover:border-red-200 text-gray-500 hover:bg-red-50/50"}`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value="revision"
                        className="hidden"
                        checked={newStatus === "revision"}
                        onChange={(e) => setNewStatus(e.target.value)}
                      />
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${newStatus === "revision" ? "bg-red-100" : "bg-gray-100"}`}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <span className="font-bold">Needs Revision</span>
                    </label>
                  </div>

                  {newStatus === "revision" && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300 pt-4">
                      <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                        Required Revision Details{" "}
                        <span className="text-red-500 text-base">*</span>
                      </h3>
                      <textarea
                        value={reworkLink}
                        onChange={(e) => setReworkLink(e.target.value)}
                        placeholder="Enter document link or provide a description of what needs to be fixed..."
                        className="w-full p-4 rounded-xl border-2 border-red-100 bg-red-50/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all resize-none h-32 text-[var(--sys-primary)] font-medium placeholder:text-red-300"
                        required
                      />
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl font-medium text-sm flex items-start gap-3">
                      <svg
                        className="w-5 h-5 shrink-0 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      {error}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => setSelectedModule(null)}
                      className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!newStatus || isSubmitting}
                      className={`px-8 py-2.5 rounded-xl font-bold text-white transition-all shadow-lg ${
                        !newStatus
                          ? "bg-gray-300 cursor-not-allowed shadow-none"
                          : newStatus === "qa_approved"
                            ? "bg-green-500 hover:bg-green-600 hover:-translate-y-0.5 shadow-green-500/20"
                            : "bg-red-500 hover:bg-red-600 hover:-translate-y-0.5 shadow-red-500/20"
                      }`}
                    >
                      {isSubmitting ? "Saving..." : "Save Decision"}
                    </button>
                  </div>
                </div>
              )}

              {isDeveloper &&
                ["pending", "development"].includes(selectedModule.status) && (
                  <div className="border-t border-gray-100 pt-6 mt-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                      Update Status
                    </h3>
                    <div className="flex gap-4">
                      <label
                        className={`flex-1 flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${newStatus === "development" ? "border-blue-500 bg-blue-50 text-blue-700 shadow-[0_4px_12px_rgba(59,130,246,0.15)]" : "border-gray-200 hover:border-blue-200 text-gray-500 hover:bg-blue-50/50"}`}
                      >
                        <input
                          type="radio"
                          name="status"
                          value="development"
                          className="hidden"
                          checked={newStatus === "development"}
                          onChange={(e) => setNewStatus(e.target.value)}
                        />
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${newStatus === "development" ? "bg-blue-100" : "bg-gray-100"}`}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                            />
                          </svg>
                        </div>
                        <span className="font-bold">Development</span>
                      </label>

                      <label
                        className={`flex-1 flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${newStatus === "pm_review" ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-[0_4px_12px_rgba(99,102,241,0.15)]" : "border-gray-200 hover:border-indigo-200 text-gray-500 hover:bg-indigo-50/50"}`}
                      >
                        <input
                          type="radio"
                          name="status"
                          value="pm_review"
                          className="hidden"
                          checked={newStatus === "pm_review"}
                          onChange={(e) => setNewStatus(e.target.value)}
                        />
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${newStatus === "pm_review" ? "bg-indigo-100" : "bg-gray-100"}`}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <span className="font-bold">PM Review</span>
                      </label>
                    </div>

                    {error && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl font-medium text-sm flex items-start gap-3">
                        <svg
                          className="w-5 h-5 shrink-0 mt-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        {error}
                      </div>
                    )}

                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        onClick={() => setSelectedModule(null)}
                        className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={!newStatus || isSubmitting}
                        className={`px-8 py-2.5 rounded-xl font-bold text-white transition-all shadow-lg ${
                          !newStatus
                            ? "bg-gray-300 cursor-not-allowed shadow-none"
                            : "bg-[var(--sys-primary)] hover:bg-[#1a2333] shadow-[var(--sys-primary)]/20"
                        }`}
                      >
                        {isSubmitting ? "Saving..." : "Update Status"}
                      </button>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
