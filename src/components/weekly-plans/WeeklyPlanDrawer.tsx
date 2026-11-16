"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  WEEKLY_PLAN_ACCEPT,
  isImageWeeklyPlanFile,
  weeklyPlanFileError,
  weeklyPlanFileName,
  weeklyPlanModuleLabel,
  uploadWeeklyPlanFile,
  removeWeeklyPlanFiles,
  weeklyPlanSignedUrl,
  weeklyPlanWeekRange,
} from "@/lib/weeklyPlans";
import {
  WEEKLY_PLAN_STATUSES,
  weeklyPlanStatusMeta,
  type WeeklyPlan,
  type WeeklyPlanModule,
  type WeeklyPlanPerson,
  type WeeklyPlanStatus,
} from "@/types/weeklyPlan";
import SearchableSelectField from "./SearchableSelectField";
import DateRangeField from "./DateRangeField";

export type DrawerMode = "create" | "view" | "edit";

interface WeeklyPlanDrawerProps {
  mode: DrawerMode;
  plan: WeeklyPlan | null;
  people: WeeklyPlanPerson[];
  modules: WeeklyPlanModule[];
  moduleNames: Record<string, string>;
  moduleProjects: Record<string, string>;
  viewerId: string;
  onClose: () => void;
  onSaved: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMarkDone?: () => void;
}

