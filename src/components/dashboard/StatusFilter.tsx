"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const STATUSES = [
  { value: "deployed", label: "Deployed" },
  { value: "qa_approved", label: "QA Approved" },
  { value: "deployment", label: "Deployment" },
  { value: "for_qa", label: "For QA" },
  { value: "auditing", label: "Auditing" },
  { value: "revising", label: "Revising" },
  { value: "revision", label: "Revision" },
  { value: "pm_review", label: "PM Review" },
  { value: "development", label: "Development" },
  { value: "pending", label: "Pending" }
];

export default function StatusFilter({ currentStatus }: { currentStatus: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set("status", newStatus);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm w-full mb-6">
      <label htmlFor="statusFilter" className="text-sm font-bold text-gray-500">
        Filter Progress By:
      </label>
      <select
        id="statusFilter"
        value={currentStatus}
        onChange={handleStatusChange}
        className="text-sm font-semibold bg-gray-50 dark:bg-slate-800 text-[var(--sys-primary)] border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      >
        {STATUSES.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
    </div>
  );
}
