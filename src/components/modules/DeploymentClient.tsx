"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import EditModuleModal from "./EditModuleModal";

export default function DeploymentClient({
  initialModules,
}: {
  initialModules: any[];
}) {
  const [modules, setModules] = useState(initialModules);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
  const supabase = createClient();
  const router = useRouter();

  const handleStatusUpdate = async (moduleId: string, newStatus: string) => {
    try {
      setLoadingId(moduleId);
      const { error } = await supabase
        .from("project_modules")
        .update({ status: newStatus })
        .eq("id", moduleId);

      if (error) throw error;

      toast.success(`Module moved to ${newStatus.replace("_", " ")}`);
      setModules(
        modules.map((m) =>
          m.id === moduleId ? { ...m, status: newStatus } : m,
        ),
      );
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    } finally {
      setLoadingId(null);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 items-center justify-end">
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

        <select
          className="w-full sm:w-40 px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white dark:bg-slate-800 dark:text-white transition-colors"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">All Statuses</option>
          <option value="qa_approved">QA Approved</option>
          <option value="deployment">Deployment</option>
          <option value="deployed">Deployed</option>
        </select>

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

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-transparent dark:border-slate-700 overflow-hidden">
        {(() => {
          const filteredModules = modules.filter((m: any) => {
            const matchesSearch =
              m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              m.project.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus =
              statusFilter === "all" || m.status === statusFilter;
            const matchesPriority =
              priorityFilter === "all" || m.priority === priorityFilter;
            return matchesSearch && matchesStatus && matchesPriority;
          });

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
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full border text-xs font-bold capitalize ${getPriorityColor(module.priority)}`}
                        >
                          {module.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {module.name}
                        </span>
                        {module.status === "qa_approved" ? (
                          <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                            QA APPROVED
                          </span>
                        ) : module.status === "deployment" ? (
                          <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                            DEPLOYMENT
                          </span>
                        ) : (
                          <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            DEPLOYED
                          </span>
                        )}
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
                              {new Intl.DateTimeFormat("en-US", {
                                timeZone: "Asia/Manila",
                                year: "numeric",
                                month: "short",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              }).format(new Date(module.qa_acknowledged_at))}
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
                            className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                          >
                            View Document ↗
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">
                            No Document
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 flex items-center gap-3">
                        {module.status === "qa_approved" && (
                          <button
                            onClick={() =>
                              handleStatusUpdate(module.id, "deployment")
                            }
                            disabled={loadingId === module.id}
                            className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors shadow-md disabled:opacity-50 whitespace-nowrap"
                          >
                            {loadingId === module.id
                              ? "Updating..."
                              : "Start Deployment"}
                          </button>
                        )}
                        {module.status === "deployment" && (
                          <button
                            onClick={() =>
                              handleStatusUpdate(module.id, "deployed")
                            }
                            disabled={loadingId === module.id}
                            className="py-2 px-4 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold rounded-xl transition-colors shadow-md disabled:opacity-50 whitespace-nowrap"
                          >
                            {loadingId === module.id
                              ? "Updating..."
                              : "Mark Deployed"}
                          </button>
                        )}
                        {module.status === "deployed" && (
                          <span className="text-gray-500 font-medium text-sm">
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredModules.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                      >
                        {modules.length === 0
                          ? "You have no modules in QA Approved or Deployment statuses."
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
    </div>
  );
}
