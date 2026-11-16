"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { removeWeeklyPlanFiles } from "@/lib/weeklyPlans";
import WeeklyPlanDrawer, { type DrawerMode } from "./WeeklyPlanDrawer";
import {
  WEEKLY_PLAN_STATUSES,
  weeklyPlanStatusMeta,
  type WeeklyPlan,
  type WeeklyPlanPerson,
} from "@/types/weeklyPlan";

interface WeeklyPlansClientProps {
  initialPlans: WeeklyPlan[];
  people: WeeklyPlanPerson[];
  viewer: { id: string; role: string };
}

function formatWeek(value: string | null) {
  if (!value) return "No week set";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function ConfirmDeleteDialog({
  title,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 mx-auto flex items-center justify-center mb-4">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-extrabold text-center text-slate-900 dark:text-white mb-2">
          Delete Weekly Plan
        </h3>
        <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">
          Delete <span className="font-bold text-slate-700 dark:text-slate-200">&quot;{title}&quot;</span> and
          its attachments? This cannot be undone.
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50"
          >
            {busy ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function generatePagination(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 3) return [1, 2, 3, 4, "...", totalPages];
  if (currentPage >= totalPages - 2)
    return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

export default function WeeklyPlansClient({ initialPlans, people, viewer }: WeeklyPlansClientProps) {
  const [plans, setPlans] = useState(initialPlans);
  const [syncedPlans, setSyncedPlans] = useState(initialPlans);
  if (initialPlans !== syncedPlans) {
    setSyncedPlans(initialPlans);
    setPlans(initialPlans);
  }

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [drawer, setDrawer] = useState<{ mode: DrawerMode; plan: WeeklyPlan | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WeeklyPlan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyPlanId, setBusyPlanId] = useState<number | null>(null);

  const supabase = createClient();
  const router = useRouter();
  const isSuperAdmin = viewer.role === "super_admin";

  const peopleById = useMemo(
    () => new Map(people.map((person) => [person.id, person.full_name || person.email || "Unknown user"])),
    [people],
  );
  const nameOf = (id: string | null) => (id ? peopleById.get(id) ?? "Unknown user" : "Unknown user");

  const canEdit = (plan: WeeklyPlan) => plan.created_by === viewer.id || isSuperAdmin;
  const canDelete = (plan: WeeklyPlan) => plan.created_by === viewer.id || isSuperAdmin;
  const isAssigneeOnly = (plan: WeeklyPlan) =>
    plan.assigned_personnel === viewer.id && plan.created_by !== viewer.id;

  const filteredPlans = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const nameFor = (id: string) => peopleById.get(id) ?? "Unknown user";
    return plans.filter((plan) => {
      if (statusFilter !== "all" && plan.status !== statusFilter) return false;
      if (scopeFilter === "mine" && plan.created_by !== viewer.id) return false;
      if (scopeFilter === "assigned" && plan.assigned_personnel !== viewer.id) return false;
      if (!term) return true;
      return [plan.title, plan.module, plan.description ?? "", nameFor(plan.assigned_personnel), nameFor(plan.created_by)]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [plans, searchTerm, statusFilter, scopeFilter, viewer.id, peopleById]);

  const totalPages = Math.max(1, Math.ceil(filteredPlans.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPlans = filteredPlans.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const handleMarkDone = async (plan: WeeklyPlan) => {
    setBusyPlanId(plan.id);
    try {
      const { error } = await supabase.from("weekly_plans").update({ status: "done" }).eq("id", plan.id);
      if (error) throw error;
      setPlans((prev) => prev.map((item) => (item.id === plan.id ? { ...item, status: "done" } : item)));
      toast.success("Task marked as done.");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Could not update this task. Please try again.");
    } finally {
      setBusyPlanId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("weekly_plans").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      await removeWeeklyPlanFiles(supabase, deleteTarget.document_attachments ?? []);
      setPlans((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      toast.success("Weekly plan deleted.");
      setDeleteTarget(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Could not delete this plan. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const inputClass =
    "px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)]/30 font-medium bg-white dark:bg-slate-800 dark:text-white transition-colors";

  const resetPageAnd = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-400/20 px-6 py-4 rounded-2xl shadow-sm min-w-56">
          <h3 className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider mb-1">
            Total Weekly Plans
          </h3>
          <p className="text-4xl font-black text-indigo-600 dark:text-indigo-300">{filteredPlans.length}</p>
        </div>

        <button
          type="button"
          onClick={() => setDrawer({ mode: "create", plan: null })}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--sys-primary)] text-white text-sm font-bold shadow-lg hover:opacity-90 transition-opacity"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New Plan
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            value={searchTerm}
            onChange={(e) => resetPageAnd(setSearchTerm)(e.target.value)}
            placeholder="Search title, module, people..."
            className={`${inputClass} w-full pl-10`}
          />
        </div>

        <select value={statusFilter} onChange={(e) => resetPageAnd(setStatusFilter)(e.target.value)} className={inputClass}>
          <option value="all">All Statuses</option>
          {WEEKLY_PLAN_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select value={scopeFilter} onChange={(e) => resetPageAnd(setScopeFilter)(e.target.value)} className={inputClass}>
          <option value="all">All Plans</option>
          <option value="mine">Created by me</option>
          <option value="assigned">Assigned to me</option>
        </select>
      </div>

      {paginatedPlans.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm p-10 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 italic">
            {plans.length === 0
              ? "No weekly plans yet. Create one to get started."
              : "No plans match your filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedPlans.map((plan) => {
            const meta = weeklyPlanStatusMeta(plan.status);
            const attachments = plan.document_attachments ?? [];
            return (
              <div
                key={plan.id}
                className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                      {plan.module}
                    </p>
                    <button
                      type="button"
                      onClick={() => setDrawer({ mode: "view", plan })}
                      className="mt-0.5 text-left text-sm font-extrabold text-slate-900 dark:text-white hover:text-[var(--sys-primary-text)] transition-colors line-clamp-2"
                    >
                      {plan.title}
                    </button>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold shrink-0 ${meta.badge}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
                    {meta.label}
                  </span>
                </div>

                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2rem]">
                  {plan.description || "No description."}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span className="truncate">Assigned: <span className="text-slate-700 dark:text-slate-200">{nameOf(plan.assigned_personnel)}</span></span>
                  <span>Week of {formatWeek(plan.date_weekly)}</span>
                  {attachments.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                      {attachments.length}
                    </span>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setDrawer({ mode: "view", plan })}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    View
                  </button>
                  {canEdit(plan) && (
                    <button
                      type="button"
                      onClick={() => setDrawer({ mode: "edit", plan })}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  {isAssigneeOnly(plan) && (
                    <button
                      type="button"
                      onClick={() => handleMarkDone(plan)}
                      disabled={plan.status !== "in progress" || busyPlanId === plan.id}
                      title={
                        plan.status === "in progress"
                          ? "Mark this task as done"
                          : "Only an in progress task can be marked done"
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[11px] font-bold hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {busyPlanId === plan.id ? "Updating..." : "Mark as done"}
                    </button>
                  )}
                  {canDelete(plan) && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(plan)}
                      className="ml-auto px-3 py-1.5 rounded-lg text-red-500 text-[11px] font-bold hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredPlans.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Showing{" "}
              <span className="font-bold">
                {(safePage - 1) * itemsPerPage + (paginatedPlans.length > 0 ? 1 : 0)}
              </span>{" "}
              to <span className="font-bold">{Math.min(safePage * itemsPerPage, filteredPlans.length)}</span> of{" "}
              <span className="font-bold">{filteredPlans.length}</span>
            </p>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value={6}>6</option>
              <option value={9}>9</option>
              <option value={18}>18</option>
              <option value={36}>36</option>
            </select>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(safePage - 1, 1))}
                disabled={safePage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                aria-label="Previous page"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {generatePagination(safePage, totalPages).map((page, index) =>
                page === "..." ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 font-bold text-xs"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${page}`}
                    type="button"
                    onClick={() => setCurrentPage(page as number)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                      safePage === page
                        ? "bg-[var(--sys-primary)] text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(safePage + 1, totalPages))}
                disabled={safePage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                aria-label="Next page"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
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

      {drawer && (
        <WeeklyPlanDrawer
          key={`${drawer.mode}-${drawer.plan?.id ?? "new"}`}
          mode={drawer.mode}
          plan={drawer.plan}
          people={people}
          viewerId={viewer.id}
          onClose={() => setDrawer(null)}
          onSaved={() => router.refresh()}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          title={deleteTarget.title}
          busy={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
