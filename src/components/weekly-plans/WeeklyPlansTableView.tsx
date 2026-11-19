"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { weeklyPlanModuleLabel, weeklyPlanWeekRange } from "@/lib/weeklyPlans";
import {
  weeklyPlanStatusMeta,
  type WeeklyPlan,
  type WeeklyPlanStatus,
} from "@/types/weeklyPlan";

interface WeeklyPlansTableViewProps {
  weekGroups: [string, WeeklyPlan[]][];
  moduleNames: Record<string, string>;
  moduleProjects: Record<string, string>;
  nameOf: (id: string | null) => string;
  firstWord: (name: string) => string;
  canEdit: (plan: WeeklyPlan) => boolean;
  canDelete: (plan: WeeklyPlan) => boolean;
  isAssigneeOnly: (plan: WeeklyPlan) => boolean;
  isSuperAdmin: boolean;
  onSelectPlan: (plan: WeeklyPlan) => void;
  onEditPlan: (plan: WeeklyPlan) => void;
  onDeletePlan: (plan: WeeklyPlan) => void;
  onStatusChange: (plan: WeeklyPlan, next: WeeklyPlanStatus) => void;
  statusOptionsFor: (plan: WeeklyPlan) => { value: WeeklyPlanStatus; label: string }[];
  onCreatePlanForWeek?: (range: { start: string; end: string }) => void;
  // Drag & drop support
  onDragStartPlan?: (plan: WeeklyPlan, e: React.DragEvent) => void;
  onDragEndPlan?: () => void;
  onDropOnWeek?: (weekKey: string) => void;
  draggingPlan?: WeeklyPlan | null;
  dragOverWeek?: string | null;
  setDragOverWeek?: (weekKey: string | null) => void;
}

function splitGroupKey(key: string): [string, string] {
  const [start, end] = key.split("|");
  return [start, end ?? ""];
}

