"use client";

import { useMemo } from "react";
import ModuleReviewClient from "@/components/modules/ModuleReviewClient";
import CacheLoader from "@/components/session/CacheLoader";
import { useSessionData } from "@/components/session/SessionDataProvider";

export default function ModuleReviewView() {
  const { allModules, profileName, isLoading, error } = useSessionData();

  const reviewModules = useMemo(
    () =>
      allModules
        .filter((m: any) => m.status === "pm_review")
        .map((m: any) => ({
          ...m,
          auditor_name: m.qa_acknowledged_by ? profileName(m.qa_acknowledged_by) : null,
          qa_acknowledged_by_name: m.qa_acknowledged_by ? profileName(m.qa_acknowledged_by) : null,
          qa_result_acknowledged_by_name: m.qa_result_acknowledged_by ? profileName(m.qa_result_acknowledged_by) : null,
          assigned_developer_name: m.assigned_developer_id ? profileName(m.assigned_developer_id) : null,
        })),
    [allModules, profileName],
  );

  if (isLoading) return <CacheLoader error={error} />;

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Module Review</h1>
      </div>
      <ModuleReviewClient initialModules={reviewModules} />
    </div>
  );
}
