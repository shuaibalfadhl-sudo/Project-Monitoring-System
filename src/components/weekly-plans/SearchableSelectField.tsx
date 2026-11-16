"use client";

import { useEffect, useRef, useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  searchPlaceholder?: string;
  allowClear?: boolean;
  clearLabel?: string;
}

export default function SearchableSelectField({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Search...",
  allowClear = false,
  clearLabel = "Clear selection",
}: SearchableSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocMouseDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-left flex justify-between items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)]/30 focus:border-[var(--sys-primary)] transition-colors"
      >
        <span className={`truncate ${selected ? "text-slate-800 dark:text-white" : "text-slate-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-slate-700">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)]/30 text-sm text-slate-800 dark:text-white"
            />
          </div>
          <div className="overflow-y-auto p-1 flex-1" role="listbox">
            {allowClear && value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setSearch("");
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                {clearLabel}
              </button>
            )}
            {filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value === option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  setSearch("");
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium truncate transition-colors ${
                  value === option.value
                    ? "bg-[var(--sys-primary)]/10 text-[var(--sys-primary-text)]"
                    : "text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                }`}
              >
                {option.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400 font-medium">
                No matches.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
