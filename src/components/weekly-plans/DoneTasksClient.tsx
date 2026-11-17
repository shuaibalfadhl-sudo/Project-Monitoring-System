"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { requestRefresh } from "@/lib/coalescedRefresh";
import { toast } from "sonner";
import { weeklyPlanModuleLabel, weeklyPlanWeekRange } from "@/lib/weeklyPlans";
import {
  WEEKLY_PLAN_STATUSES,
  weeklyPlanStatusMeta,
  type WeeklyPlan,
  type WeeklyPlanPerson,
  type WeeklyPlanStatus,
} from "@/types/weeklyPlan";
import WeeklyPlanDrawer from "./WeeklyPlanDrawer";
import ConfirmStatusDialog from "./ConfirmStatusDialog";
import TablePagination from "./TablePagination";

interface DoneTasksClientProps {
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

export default function DoneTasksClient({
  initialPlans,
  people,
  moduleNames,
  moduleProjects,
  viewer,
}: DoneTasksClientProps) {
  const [plans, setPlans] = useState(initialPlans);
  const [syncedPlans, setSyncedPlans] = useState(initialPlans);
  if (initialPlans !== syncedPlans) {
    setSyncedPlans(initialPlans);
    setPlans(initialPlans);
  }

  const [viewPlanId, setViewPlanId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusTarget, setStatusTarget] = useState<{ plan: WeeklyPlan; next: WeeklyPlanStatus } | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const viewPlan = plans.find((plan) => plan.id === viewPlanId) ?? null;

  const supabase = createClient();
  const router = useRouter();
  const isSuperAdmin = viewer.role === "super_admin";
  const canEdit = (plan: WeeklyPlan) => plan.created_by === viewer.id || isSuperAdmin;

  useEffect(() => {
    const channel = supabase
      .channel("done-tasks-realtime")
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

  const donePlans = useMemo(() => plans.filter((plan) => plan.status === "done"), [plans]);

  const totalPages = Math.max(1, Math.ceil(donePlans.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPlans = donePlans.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const requestStatusChange = (plan: WeeklyPlan, next: WeeklyPlanStatus) => {
    if (next === plan.status || !canEdit(plan)) return;
    setStatusTarget({ plan, next });
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    const { plan, next } = statusTarget;
    setStatusSaving(true);
    const previous = plan.status;
    setPlans((prev) => prev.map((item) => (item.id === plan.id ? { ...item, status: next } : item)));
    try {
      const { error } = await supabase
        .from("weekly_plans")
        .update({ status: next, updated_by: viewer.id, updated_at: new Date().toISOString() })
        .eq("id", plan.id);
      if (error) throw error;
      toast.success("Status updated.");
      router.refresh();
    } catch (error) {
      console.error(error);
      setPlans((prev) => prev.map((item) => (item.id === plan.id ? { ...item, status: previous } : item)));
      toast.error("Could not update the status. Please try again.");
    } finally {
      setStatusSaving(false);
      setStatusTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        <span className="font-bold">{donePlans.length}</span> {donePlans.length === 1 ? "task" : "tasks"} marked done
        {isSuperAdmin ? " across all plans" : " you created or were assigned"}
      </p>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        {donePlans.length === 0 ? (
          <p className="p-10 text-center text-sm font-medium text-slate-500 dark:text-slate-400 italic">
            No done tasks yet. Tasks marked done will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3.5">Task</th>
                  <th className="px-5 py-3.5">Assigned to</th>
                  {isSuperAdmin && <th className="px-5 py-3.5">Created by</th>}
                  <th className="px-5 py-3.5">Module</th>
                  <th className="px-5 py-3.5">Date range</th>
                  <th className="px-5 py-3.5">Marked done</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPlans.map((plan) => {
                  const meta = weeklyPlanStatusMeta(plan.status);
                  const moduleLabel = weeklyPlanModuleLabel(plan.module, moduleNames);
                  const moduleProject = plan.module ? moduleProjects[plan.module] ?? "" : "";
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
                      <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-slate-600 dark:text-slate-300">
                        {plan.assigned_personnel ? nameOf(plan.assigned_personnel) : "Unassigned"}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-slate-600 dark:text-slate-300">
                          {nameOf(plan.created_by)}
                        </td>
                      )}
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
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {formatTimestamp(plan.updated_at)}
                        {plan.updated_by && (
                          <span className="block text-[10px] font-medium text-slate-400 mt-0.5">
                            by {nameOf(plan.updated_by)}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {canEdit(plan) ? (
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
                              {WEEKLY_PLAN_STATUSES.map((option) => (
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
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${meta.badge}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
                            {meta.label}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {donePlans.length > 0 && (
          <TablePagination
            totalItems={donePlans.length}
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
          irreversible={false}
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
          statusOptions={canEdit(viewPlan) ? WEEKLY_PLAN_STATUSES.map((option) => option.value) : undefined}
          onStatusChange={canEdit(viewPlan) ? (next) => requestStatusChange(viewPlan, next) : undefined}
        />
      )}
    </div>
  );
}