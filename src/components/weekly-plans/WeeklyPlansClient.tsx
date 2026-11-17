"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { requestRefresh } from "@/lib/coalescedRefresh";
import { toast } from "sonner";
import {
  removeWeeklyPlanFiles,
  weeklyPlanModuleLabel,
  weeklyPlanWeekRange,
} from "@/lib/weeklyPlans";
import WeeklyPlanDrawer, { type DrawerMode } from "./WeeklyPlanDrawer";
import DateRangeField from "./DateRangeField";
import ConfirmStatusDialog from "./ConfirmStatusDialog";
import {
  WEEKLY_PLAN_STATUSES,
  weeklyPlanStatusMeta,
  type WeeklyPlan,
  type WeeklyPlanModule,
  type WeeklyPlanPerson,
  type WeeklyPlanStatus,
} from "@/types/weeklyPlan";

interface WeeklyPlansClientProps {
  initialPlans: WeeklyPlan[];
  people: WeeklyPlanPerson[];
  modules: WeeklyPlanModule[];
  moduleNames: Record<string, string>;
  moduleProjects: Record<string, string>;
  viewer: { id: string; role: string };
}

function groupKeyOf(plan: WeeklyPlan) {
  return `${plan.date_weekly}|${plan.date_weekly_end ?? ""}`;
}

function splitGroupKey(key: string): [string, string] {
  const [start, end] = key.split("|");
  return [start, end ?? ""];
}

