"use client";

import { useMemo } from "react";
import DevWorkspaceClient from "@/components/modules/DevWorkspaceClient";
import CacheLoader from "@/components/session/CacheLoader";
import { useSessionData } from "@/components/session/SessionDataProvider";

const DEV_STATUSES = ["development", "developing", "revision", "revising"];

export default function DevWorkspaceView({
  userId,
  isSuperAdmin,
  isDevops,
}: {
  userId: string;
  isSuperAdmin: boolean;
  isDevops: boolean;
}) {
  const { allModules, profileName, isLoading, error } = useSessionData();

  const devModules = useMemo(
    () =>
      allModules
        .filter((m: any) => DEV_STATUSES.includes(m.status))
        .filter((m: any) => {
          if (isDevops) return m.assigned_developer_id === userId;
          if (isSuperAdmin) return true;
          return m.assigned_developer_id === userId;
        })
        .map((m: any) => ({
          ...m,
          assigned_developer_name: m.assigned_developer_id ? profileName(m.assigned_developer_id) : null,
        })),
    [allModules, profileName, userId, isSuperAdmin, isDevops],
  );

  if (isLoading) return <CacheLoader error={error} />;

  return (
    <div className="w-full space-y-6">
      <DevWorkspaceClient
        initialModules={devModules}
        isSuperAdmin={isSuperAdmin}
        canSubmitFeedback={!isDevops}
      />
    </div>
  );
}