function formatTimestamp(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

export default function WeeklyPlanDrawer({
  mode,
  plan,
  people,
  modules,
  moduleNames,
  moduleProjects,
  viewerId,
  onClose,
  onSaved,
  onEdit,
  onDelete,
  onMarkDone,
}: WeeklyPlanDrawerProps) {
  const supabase = createClient();
  const [assignedPersonnel, setAssignedPersonnel] = useState(plan?.assigned_personnel ?? "");
  const [module, setModule] = useState(plan?.module ?? "");
  const [startDate, setStartDate] = useState(plan?.date_weekly ?? "");
  const [endDate, setEndDate] = useState(plan?.date_weekly_end ?? "");
  const [title, setTitle] = useState(plan?.title ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [status, setStatus] = useState<WeeklyPlanStatus>(plan?.status ?? "pending");
  const [attachments, setAttachments] = useState<string[]>(plan?.document_attachments ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isForm = mode !== "view";
  const nameOf = (id: string | null) =>
    people.find((person) => person.id === id)?.full_name || "Unknown user";

  const moduleOptions = modules.map((item) => ({
    value: item.id,
    label: `${item.name} · ${item.projectName}`,
  }));
  if (plan?.module && !moduleOptions.some((option) => option.value === plan.module)) {
    moduleOptions.unshift({ value: plan.module, label: moduleNames[plan.module] ?? "Unknown module" });
  }
  const peopleOptions = people.map((person) => ({
    value: person.id,
    label: person.full_name || person.email || "Unnamed user",
  }));

  useEffect(() => {
    if (mode !== "view" || attachments.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        attachments.map(async (path) => {
          try {
            return [path, await weeklyPlanSignedUrl(supabase, path)] as const;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      setSignedUrls(Object.fromEntries(entries.filter((entry) => entry !== null)));
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, attachments, supabase]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const problem = weeklyPlanFileError(file);
        if (problem) {
          toast.error(problem);
          continue;
        }
        const path = await uploadWeeklyPlanFile(supabase, viewerId, file);
        setAttachments((prev) => [...prev, path]);
      }
    } catch (error) {
      console.error(error);
      toast.error("Could not upload the file. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = async (path: string) => {
    setAttachments((prev) => prev.filter((item) => item !== path));
    if (path.startsWith(`${viewerId}/`)) {
      await removeWeeklyPlanFiles(supabase, [path]);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !startDate) {
      setSubmitAttempted(true);
      toast.error("Title and start date are required.");
      return;
    }
    setSaving(true);
    const fields = {
      assigned_personnel: assignedPersonnel || null,
      module: module || null,
      date_weekly: startDate,
      date_weekly_end: endDate || null,
      title: title.trim(),
      description: description.trim() || null,
      status,
      document_attachments: attachments.length > 0 ? attachments : null,
    };
    try {
      if (mode === "create") {
        const { error } = await supabase
          .from("weekly_plans")
          .insert({ ...fields, created_by: viewerId });
        if (error) throw error;
        toast.success("Weekly plan created.");
      } else if (plan) {
        const { error } = await supabase
          .from("weekly_plans")
          .update({ ...fields, updated_by: viewerId, updated_at: new Date().toISOString() })
          .eq("id", plan.id);
        if (error) throw error;
        toast.success("Weekly plan updated.");
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Could not save this plan. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const titleText = mode === "create" ? "New Weekly Plan" : mode === "edit" ? "Edit Weekly Plan" : "Weekly Plan";
  const statusMeta = weeklyPlanStatusMeta(mode === "view" ? plan?.status ?? status : status);
  const inputClass =
    "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)]/30 focus:border-[var(--sys-primary)] transition-colors";
  const invalidInputClass =
    "w-full px-3.5 py-2.5 rounded-xl border border-red-400 bg-white dark:bg-slate-800 text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition-colors";
  const labelClass =
    "block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5";
  const requiredMark = <span className="text-red-500 ml-0.5">*</span>;
  const titleInvalid = submitAttempted && !title.trim();
  const startInvalid = submitAttempted && !startDate;
  const linkedModule = plan ? weeklyPlanModuleLabel(plan.module, moduleNames) : null;
  const linkedModuleProject = plan?.module ? moduleProjects[plan.module] ?? "" : "";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-gray-100 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white truncate">{titleText}</h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {mode === "view" && plan
                ? `Created by ${nameOf(plan.created_by)} · ${formatTimestamp(plan.created_at)}`
                : "Tasks are visible to the creator, the assignee and super admins."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {isForm ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    Title{requiredMark}
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Finish checkout API"
                    className={titleInvalid ? invalidInputClass : inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Module (optional)</label>
                  <SearchableSelectField
                    value={module}
                    onChange={setModule}
                    options={moduleOptions}
                    placeholder={modules.length > 0 ? "Select a module" : "No modules available"}
                    searchPlaceholder="Search modules..."
                    allowClear
                    clearLabel="No module"
                  />
                </div>
                <div>
                  <label className={labelClass}>Assigned personnel (optional)</label>
                  <SearchableSelectField
                    value={assignedPersonnel}
                    onChange={setAssignedPersonnel}
                    options={peopleOptions}
                    placeholder="Select a person"
                    searchPlaceholder="Search people..."
                    allowClear
                    clearLabel="Unassigned"
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Date range{requiredMark}
                  </label>
                  <DateRangeField
                    start={startDate}
                    end={endDate}
                    onChange={(s, e) => {
                      setStartDate(s);
                      setEndDate(e);
                    }}
                    placeholder="Select start and end date"
                    invalid={startInvalid}
                  />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as WeeklyPlanStatus)}
                    className={inputClass}
                  >
                    {WEEKLY_PLAN_STATUSES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="What needs to be done this week?"
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div>
                <label className={labelClass}>Attachments</label>
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 p-4">
                  {attachments.length > 0 && (
                    <ul className="space-y-2 mb-3">
                      {attachments.map((path) => (
                        <li
                          key={path}
                          className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2"
                        >
                          <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                            <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                              />
                            </svg>
                            <span className="truncate">{weeklyPlanFileName(path)}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(path)}
                            className="text-[11px] font-bold text-red-500 hover:text-red-600 shrink-0"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {uploading ? "Uploading..." : "Add files"}
                    </button>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Images and documents, up to 20 MB each.
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={WEEKLY_PLAN_ACCEPT}
                    onChange={(e) => handleFiles(e.target.files)}
                    className="hidden"
                  />
                </div>
              </div>
            </>
          ) : (
            plan && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${statusMeta.badge}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusMeta.dot }} />
                    {statusMeta.label}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {weeklyPlanWeekRange(plan.date_weekly, plan.date_weekly_end)}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{plan.title}</h3>
                  {linkedModule && (
                    <span className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--sys-primary)]/25 bg-[var(--sys-primary)]/10 text-[11px] font-bold text-[var(--sys-primary-text)]">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                      <span>{linkedModule}</span>
                      {linkedModuleProject && (
                        <span className="font-semibold opacity-70">· {linkedModuleProject}</span>
                      )}
                    </span>
                  )}
                  <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                    {plan.description || "No description."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned to</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {plan.assigned_personnel ? nameOf(plan.assigned_personnel) : "Unassigned"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last update</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {plan.updated_at
                        ? `${formatTimestamp(plan.updated_at)}${plan.updated_by ? ` · ${nameOf(plan.updated_by)}` : ""}`
                        : "—"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Attachments
                  </p>
                  {attachments.length === 0 ? (
                    <p className="text-xs font-medium text-slate-400 italic">No files attached.</p>
                  ) : (
                    <ul className="space-y-2">
                      {attachments.map((path) => {
                        const url = signedUrls[path];
                        return (
                          <li
                            key={path}
                            className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-slate-700 px-3.5 py-2.5"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              {isImageWeeklyPlanFile(path) && url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={url}
                                  alt={weeklyPlanFileName(path)}
                                  className="h-9 w-9 rounded-lg object-cover shrink-0"
                                />
                              ) : (
                                <span className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                    />
                                  </svg>
                                </span>
                              )}
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                {weeklyPlanFileName(path)}
                              </span>
                            </span>
                            {url ? (
                              <span className="flex items-center gap-3 shrink-0 text-[11px] font-bold">
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[var(--sys-primary-text)] hover:underline"
                                >
                                  Preview
                                </a>
                                <a href={url} download className="text-slate-500 dark:text-slate-400 hover:underline">
                                  Download
                                </a>
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-400 shrink-0">Loading...</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </>
            )
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900">
          {!isForm && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="mr-auto px-4 py-2.5 rounded-xl text-red-500 text-sm font-bold hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            {isForm ? "Cancel" : "Close"}
          </button>
          {isForm ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || uploading}
              className="px-5 py-2.5 rounded-xl bg-[var(--sys-primary)] text-white text-sm font-bold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving..." : mode === "create" ? "Create Plan" : "Save Changes"}
            </button>
          ) : (
            <>
              {onMarkDone && (
                <button
                  type="button"
                  onClick={onMarkDone}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors"
                >
                  Mark as done
                </button>
              )}
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="px-5 py-2.5 rounded-xl bg-[var(--sys-primary)] text-white text-sm font-bold shadow-lg hover:opacity-90 transition-opacity"
                >
                  Edit
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
