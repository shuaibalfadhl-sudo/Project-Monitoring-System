"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface QaModule {
  id: string;
  name: string;
  description: string | null;
  priority: string;
  status: string;
  module_document_url?: string | null;
  qa_result_document_url?: string | null;
  project: {
    id: string;
    name: string;
    created_by?: string;
    creator_name?: string;
  };
}

interface QaMonitoringClientProps {
  initialModules: QaModule[];
}

export default function QaMonitoringClient({
  initialModules,
}: QaMonitoringClientProps) {
  const [modules, setModules] = useState<QaModule[]>(initialModules);
  const [selectedModule, setSelectedModule] = useState<QaModule | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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

  const [newStatus, setNewStatus] = useState<string>("");
  const [reworkLink, setReworkLink] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const supabase = createClient();

  const handleRowClick = (mod: QaModule) => {
    setSelectedModule(mod);
    setNewStatus("");
    setReworkLink("");
    setError("");
  };

  const closeModal = () => {
    setSelectedModule(null);
    setNewStatus("");
    setReworkLink("");
    setError("");
  };

  const handleAcknowledge = async (moduleId: string) => {
    setIsSubmitting(true);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc(
        "acknowledge_module_for_qa",
        {
          p_module_id: moduleId,
        },
      );
      if (rpcError) throw rpcError;

      setModules((prev) =>
        prev.map((m) => (m.id === moduleId ? { ...m, status: "auditing" } : m)),
      );
      if (selectedModule && selectedModule.id === moduleId) {
        setSelectedModule({ ...selectedModule, status: "auditing" });
      }
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to acknowledge module.");
      setError(err.message || "Failed to acknowledge module.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (!selectedModule || !newStatus) return;

    if (newStatus === "revision" && !reworkLink.trim()) {
      setError(
        "Please provide a document link or description for the revision.",
      );
      return;
    }

    // Validate URL if it's a URL
    if (newStatus === "revision" && reworkLink.trim().startsWith("http")) {
      try {
        new URL(reworkLink);
      } catch (e) {
        setError(
          "Please provide a valid URL (starting with http:// or https://)",
        );
        return;
      }
    }

    setIsSubmitting(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("project_modules")
        .update({
          status: newStatus,
          qa_result_document_url:
            newStatus === "revision" ? reworkLink.trim() : null,
        })
        .eq("id", selectedModule.id);

      if (updateError) throw updateError;

      // Remove module from list if it's no longer 'for_qa' or 'auditing'
      setModules((prev) => prev.filter((m) => m.id !== selectedModule.id));
      closeModal();
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred while updating the module.");
    } finally {
      setIsSubmitting(false);
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
    <div className="w-full bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-colors duration-300">
      <h1 className="text-3xl font-extrabold text-[var(--sys-primary)] mb-6">
        QA Monitoring
      </h1>

      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 p-6 rounded-2xl shadow-sm inline-block min-w-64">
          <h3 className="text-sm font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider mb-2">
            Total Modules Pending QA
          </h3>
          <p className="text-5xl font-black text-amber-600 dark:text-amber-400">
            {modules.length}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 items-center">
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
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium bg-white dark:bg-slate-800 dark:text-white transition-colors"
              placeholder="Search modules..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select
            className="w-full sm:w-40 px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium bg-white dark:bg-slate-800 dark:text-white transition-colors"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Statuses</option>
            <option value="for_qa">For QA</option>
            <option value="auditing">Auditing</option>
          </select>

          <select
            className="w-full sm:w-32 px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium bg-white dark:bg-slate-800 dark:text-white transition-colors"
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

      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors duration-300">
        {(() => {
          const filteredModules = modules.filter((m) => {
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

          return filteredModules.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/50 border-t border-dashed border-gray-200 dark:border-slate-700">
              <p className="text-gray-500 dark:text-slate-400 font-medium">
                No modules match your filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/50 border-b-2 border-gray-100 dark:border-slate-800 transition-colors">
                    <th className="py-4 px-6 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider text-center w-24">
                      Priority
                    </th>
                    <th className="py-4 px-6 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Module Name
                    </th>
                    <th className="py-4 px-6 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Project Name
                    </th>
                    <th className="py-4 px-6 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="py-4 px-6 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {paginatedModules.map((mod) => (
                    <tr
                      key={mod.id}
                      onClick={() => handleRowClick(mod)}
                      className="hover:bg-amber-50/50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full border text-xs font-bold capitalize ${getPriorityColor(mod.priority)}`}
                        >
                          {mod.priority}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-[var(--sys-primary)] group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                        {mod.name}
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-gray-600 dark:text-slate-300 block">
                          {mod.project.name}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block mt-1">
                          By: {mod.project.creator_name || "Unknown"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 capitalize border border-amber-200 dark:border-amber-800/50">
                          {mod.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {mod.status === "for_qa" ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcknowledge(mod.id);
                            }}
                            disabled={isSubmitting}
                            className="py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors shadow-md disabled:opacity-50 whitespace-nowrap"
                          >
                            {isSubmitting ? "Processing..." : "Acknowledge QA"}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(mod);
                            }}
                            className="py-2 px-4 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl transition-colors shadow-md whitespace-nowrap"
                          >
                            QA Result
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 dark:border-slate-800 px-6 py-4 gap-4 transition-colors">
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
                      <span className="font-bold">
                        {filteredModules.length}
                      </span>{" "}
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
                        className="border border-gray-200 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium bg-white dark:bg-slate-800 dark:text-white px-2 py-1 cursor-pointer"
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
                        className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 dark:text-slate-500 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
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
                                className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold transition-all ${currentPage === page ? "bg-amber-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700"}`}
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
                        className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-gray-100 dark:disabled:hover:bg-slate-800 transition-colors"
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

      {/* Modal */}
      {selectedModule && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--sys-primary)]">
                  Review Module
                </h2>
                <p className="text-sm font-semibold text-gray-500 mt-1">
                  {selectedModule.project.name}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg
                  className="w-6 h-6"
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

            <div className="p-6 overflow-y-auto space-y-6">
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
                  Module Document
                </h3>
                {selectedModule.module_document_url ? (
                  <a
                    href={selectedModule.module_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-blue-600 hover:underline"
                  >
                    View Document ↗
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-gray-400 italic">
                    No attached document by PM
                  </p>
                )}
              </div>

              {selectedModule.status === "for_qa" ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                  <h3 className="text-amber-800 font-bold mb-2">
                    Acknowledgement Required
                  </h3>
                  <p className="text-sm text-amber-700 mb-4">
                    You must officially acknowledge receipt of this module
                    before you can submit a QA judgment.
                  </p>
                  <button
                    onClick={() => handleAcknowledge(selectedModule.id)}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? "Processing..." : "Acknowledge QA"}
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                      Update Status
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
                  </div>

                  {newStatus === "revision" && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300 pt-2">
                      <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                        QA Result Document Link{" "}
                        <span className="text-red-500 text-base">*</span>
                      </h3>
                      <input
                        type="url"
                        value={reworkLink}
                        onChange={(e) => setReworkLink(e.target.value)}
                        placeholder="https://..."
                        className="w-full p-4 rounded-xl border-2 border-red-100 bg-red-50/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-medium placeholder:text-red-300"
                        required
                      />
                    </div>
                  )}
                </>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl font-medium text-sm flex items-start gap-3">
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
            </div>

            <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                disabled={isSubmitting}
              >
                Close
              </button>
              {selectedModule.status === "auditing" && (
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
