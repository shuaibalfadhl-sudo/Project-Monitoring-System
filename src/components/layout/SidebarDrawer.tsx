"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import SidebarNav from "@/components/layout/SidebarNav";

interface SidebarDrawerProps {
  role: string;
  systemName?: string | null;
  systemLogoUrl?: string | null;
}

// Global event so TopNavbar can toggle this component
export const SIDEBAR_TOGGLE_EVENT = "sidebar:toggle";

export default function SidebarDrawer({ role, systemName, systemLogoUrl }: SidebarDrawerProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Listen for toggle events dispatched by the hamburger button
  const handleToggle = useCallback(() => setOpen((o) => !o), []);
  useEffect(() => {
    window.addEventListener(SIDEBAR_TOGGLE_EVENT, handleToggle);
    return () => window.removeEventListener(SIDEBAR_TOGGLE_EVENT, handleToggle);
  }, [handleToggle]);

  // Lock body scroll when open on mobile
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col p-6 transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {systemLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={systemLogoUrl} alt="Logo" className="h-9 w-9 object-contain shrink-0" />
            )}
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                {systemName || "Project System"}
              </h2>
              <p className="text-[10px] font-bold text-[var(--sys-primary)] uppercase tracking-wider">
                {role.replace(/_/g, " ")}
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <SidebarNav role={role} />
      </aside>
    </>
  );
}