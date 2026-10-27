"use client";

import { useMemo } from "react";
import QaMonitoringClient from "@/components/modules/QaMonitoringClient";
import CacheLoader from "@/components/session/CacheLoader";
import { useSessionData } from "@/components/session/SessionDataProvider";

const priorityRank = (p?: string) => {
  switch (p) {
    case "critical": return 0;
    case "high": return 1;
    case "medium": return 2;
    case "low": return 3;
    default: return 4;
  }
};

export default function QaMonitoringView() {
  const { allModules, projects, profileName, isLoading, error } = useSessionData();

  const qaModules = useMemo(
    () =>
      allModules
        .filter((m: any) => m.status === "for_qa" || m.status === "auditing")
        .map((m: any) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          priority: m.priority,
          status: m.status,
          module_document_url: m.module_document_url,
          qa_result_document_url: m.qa_result_document_url,
          website_link: m.website_link,
          qa_acknowledged_by: m.qa_acknowledged_by,
          assigned_developer_id: m.assigned_developer_id,
          developer_feedback: m.developer_feedback,
          updated_at: m.updated_at,
          auditor_name: m.qa_acknowledged_by ? profileName(m.qa_acknowledged_by) : null,
          assigned_developer_name: m.assigned_developer_id ? profileName(m.assigned_developer_id) : null,
          project: {
            id: m.project.id,
            name: m.project.name,
            created_by: m.project.created_by,
            creator_name: m.project.created_by ? profileName(m.project.created_by) ?? undefined : undefined,
          },
        }))
        .sort((a: any, b: any) => {
          const aRank = a.status === "auditing" ? 0 : 1;
          const bRank = b.status === "auditing" ? 0 : 1;
          if (aRank !== bRank) return aRank - bRank;
          const ap = priorityRank(a.priority);
          const bp = priorityRank(b.priority);
          if (ap !== bp) return ap - bp;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }),
    [allModules, profileName],
  );

  const projectOptions = useMemo(
    () => projects.map((p) => ({ id: p.id, name: p.name })).filter((p) => p.id),
    [projects],
  );

  if (isLoading) return <CacheLoader error={error} />;

  return <QaMonitoringClient initialModules={qaModules} projects={projectOptions} />;
}
