"use client";

import type { ModuleSortOrder } from "@/lib/moduleSorting";

interface ModuleSortSelectProps {
  value: ModuleSortOrder;
  onChange: (value: ModuleSortOrder) => void;
  accentClass?: string;
}

export default function ModuleSortSelect({
  value,
  onChange,
  accentClass = "focus:ring-[var(--sys-primary)]",
}: ModuleSortSelectProps) {
  return (
    <select
      aria-label="Sort modules"
      className={`w-full sm:w-48 px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 font-medium bg-white dark:bg-slate-800 dark:text-white transition-colors ${accentClass}`}
      value={value}
      onChange={(event) => onChange(event.target.value as ModuleSortOrder)}
    >
      <option value="default">Default order</option>
      <option value="newest">Newest to oldest</option>
      <option value="oldest">Oldest to newest</option>
      <option value="priority_high">Priority: High to Low</option>
      <option value="priority_low">Priority: Low to High</option>
    </select>
  );
}