function firstWord(name: string) {
  return name.trim().split(/\s+/)[0] || name;
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

export default function WeeklyPlansClient({
  initialPlans,
  people,
  modules,
  moduleNames,
  moduleProjects,
  viewer,
}: WeeklyPlansClientProps) {
  const [plans, setPlans] = useState(initialPlans);
  const [syncedPlans, setSyncedPlans] = useState(initialPlans);
  if (initialPlans !== syncedPlans) {
    setSyncedPlans(initialPlans);
    setPlans(initialPlans);
  }

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [weekFilter, setWeekFilter] = useState("all");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [drawer, setDrawer] = useState<{
    mode: DrawerMode;
    plan: WeeklyPlan | null;
    range?: { start: string; end: string };
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WeeklyPlan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{ plan: WeeklyPlan; next: WeeklyPlanStatus } | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [dragging, setDragging] = useState<WeeklyPlan | null>(null);
  const [dragOverWeek, setDragOverWeek] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isSliding, setIsSliding] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const slideState = useRef<{ startX: number; scrollLeft: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const supabase = createClient();
  const router = useRouter();
  const isSuperAdmin = viewer.role === "super_admin";

  // Realtime: any weekly_plans change re-fetches the server data, so other viewers see it without reloading
  useEffect(() => {
    const channel = supabase
      .channel("weekly-plans-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "weekly_plans" }, () => {
        requestRefresh(router.refresh); // one shared refresh for all listeners (lib/coalescedRefresh)
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

  // The native drag ghost is browser-dimmed and cannot be styled, so track the
  // cursor during the drag and render our own full-opacity clone instead.
  useEffect(() => {
    if (!dragging) return;
    const move = (e: DragEvent) => setDragPos({ x: e.clientX, y: e.clientY });
    document.addEventListener("dragover", move);
    return () => document.removeEventListener("dragover", move);
  }, [dragging]);

  const creatorOptions = useMemo(() => {
    const ids = [...new Set(plans.map((plan) => plan.created_by))];
    return ids
      .map((id) => ({ id, name: peopleById.get(id) ?? "Unknown user" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [plans, peopleById]);

  const canEdit = (plan: WeeklyPlan) => plan.created_by === viewer.id || isSuperAdmin;
  const canDelete = (plan: WeeklyPlan) => plan.created_by === viewer.id || isSuperAdmin;
  const isAssigneeOnly = (plan: WeeklyPlan) =>
    plan.assigned_personnel === viewer.id && plan.created_by !== viewer.id;
  const modalPlan = drawer?.plan
    ? plans.find((plan) => plan.id === drawer.plan!.id) ?? drawer.plan
    : null;

  const [weekFilterStart, weekFilterEnd] =
    weekFilter === "all" ? ["", ""] : splitGroupKey(weekFilter);

  const filteredPlans = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const nameFor = (id: string) => peopleById.get(id) ?? "Unknown user";
    return plans.filter((plan) => {
      if (statusFilter !== "all" && plan.status !== statusFilter) return false;
      if (weekFilter !== "all" && groupKeyOf(plan) !== weekFilter) return false;
      if (creatorFilter !== "all" && plan.created_by !== creatorFilter) return false;
      if (scopeFilter === "mine" && plan.created_by !== viewer.id) return false;
      if (scopeFilter === "assigned" && plan.assigned_personnel !== viewer.id) return false;
      if (!term) return true;
      return [
        plan.title,
        plan.module ? moduleNames[plan.module] ?? "" : "",
        plan.description ?? "",
        plan.assigned_personnel ? nameFor(plan.assigned_personnel) : "",
        nameFor(plan.created_by),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [plans, searchTerm, statusFilter, weekFilter, creatorFilter, scopeFilter, viewer.id, peopleById, moduleNames]);

  const weekGroups = useMemo(() => {
    const groups = new Map<string, WeeklyPlan[]>();
    for (const plan of filteredPlans) {
      const key = groupKeyOf(plan);
      const list = groups.get(key);
      if (list) list.push(plan);
      else groups.set(key, [plan]);
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredPlans]);

  const statusOptionsFor = (plan: WeeklyPlan) => {
    if (canEdit(plan)) return WEEKLY_PLAN_STATUSES;
    if (isAssigneeOnly(plan) && plan.status === "pending") {
      return WEEKLY_PLAN_STATUSES.filter(
        (option) => option.value === "pending" || option.value === "in progress",
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
    setStatusSaving(true);
    await handleStatusChange(statusTarget.plan, statusTarget.next);
    setStatusSaving(false);
    setStatusTarget(null);
  };

  const handleStatusChange = async (plan: WeeklyPlan, next: WeeklyPlanStatus) => {
    if (next === plan.status) return;
    const previous = plan.status;
    setPlans((prev) => prev.map((item) => (item.id === plan.id ? { ...item, status: next } : item)));
    try {
      // Assignees may only move pending -> in progress -> done, so audit columns are sent by the creator/admin only.
      const fields = canEdit(plan)
        ? { status: next, updated_by: viewer.id, updated_at: new Date().toISOString() }
        : { status: next };
      const { error } = await supabase.from("weekly_plans").update(fields).eq("id", plan.id);
      if (error) throw error;
      toast.success("Status updated.");
      router.refresh();
    } catch (error) {
      console.error(error);
      setPlans((prev) => prev.map((item) => (item.id === plan.id ? { ...item, status: previous } : item)));
      toast.error("Could not update the status. Please try again.");
    }
  };

  const handleMarkDone = (plan: WeeklyPlan) => requestStatusChange(plan, "done");

  const handleMarkDoneFromModal = (plan: WeeklyPlan) => {
    setDrawer(null);
    void handleMarkDone(plan);
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

  const handleDrop = async (weekKey: string) => {
    const plan = dragging;
    setDragging(null);
    setDragOverWeek(null);
    setDragPos(null);
    if (!plan || !canEdit(plan)) return;
    const [targetStart, targetEnd] = splitGroupKey(weekKey);
    if (plan.date_weekly === targetStart && (plan.date_weekly_end ?? "") === targetEnd) return;
    const previousStart = plan.date_weekly;
    const previousEnd = plan.date_weekly_end ?? "";
    setPlans((prev) =>
      prev.map((item) =>
        item.id === plan.id
          ? { ...item, date_weekly: targetStart, date_weekly_end: targetEnd || null }
          : item,
      ),
    );
    try {
      const { error } = await supabase
        .from("weekly_plans")
        .update({
          date_weekly: targetStart,
          date_weekly_end: targetEnd || null,
          updated_by: viewer.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", plan.id);
      if (error) throw error;
      toast.success(`Task moved to ${weeklyPlanWeekRange(targetStart, targetEnd || undefined)}.`);
      router.refresh();
    } catch (error) {
      console.error(error);
      setPlans((prev) =>
        prev.map((item) =>
          item.id === plan.id
            ? { ...item, date_weekly: previousStart, date_weekly_end: previousEnd || null }
            : item,
        ),
      );
      toast.error("Could not move this task. Please try again.");
    }
  };

  const inputClass =
    "px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)]/30 font-medium bg-white dark:bg-slate-800 dark:text-white transition-colors";

  const slideBy = (direction: number) => {
    trackRef.current?.scrollBy({ left: direction * 400, behavior: "smooth" });
  };

  const endSlide = () => {
    if (slideState.current?.moved) suppressClick.current = true;
    slideState.current = null;
    setIsSliding(false);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
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
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search title, module, people..."
            className={`${inputClass} w-full pl-10`}
          />
        </div>

        <div className="w-full sm:w-64 shrink-0">
          <DateRangeField
            start={weekFilterStart}
            end={weekFilterEnd}
            onChange={(start, end) => setWeekFilter(start ? `${start}|${end}` : "all")}
            placeholder="All weeks"
          />
        </div>

        <select
          value={creatorFilter}
          onChange={(e) => setCreatorFilter(e.target.value)}
          className={inputClass}
          aria-label="Filter by creator"
        >
          <option value="all">All Creators</option>
          {creatorOptions.map((creator) => (
            <option key={creator.id} value={creator.id}>
              {creator.name}
            </option>
          ))}
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
          <option value="all">All Statuses</option>
          {WEEKLY_PLAN_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} className={inputClass}>
          <option value="all">All Plans</option>
          <option value="mine">Created by me</option>
          <option value="assigned">Assigned to me</option>
        </select>
      </div>

      {weekGroups.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm p-10 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 italic">
            {plans.length === 0
              ? "No weekly plans yet. Create one to get started."
              : "No plans match your filters."}
          </p>
        </div>
      ) : (
        <div className="flex flex-1 min-h-64 flex-col space-y-2">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => slideBy(-1)}
              aria-label="Slide to previous weeks"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => slideBy(1)}
              aria-label="Slide to next weeks"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
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
          <div
            ref={trackRef}
            onPointerDown={(e) => {
              if (e.pointerType !== "mouse" || e.button !== 0) return;
              const el = trackRef.current;
              if (!el) return;
              slideState.current = { startX: e.clientX, scrollLeft: el.scrollLeft, moved: false };
            }}
            onPointerMove={(e) => {
              const state = slideState.current;
              const el = trackRef.current;
              if (!state || !el) return;
              const dx = e.clientX - state.startX;
              if (!state.moved) {
                if (Math.abs(dx) < 6) return;
                state.moved = true;
                setIsSliding(true);
                el.setPointerCapture(e.pointerId);
              }
              el.scrollLeft = state.scrollLeft - dx;
            }}
            onPointerUp={endSlide}
            onPointerCancel={endSlide}
            onClickCapture={(e) => {
              if (suppressClick.current) {
                suppressClick.current = false;
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            className={`flex flex-1 min-h-0 items-start gap-4 overflow-x-auto pb-2 ${
              isSliding ? "cursor-grabbing select-none" : "cursor-grab"
            }`}
          >
          {weekGroups.map(([weekKey, weekPlans]) => {
            const [weekStart, weekEnd] = splitGroupKey(weekKey);
            return (
            <div
              key={weekKey}
              onDragOver={(e) => {
                if (!dragging || !canEdit(dragging)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverWeek !== weekKey) setDragOverWeek(weekKey);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDragOverWeek(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                void handleDrop(weekKey);
              }}
              className={`w-80 sm:w-96 shrink-0 max-h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm flex flex-col transition-all ${
                dragOverWeek === weekKey
                  ? "border-2 border-[var(--sys-primary)] ring-2 ring-[var(--sys-primary)]/20 -translate-y-0.5"
                  : "border border-gray-100 dark:border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-gray-100 dark:border-slate-800">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Week of</p>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                    {weeklyPlanWeekRange(weekStart, weekEnd || undefined)}
                  </h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
                    {weekPlans.length} {weekPlans.length === 1 ? "task" : "tasks"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDrawer({ mode: "create", plan: null, range: { start: weekStart, end: weekEnd } })
                    }
                    aria-label={`Add a plan to the week of ${weeklyPlanWeekRange(weekStart, weekEnd || undefined)}`}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--sys-primary)] text-white hover:opacity-90 transition-opacity shadow-sm"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-3 space-y-2 min-h-0 flex-1 overflow-y-auto">
                {weekPlans.map((plan) => {
                  const meta = weeklyPlanStatusMeta(plan.status);
                  const attachments = plan.document_attachments ?? [];
                  const moduleLabel = weeklyPlanModuleLabel(plan.module, moduleNames);
                  const draggable = canEdit(plan);
                  return (
                    <div
                      key={plan.id}
                      role="button"
                      tabIndex={0}
                      draggable={draggable}
                      onClick={() => setDrawer({ mode: "view", plan })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setDrawer({ mode: "view", plan });
                        }
                      }}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", String(plan.id));
                        e.dataTransfer.effectAllowed = "move";
                        const ghost = new Image();
                        ghost.src =
                          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                        e.dataTransfer.setDragImage(ghost, 0, 0);
                        slideState.current = null;
                        setIsSliding(false);
                        setDragging(plan);
                        setDragPos({ x: e.clientX, y: e.clientY });
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setDragOverWeek(null);
                        setDragPos(null);
                      }}
                      className={`group rounded-xl border border-gray-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 transition-colors hover:border-[var(--sys-primary)]/40 hover:bg-white dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)]/30 ${
                        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                      } ${dragging && dragging.id !== plan.id ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-2">
                          {plan.title}
                        </p>
                        {statusOptionsFor(plan).length > 0 ? (
                          <div
                            className="relative shrink-0"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <select
                              value={plan.status}
                              onChange={(e) =>
                                requestStatusChange(plan, e.target.value as WeeklyPlanStatus)
                              }
                              aria-label={`Status of ${plan.title}`}
                              className={`appearance-none pl-2 pr-5 py-0.5 rounded-full border text-[10px] font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)]/30 transition-colors ${meta.badge}`}
                            >
                              {statusOptionsFor(plan).map((option) => (
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
                              className="pointer-events-none absolute right-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 opacity-60"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${meta.badge}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
                            {meta.label}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span className="basis-full truncate">
                          Assigned To: {plan.assigned_personnel ? firstWord(nameOf(plan.assigned_personnel)) : "Unassigned"}
                        </span>
                        {isSuperAdmin && (
                          <span className="basis-full truncate">
                            Created by: {firstWord(nameOf(plan.created_by))}
                          </span>
                        )}
                        {moduleLabel && (
                          <span className="truncate max-w-[9rem]">{moduleLabel}</span>
                        )}
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
                        {draggable && (
                          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="9" cy="6" r="1.6" />
                              <circle cx="15" cy="6" r="1.6" />
                              <circle cx="9" cy="12" r="1.6" />
                              <circle cx="15" cy="12" r="1.6" />
                              <circle cx="9" cy="18" r="1.6" />
                              <circle cx="15" cy="18" r="1.6" />
                            </svg>
                            Drag to another week
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
          </div>
        </div>
      )}

      {drawer && (
        <WeeklyPlanDrawer
          key={`${drawer.mode}-${drawer.plan?.id ?? "new"}-${drawer.range?.start ?? ""}`}
          mode={drawer.mode}
          plan={modalPlan}
          initialRange={drawer.range}
          people={people}
          modules={modules}
          moduleNames={moduleNames}
          moduleProjects={moduleProjects}
          viewerId={viewer.id}
          onClose={() => setDrawer(null)}
          onSaved={() => router.refresh()}
          onEdit={modalPlan && canEdit(modalPlan) ? () => setDrawer({ mode: "edit", plan: modalPlan }) : undefined}
          onDelete={
            modalPlan && canDelete(modalPlan)
              ? () => {
                  setDeleteTarget(modalPlan);
                  setDrawer(null);
                }
              : undefined
          }
          onMarkDone={
            modalPlan && isAssigneeOnly(modalPlan) && modalPlan.status === "in progress"
              ? () => handleMarkDoneFromModal(modalPlan)
              : undefined
          }
          statusOptions={modalPlan ? statusOptionsFor(modalPlan).map((option) => option.value) : undefined}
          onStatusChange={
            modalPlan ? (next) => requestStatusChange(modalPlan, next) : undefined
          }
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

      {dragging && dragPos &&
        createPortal(
          <div
            className="fixed z-[120] w-80 pointer-events-none -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--sys-primary)] bg-white dark:bg-slate-800 px-3 py-2.5 shadow-2xl"
            style={{ left: dragPos.x, top: dragPos.y }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-2">
                {dragging.title}
              </p>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${weeklyPlanStatusMeta(dragging.status).badge}`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: weeklyPlanStatusMeta(dragging.status).dot }}
                />
                {weeklyPlanStatusMeta(dragging.status).label}
              </span>
            </div>
            <div className="mt-1.5 space-y-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <p className="truncate">
                Assigned To: {dragging.assigned_personnel ? firstWord(nameOf(dragging.assigned_personnel)) : "Unassigned"}
              </p>
              {isSuperAdmin && (
                <p className="truncate">Created by: {firstWord(nameOf(dragging.created_by))}</p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
