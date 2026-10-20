"use client";

import { useEffect, useRef, useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  allValue?: string;
  allLabel?: string;
  placeholder?: string;
  className?: string;
  searchPlaceholder?: string;
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  allValue = "all",
  allLabel = "All",
  placeholder,
  className = "w-full sm:w-44",
  searchPlaceholder = "Search...",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const selected = options.find((o) => o.value === value);
  const triggerText = selected ? selected.label : placeholder || allLabel;
  const filtered = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium bg-white dark:bg-slate-800 dark:text-white text-left flex justify-between items-center gap-2"
      >
        <span className="truncate">{triggerText}</span>
        <svg
          className={`w-4 h-4 shrink-0 text-gray-500 dark:text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 flex flex-col overflow-hidden">
          {options.length > 6 && (
            <div className="p-2 border-b border-gray-100 dark:border-slate-700">
              <input
                type="text"
                autoFocus
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] text-sm dark:text-white"
              />
            </div>
          )}
          <div className="overflow-y-auto p-1 flex-1">
            <button
              type="button"
              onClick={() => {
                onChange(allValue);
                setOpen(false);
                setSearch("");
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                value === allValue
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              {allLabel}
            </button>
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  setSearch("");
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium truncate ${
                  value === o.value
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                }`}
              >
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-slate-400 font-medium">
                No matches.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
