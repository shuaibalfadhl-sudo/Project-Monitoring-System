"use client";

import {
  platformBadgeClass,
  platformLabel,
  workstreamBadgeClass,
  workstreamLabel,
} from "@/lib/moduleClassifications";

export default function ModuleClassChips({
  platform,
  workstream,
}: {
  platform?: string | null;
  workstream?: string | null;
}) {
  if (!platform && !workstream) return null;

  return (
    <div className="flex items-center gap-1 mt-1.5">
      {platform ? (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${platformBadgeClass(platform)}`}
        >
          {platformLabel(platform)}
        </span>
      ) : null}
      {workstream ? (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${workstreamBadgeClass(workstream)}`}
        >
          {workstreamLabel(workstream)}
        </span>
      ) : null}
    </div>
  );
}
