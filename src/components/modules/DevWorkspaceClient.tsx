"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DocumentHistorySection from "@/components/modules/DocumentHistorySection";

interface DevModule {
  id: string;
  name: string;
  description: string | null;
  priority: string;
  status: string;
  deadline?: string | null;
  category?: string | null;
  assigned_developer_name?: string | null;
  module_document_url?: string | null;
  website_link?: string | null;
  qa_result_document_url?: string | null;
  project: {
    id: string;
    name: string;
  };
}

interface DevWorkspaceClientProps {
  initialModules: DevModule[];
}

export default function DevWorkspaceClient({ initialModules }: DevWorkspaceClientProps) {
  const [modules, setModules] = useState<DevModule[]>(initialModules);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<DevModule | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setModules(initialModules);
  }, [initialModules]);

  useEffect(() => {
    const channel = supabase
      .channel("dev-workspace-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "project_modules" }, () => {
        router.refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, router]);

  const handleMarkPmReview = async (mod: DevModule, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSubmittingId(mod.id);
    try {
      const { error } = await supabase
        .from("project_modules")
        .update({ status: "pm_review" })
        .eq("id", mod.id);

      if (error) throw error;

      setModules((prev) => prev.filter((m) => m.id !== mod.id));
      setSelectedModule(null);
      toast.success(`"${mod.name}" submitted for PM Review`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    } finally {
      setSubmittingId(null);
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "critical": return "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800/50";
      case "high":     return "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800/50";
      case "medium":   return "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50";
      case "low":      return "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800/50";
      default:         return "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "development") return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50";
    if (status === "revising")   return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/50";
    return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  };

  const generatePagination = (current: number, total: number) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, 4, "...", total];
    if (current >= total - 2) return [1, "...", total - 3, total - 2, total - 1, total];
    return [1, "...", current - 1, current, current + 1, "...", total];
  };

  const filtered = modules.filter((m) => {
    const matchSearch   = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.project.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus   = statusFilter === "all"   || m.status === statusFilter;
    const matchPriority = priorityFilter === "all" || m.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated  = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const devCount   = modules.filter((m) => m.status === "development").length;
  const revCount   = modules.filter((m) => m.status === "revising").length;

  return (
    <div className="w-full bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-colors duration-300">
      <h1 className="text-3xl font-extrabold text-[var(--sys-primary)] mb-6">Dev Workspace</h1>

      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-4 flex-wrap">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 p-5 rounded-2xl shadow-sm min-w-44">
            <h3 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">In Development</h3>
            <p className="text-4xl font-black text-blue-600 dark:text-blue-400">{devCount}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30 p-5 rounded-2xl shadow-sm min-w-44">
            <h3 className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-1">Revising</h3>
            <p className="text-4xl font-black text-purple-600 dark:text-purple-400">{revCount}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 items-center">
          <button
            onClick={() => { setIsRefreshing(true); router.refresh(); setTimeout(() => setIsRefreshing(false), 1000); }}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
          >
            <svg className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>

          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white dark:bg-slate-800 dark:text-white transition-colors"
              placeholder="Search modules..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <select
            className="w-full sm:w-40 px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white dark:bg-slate-800 dark:text-white transition-colors"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">All Statuses</option>
            <option value="development">Development</option>
            <option value="revising">Revising</option>
          </select>

          <select
            className="w-full sm:w-32 px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white dark:bg-slate-800 dark:text-white transition-colors"
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
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
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-gray-50/50 dark:bg-slate-800/40">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 mx-auto mb-3 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-slate-300 font-bold text-base">
              {modules.length === 0 ? "No modules in your workspace" : "No modules match your filters"}
            </p>
            <p className="text-gray-400 dark:text-slate-500 text-xs mt-1">
              {modules.length === 0 ? "All tasks are clear — great work!" : "Try adjusting your search or filter settings."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800/50 border-b-2 border-gray-100 dark:border-slate-800">
                  <th className="py-4 px-6 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider text-center w-24">Priority</th>
                  <th className="py-4 px-6 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">Module Name</th>
                  <th className="py-4 px-6 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">Project</th>
                  <th className="py-4 px-6 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">Assigned Dev</th>
                  <th className="py-4 px-6 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 font-bold text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {paginated.map((mod) => {
                  const isSubmitting = submittingId === mod.id;
                  return (
                    <tr
                      key={mod.id}
                      onClick={() => setSelectedModule(mod)}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full border text-xs font-bold capitalize ${getPriorityColor(mod.priority)}`}>
                          {mod.priority}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-[var(--sys-primary)] group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors block">{mod.name}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-gray-600 dark:text-slate-300">{mod.project.name}</span>
                      </td>
                      <td className="py-4 px-6">
                        {mod.assigned_developer_name ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-[10px] font-black flex items-center justify-center uppercase">
                              {mod.assigned_developer_name.charAt(0)}
                            </span>
                            <span className="text-sm font-semibold text-gray-600 dark:text-slate-300">{mod.assigned_developer_name}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-slate-500 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border capitalize ${getStatusBadge(mod.status)}`}>
                          {mod.status === "revising" ? "Revising" : "Development"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={(e) => handleMarkPmReview(mod, e)}
                          disabled={isSubmitting}
                          className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-50 whitespace-nowrap"
                        >
                          {isSubmitting ? "Submitting..." : "For PM Review"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 dark:border-slate-800 px-6 py-4 gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                  <p className="text-sm text-gray-700 dark:text-slate-300 font-medium">
                    Showing <span className="font-bold">{(currentPage - 1) * itemsPerPage + (paginated.length > 0 ? 1 : 0)}</span>{" "}
                    to <span className="font-bold">{Math.min(currentPage * itemsPerPage, filtered.length)}</span>{" "}
                    of <span className="font-bold">{filtered.length}</span> modules
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-slate-400 font-medium">Show</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="border border-gray-200 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white dark:bg-slate-800 dark:text-white px-2 py-1 cursor-pointer"
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
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 dark:text-slate-500 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <div className="flex items-center gap-1">
                      {generatePagination(currentPage, totalPages).map((page, i) =>
                        page === "..." ? (
                          <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-slate-500 font-bold">...</span>
                        ) : (
                          <button
                            key={`p-${page}`}
                            onClick={() => setCurrentPage(page as number)}
                            className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold transition-all ${currentPage === page ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700"}`}
                          >
                            {page}
                          </button>
                        )
                      )}
                    </div>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Module Detail Modal */}
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
                <h2 className="text-xl font-extrabold text-[var(--sys-primary)]">Module Details</h2>
                <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 mt-1">{selectedModule.project.name}</p>
              </div>
              <button
                onClick={() => setSelectedModule(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Module Name */}
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Module Name</p>
                <p className="text-lg font-extrabold text-slate-800 dark:text-white">{selectedModule.name}</p>
              </div>

              {/* Description */}
              {selectedModule.description && (
                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Description</p>
                  <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 space-y-3">
                    {selectedModule.description.split("\n").map((line, i) =>
                      line.trim() === "" ? (
                        <div key={i} className="h-2" />
                      ) : (
                        <p key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-7">{line}</p>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Priority + Status + Dev row */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Priority</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-bold capitalize ${getPriorityColor(selectedModule.priority)}`}>
                    {selectedModule.priority}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Status</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-bold ${getStatusBadge(selectedModule.status)}`}>
                    {selectedModule.status === "revising" ? "Revising" : "Development"}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Assigned Dev</p>
                  {selectedModule.assigned_developer_name ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-[10px] font-black flex items-center justify-center uppercase">
                        {selectedModule.assigned_developer_name.charAt(0)}
                      </span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{selectedModule.assigned_developer_name}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-slate-500 italic">Unassigned</span>
                  )}
                </div>
              </div>

              {/* Category & Deadline */}
              {(selectedModule.category || selectedModule.deadline) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedModule.category && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Category</p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 capitalize">{selectedModule.category}</p>
                    </div>
                  )}
                  {selectedModule.deadline && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Deadline</p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {new Date(selectedModule.deadline).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Document and Testing Links */}
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
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          copiedLink
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

              {/* QA Document History */}
              <DocumentHistorySection moduleId={selectedModule.id} />
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900 flex justify-end gap-3">
              <button
                onClick={() => setSelectedModule(null)}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleMarkPmReview(selectedModule)}
                disabled={submittingId === selectedModule.id}
                className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl transition-all shadow-md disabled:opacity-50"
              >
                {submittingId === selectedModule.id ? "Submitting..." : "For PM Review"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}