// Generates 2-letter initials (e.g. "Mark Quezon" -> "MQ")
function getInitials(name: string) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function WeeklyPlansTableView({
  weekGroups,
  moduleNames,
  moduleProjects,
  nameOf,
  firstWord,
  canEdit,
  canDelete,
  isAssigneeOnly,
  isSuperAdmin,
  onSelectPlan,
  onEditPlan,
  onDeletePlan,
  onStatusChange,
  statusOptionsFor,
  onCreatePlanForWeek,
  onDragStartPlan,
  onDragEndPlan,
  onDropOnWeek,
  draggingPlan,
  dragOverWeek,
  setDragOverWeek,
}: WeeklyPlansTableViewProps) {
  // Collapsed week sections state
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<string, boolean>>({});

  // Active status dropdown state: planId currently open
  const [openStatusDropdownPlanId, setOpenStatusDropdownPlanId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close status dropdown when clicking outside
  useEffect(() => {
    if (openStatusDropdownPlanId === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenStatusDropdownPlanId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openStatusDropdownPlanId]);

  const toggleGroupCollapse = (weekKey: string) => {
    setCollapsedWeeks((prev) => ({
      ...prev,
      [weekKey]: !prev[weekKey],
    }));
  };

  if (weekGroups.length === 0) {
    return null;
  }

  return (
    <div className="w-full flex flex-col space-y-5">
      {weekGroups.map(([weekKey, weekPlans]) => {
        const [weekStart, weekEnd] = splitGroupKey(weekKey);
        const isCollapsed = Boolean(collapsedWeeks[weekKey]);
        const isDragOver = dragOverWeek === weekKey;
        const weekLabel = weeklyPlanWeekRange(weekStart, weekEnd || undefined);

        return (
          <div
            key={weekKey}
            onDragOver={(e) => {
              if (!draggingPlan || !canEdit(draggingPlan)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dragOverWeek !== weekKey && setDragOverWeek) {
                setDragOverWeek(weekKey);
              }
            }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              if (setDragOverWeek) setDragOverWeek(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (onDropOnWeek) {
                onDropOnWeek(weekKey);
              }
            }}
            className={`w-full rounded-2xl bg-white dark:bg-[#0c0d12] shadow-sm transition-all duration-150 ${
              isDragOver
                ? "border-2 border-[var(--sys-primary)] ring-4 ring-[var(--sys-primary)]/20 shadow-md"
                : "border border-gray-200 dark:border-slate-800"
            }`}
          >
            {/* Week Group Header */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleGroupCollapse(weekKey)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleGroupCollapse(weekKey);
                }
              }}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50/80 dark:bg-slate-900/60 select-none cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/40 transition-colors rounded-t-2xl"
            >
              <div className="flex items-center gap-3">
                {/* Chevron toggle icon */}
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    isCollapsed ? "-rotate-90" : "rotate-0"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>

                {/* Week Label Pill */}
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black tracking-wide bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  {weekLabel}
                </span>

                {/* Count Pill */}
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                  {weekPlans.length} {weekPlans.length === 1 ? "task" : "tasks"}
                </span>
              </div>

              {/* Header Right: Quick "+ Add Task" button */}
              {onCreatePlanForWeek && (
                <div onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onCreatePlanForWeek({ start: weekStart, end: weekEnd })}
                    title={`Add task for ${weekLabel}`}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-white hover:bg-[var(--sys-primary)] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Week Task Rows */}
            {!isCollapsed && (
              <div className="divide-y divide-gray-100 dark:divide-slate-800/70">
                {weekPlans.length === 0 ? (
                  <div className="px-6 py-6 text-center text-xs font-medium text-slate-400 italic">
                    {isDragOver ? "Drop task here to move to this week" : "No tasks for this week."}
                  </div>
                ) : (
                  weekPlans.map((plan) => {
                    const meta = weeklyPlanStatusMeta(plan.status);
                    const moduleLabel = weeklyPlanModuleLabel(plan.module, moduleNames);
                    const moduleProject = plan.module ? moduleProjects[plan.module] ?? "" : "";
                    const assignedName = plan.assigned_personnel
                      ? nameOf(plan.assigned_personnel)
                      : null;
                    const initials = assignedName ? getInitials(assignedName) : "—";
                    const attachmentCount = plan.document_attachments?.length ?? 0;
                    const editable = canEdit(plan);
                    const deletable = canDelete(plan);
                    const draggable = editable;
                    const isBeingDragged = draggingPlan?.id === plan.id;
                    const options = statusOptionsFor(plan);
                    const canChangeStatus = options.length > 0;
                    const isDropdownOpen = openStatusDropdownPlanId === plan.id;

                    return (
                      <div
                        key={plan.id}
                        role="button"
                        tabIndex={0}
                        draggable={draggable}
                        onDragStart={(e) => {
                          if (onDragStartPlan) onDragStartPlan(plan, e);
                        }}
                        onDragEnd={() => {
                          if (onDragEndPlan) onDragEndPlan();
                        }}
                        onClick={() => onSelectPlan(plan)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectPlan(plan);
                          }
                        }}
                        className={`group flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors select-none ${
                          draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                        } ${isBeingDragged ? "opacity-40" : ""}`}
                      >
                        {/* Left: Drag grip + Clickable Target Dot + Title + Description icon + Attachment icon */}
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                          {/* Drag handle */}
                          {draggable && (
                            <span
                              title="Drag to move to another week"
                              className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400 transition-colors cursor-grab"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="9" cy="6" r="1.6" />
                                <circle cx="15" cy="6" r="1.6" />
                                <circle cx="9" cy="12" r="1.6" />
                                <circle cx="15" cy="12" r="1.6" />
                                <circle cx="9" cy="18" r="1.6" />
                                <circle cx="15" cy="18" r="1.6" />
                              </svg>
                            </span>
                          )}

                          {/* Clickable Target / Status Dot with Dropdown Menu */}
                          <div
                            className="relative shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (!canChangeStatus) return;
                                setOpenStatusDropdownPlanId(isDropdownOpen ? null : plan.id);
                              }}
                              disabled={!canChangeStatus}
                              title={
                                canChangeStatus
                                  ? `Status: ${meta.label}. Click to change status`
                                  : `Status: ${meta.label}`
                              }
                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                canChangeStatus
                                  ? "cursor-pointer hover:scale-110 hover:ring-2 hover:ring-[var(--sys-primary)]/40 active:scale-95"
                                  : "cursor-default"
                              }`}
                              style={{
                                borderColor: `${meta.dot}70`,
                                backgroundColor: `${meta.dot}18`,
                                borderWidth: 1,
                              }}
                            >
                              <div
                                className="w-2 h-2 rounded-full transition-transform"
                                style={{ backgroundColor: meta.dot }}
                              />
                            </button>

                            {/* Dropdown Menu for selecting Status */}
                            {isDropdownOpen && (
                              <div
                                ref={dropdownRef}
                                className="absolute left-0 top-full mt-2 z-50 min-w-44 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
                              >
                                <div className="px-3 py-1.5 border-b border-gray-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Change Status
                                </div>
                                <div className="py-1">
                                  {options.map((option) => {
                                    const optMeta = weeklyPlanStatusMeta(option.value);
                                    const isCurrent = option.value === plan.status;
                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                          setOpenStatusDropdownPlanId(null);
                                          onStatusChange(plan, option.value);
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                                          isCurrent
                                            ? "text-slate-900 dark:text-white font-bold bg-slate-50 dark:bg-slate-800/60"
                                            : "text-slate-600 dark:text-slate-300"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: optMeta.dot }}
                                          />
                                          <span>{option.label}</span>
                                        </div>
                                        {isCurrent && (
                                          <svg className="w-3.5 h-3.5 text-[var(--sys-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Title & optional Module / Status Pill context */}
                          <div className="min-w-0 flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-[var(--sys-primary)] transition-colors">
                              {plan.title}
                            </span>

                            {/* Status Pill Badge */}
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${meta.badge}`}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: meta.dot }}
                              />
                              {meta.label}
                            </span>

                            {/* Module tag if present */}
                            {moduleLabel && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md truncate max-w-44">
                                <span>{moduleLabel}</span>
                                {moduleProject && (
                                  <span className="opacity-60 text-[10px]">({moduleProject})</span>
                                )}
                              </span>
                            )}

                            {/* Description note icon */}
                            {plan.description && (
                              <span
                                title={plan.description}
                                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                </svg>
                              </span>
                            )}

                            {/* Attachment paperclip icon */}
                            {attachmentCount > 0 && (
                              <span
                                title={`${attachmentCount} attachment${attachmentCount > 1 ? "s" : ""}`}
                                className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-[11px]"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                  />
                                </svg>
                                <span>{attachmentCount}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Actions + Assignee Avatar Pill */}
                        <div
                          className="flex items-center gap-3 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Quick edit / delete buttons shown on hover */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {editable && (
                              <button
                                type="button"
                                onClick={() => onEditPlan(plan)}
                                aria-label={`Edit ${plan.title}`}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                  />
                                </svg>
                              </button>
                            )}
                            {deletable && (
                              <button
                                type="button"
                                onClick={() => onDeletePlan(plan)}
                                aria-label={`Delete ${plan.title}`}
                                className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>

                          {/* Assignee Circle with Initials */}
                          <div
                            title={assignedName ? `Assigned to: ${assignedName}` : "Unassigned"}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold tracking-tight shadow-xs ${
                              assignedName
                                ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                                : "border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500"
                            }`}
                          >
                            {initials}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* "+ Add Task" bottom row */}
                {onCreatePlanForWeek && (
                  <div className="px-6 py-2.5 bg-slate-50/40 dark:bg-slate-900/30 rounded-b-2xl">
                    <button
                      type="button"
                      onClick={() => onCreatePlanForWeek({ start: weekStart, end: weekEnd })}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Add Task</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
