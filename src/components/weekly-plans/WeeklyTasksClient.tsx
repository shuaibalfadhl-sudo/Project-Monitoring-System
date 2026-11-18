"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { requestRefresh } from "@/lib/coalescedRefresh";
import { toast } from "sonner";
import { weeklyPlanModuleLabel, weeklyPlanWeekRange } from "@/lib/weeklyPlans";
import { removeTaskFeedbackFiles, uploadTaskFeedbackFile } from "@/lib/taskFeedback";
import {
  WEEKLY_PLAN_STATUSES,
  weeklyPlanStatusMeta,
  type WeeklyPlan,
  type WeeklyPlanPerson,
  type WeeklyPlanStatus,
} from "@/types/weeklyPlan";
import DateRangeField from "./DateRangeField";
import ConfirmStatusDialog from "./ConfirmStatusDialog";
import TablePagination from "./TablePagination";
import WeeklyPlanDrawer from "./WeeklyPlanDrawer";

interface WeeklyTasksClientProps {
  initialPlans: WeeklyPlan[];
  people: WeeklyPlanPerson[];
  moduleNames: Record<string, string>;
  moduleProjects: Record<string, string>;
  viewer: { id: string; role: string };
}

function formatTimestamp(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

export default function WeeklyTasksClient({
  initialPlans,
  people,
  moduleNames,
  moduleProjects,
  viewer,
}: WeeklyTasksClientProps) {
  const [plans, setPlans] = useState(initialPlans);
  const [syncedPlans, setSyncedPlans] = useState(initialPlans);
  if (initialPlans !== syncedPlans) {
    setSyncedPlans(initialPlans);
    setPlans(initialPlans);
  }

  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusTarget, setStatusTarget] = useState<{
    plan: WeeklyPlan;
    next: WeeklyPlanStatus;
    feedback?: { message: string; files: File[] };
  } | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [viewPlanId, setViewPlanId] = useState<number | null>(null);
  const viewPlan = plans.find((plan) => plan.id === viewPlanId) ?? null;

  const supabase = createClient();
  const router = useRouter();
  const isSuperAdmin = viewer.role === "super_admin";

  useEffect(() => {
    const channel = supabase
      .channel("weekly-tasks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "weekly_plans" }, () => {
        requestRefresh(router.refresh);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  const peopleById = useMemo(
    () => new Map(people.map((person) => [person.id, person.full_name || person.email || "Unknown user"])),
    [people],
  );
  const nameOf = (id: string | null) => (id ? peopleById.get(id) ?? "Unknown user" : "Unknown user");

  const canEdit = (plan: WeeklyPlan) => plan.created_by === viewer.id || isSuperAdmin;
  const isAssigneeOnly = (plan: WeeklyPlan) =>
    plan.assigned_personnel === viewer.id && plan.created_by !== viewer.id;

  const activePlans = useMemo(
    () => plans.filter((plan) => plan.status !== "done" && plan.status !== "completed"),
    [plans],
  );

  const filteredPlans = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return activePlans
      .filter((plan) => {
        if (statusFilter !== "all" && plan.status !== statusFilter) return false;
        if (weekStart) {
          const selectedEnd = weekEnd || weekStart;
          if (
            !(plan.date_weekly <= selectedEnd && (plan.date_weekly_end ?? plan.date_weekly) >= weekStart)
          )
            return false;
        }
        if (!term) return true;
        const moduleLabel = weeklyPlanModuleLabel(plan.module, moduleNames) ?? "";
        return `${plan.title} ${moduleLabel}`.toLowerCase().includes(term);
      })
      .sort(
        (a, b) =>
          a.date_weekly.localeCompare(b.date_weekly) ||
          (a.date_weekly_end ?? a.date_weekly).localeCompare(b.date_weekly_end ?? b.date_weekly) ||
          a.created_at.localeCompare(b.created_at),
      );
  }, [activePlans, searchTerm, statusFilter, weekStart, weekEnd, moduleNames]);

  const totalPages = Math.max(1, Math.ceil(filteredPlans.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPlans = filteredPlans.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const statusOptionsFor = (plan: WeeklyPlan) => {
    if (canEdit(plan)) {
      return WEEKLY_PLAN_STATUSES.filter((option) => option.value !== "completed");
    }
    if (isAssigneeOnly(plan) && plan.status === "pending") {
      return WEEKLY_PLAN_STATUSES.filter(
        (option) => option.value === "pending" || option.value === "in progress",
      );
    }
    if (isAssigneeOnly(plan) && plan.status === "revision") {
      return WEEKLY_PLAN_STATUSES.filter(
        (option) => option.value === "revision" || option.value === "in progress",
      );
    }
    if (isAssigneeOnly(plan) && plan.status === "in progress") {
      return WEEKLY_PLAN_STATUSES.filter(
        (option) => option.value === "in progress" || option.value === "done",
      );
    }
    return [];
  };

  const requestStatusChange = (plan: WeeklyPlan, next: WeeklyPlanStatus) => {
    if (next === plan.status) return;
    setStatusTarget({ plan, next });
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    const { plan, next, feedback } = statusTarget;
    const hasFeedback = Boolean(feedback && (feedback.message || feedback.files.length > 0));
    setStatusSaving(true);
    let insertedId: number | null = null;
    const uploadedPaths: string[] = [];
    if (feedback && hasFeedback) {
      try {
        for (const file of feedback.files) {
          uploadedPaths.push(await uploadTaskFeedbackFile(supabase, viewer.id, file));
        }
        const { data, error } = await supabase
          .from("task_feedback")
          .insert({ task_id: plan.id, feedback: feedback.message || null, file_paths: uploadedPaths })
          .select("id")
          .single();
        if (error) throw error;
        insertedId = data.id;
      } catch (error) {
        console.error(error);
        await removeTaskFeedbackFiles(supabase, uploadedPaths);
        toast.error("Could not save the feedback. Please try again.");
        setStatusSaving(false);
        setStatusTarget(null);
        return;
      }
    }
    const previous = plan.status;
    setPlans((prev) => prev.map((item) => (item.id === plan.id ? { ...item, status: next } : item)));
    try {
      const fields = canEdit(plan)
        ? { status: next, updated_by: viewer.id, updated_at: new Date().toISOString() }
        : { status: next };
      const { error } = await supabase.from("weekly_plans").update(fields).eq("id", plan.id);
      if (error) throw error;
      toast.success(hasFeedback ? "Task marked as done with your feedback." : "Status updated.");
      router.refresh();
      if (hasFeedback) setViewPlanId(null);
    } catch (error) {
      console.error(error);
      setPlans((prev) => prev.map((item) => (item.id === plan.id ? { ...item, status: previous } : item)));
      if (insertedId !== null) {
        const { error: deleteError } = await supabase.from("task_feedback").delete().eq("id", insertedId);
        if (deleteError) console.error(deleteError);
      }
      await removeTaskFeedbackFiles(supabase, uploadedPaths);
      toast.error("Could not update the status. Please try again.");
    } finally {
      setStatusSaving(false);
      setStatusTarget(null);
    }
  };

  const inputClass =
    "px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)]/30 font-medium bg-white dark:bg-slate-800 dark:text-white transition-colors";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search title or module..."
            className={`${inputClass} w-full pl-10`}
          />
        </div>
        <div className="w-full sm:w-64 shrink-0">
          <DateRangeField
            start={weekStart}
            end={weekEnd}
            onChange={(start, end) => {
              setWeekStart(start);
              setWeekEnd(end);
              setCurrentPage(1);
            }}
            placeholder="All weeks"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className={inputClass}
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          {WEEKLY_PLAN_STATUSES.filter(
            (option) => option.value !== "done" && option.value !== "completed",
          ).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="font-bold">{filteredPlans.length}</span>{" "}
          {filteredPlans.length === 1 ? "task" : "tasks"} assigned to you
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        {filteredPlans.length === 0 ? (
          <p className="p-10 text-center text-sm font-medium text-slate-500 dark:text-slate-400 italic">
            {plans.length === 0
              ? "No tasks assigned to you yet."
              : activePlans.length === 0
                ? "All your tasks are done. Find them in Done Tasks."
                : "No tasks match your filters."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3.5">Task</th>
                  <th className="px-5 py-3.5">Module</th>
                  <th className="px-5 py-3.5">Date range</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Last update</th>
                  <th className="px-5 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPlans.map((plan) => {
                  const meta = weeklyPlanStatusMeta(plan.status);
                  const moduleLabel = weeklyPlanModuleLabel(plan.module, moduleNames);
                  const moduleProject = plan.module ? moduleProjects[plan.module] ?? "" : "";
                  const options = statusOptionsFor(plan);
                  const advance: WeeklyPlanStatus | null =
                    plan.assigned_personnel === viewer.id
                      ? plan.status === "pending" || plan.status === "revision"
                        ? "in progress"
                        : plan.status === "in progress"
                          ? "done"
                          : null
                      : null;
                  return (
                    <tr
                      key={plan.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setViewPlanId(plan.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setViewPlanId(plan.id);
                        }
                      }}
                      className="border-b last:border-0 border-gray-50 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800/40"
                    >
                      <td className="px-5 py-3.5 max-w-64">
                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{plan.title}</p>
                        {plan.description && (
                          <p className="text-xs font-medium text-slate-400 truncate mt-0.5">{plan.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 max-w-48">
                        {moduleLabel ? (
                          <>
                            <p className="font-semibold text-slate-700 dark:text-slate-300 truncate">{moduleLabel}</p>
                            {moduleProject && (
                              <p className="text-xs font-medium text-slate-400 truncate mt-0.5">{moduleProject}</p>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-slate-600 dark:text-slate-300">
                        {weeklyPlanWeekRange(plan.date_weekly, plan.date_weekly_end ?? undefined)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${meta.badge}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {plan.updated_at ? (
                          <>
                            {formatTimestamp(plan.updated_at)}
                            <span className="block text-[10px] font-medium text-slate-400 mt-0.5">
                              by {nameOf(plan.updated_by)}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {advance ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              requestStatusChange(plan, advance);
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[var(--sys-primary)] hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap"
                          >
                            {advance === "in progress"
                              ? plan.status === "revision"
                                ? "Start Rework"
                                : "Start Task"
                              : "Mark as Done"}
                          </button>
                        ) : options.length > 0 ? (
                          <div
                            className="relative inline-block"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <select
                              value={plan.status}
                              onChange={(e) =>
                                requestStatusChange(plan, e.target.value as WeeklyPlanStatus)
                              }
                              aria-label={`Status of ${plan.title}`}
                              className={`appearance-none pl-2.5 pr-6 py-1 rounded-full border text-[11px] font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)]/30 transition-colors ${meta.badge}`}
                            >
                              {options.map((option) => (
                                <option
                                  key={option.value}
                                  value={option.value}
                                  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                                >
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <svg
                              className="pointer-events-none absolute right-2 top-1/2 h-2.5 w-2.5 -translate-y-1/2 opacity-60"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {filteredPlans.length > 0 && (
          <TablePagination
            totalItems={filteredPlans.length}
            currentPage={safePage}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {statusTarget && (
        <ConfirmStatusDialog
          title={statusTarget.plan.title}
          next={statusTarget.next}
          irreversible={!canEdit(statusTarget.plan)}
          busy={statusSaving}
          onCancel={() => setStatusTarget(null)}
          onConfirm={() => void confirmStatusChange()}
        />
      )}

      {viewPlan && (
        <WeeklyPlanDrawer
          mode="view"
          plan={viewPlan}
          people={people}
          modules={[]}
          moduleNames={moduleNames}
          moduleProjects={moduleProjects}
          viewerId={viewer.id}
          onClose={() => setViewPlanId(null)}
          onSaved={() => router.refresh()}
          statusOptions={statusOptionsFor(viewPlan).map((option) => option.value)}
          onStatusChange={(next) => requestStatusChange(viewPlan, next)}
          onMarkDoneWithFeedback={
            viewPlan.assigned_personnel === viewer.id && viewPlan.status === "in progress"
              ? (message, files) => setStatusTarget({ plan: viewPlan, next: "done", feedback: { message, files } })
              : undefined
          }
        />
      )}
    </div>
  );
}