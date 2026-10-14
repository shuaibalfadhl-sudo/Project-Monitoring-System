"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import SidebarNav from "@/components/layout/SidebarNav";

interface CollapsibleSidebarProps {
  role: string;
  systemName?: string | null;
  systemLogoUrl?: string | null;
}

export default function CollapsibleSidebar({ role, systemName, systemLogoUrl }: CollapsibleSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Listen for hamburger toggle from TopNavbar
  const handleToggle = useCallback(() => setCollapsed((c) => !c), []);
  useEffect(() => {
    window.addEventListener("sidebar:toggle", handleToggle);
    return () => window.removeEventListener("sidebar:toggle", handleToggle);
  }, [handleToggle]);

  return (
    <aside
      className={`relative flex-shrink-0 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sticky top-0 h-screen z-20 transition-all duration-300 ease-in-out overflow-hidden ${collapsed ? "w-0 border-r-0" : "w-64"}`}
    >
      {/* Inner content — keeps its size so transition is smooth */}
      <div className="w-64 flex flex-col h-full p-6">
        {/* Logo + system name */}
        <div className="mb-8 flex items-center gap-3">
          {systemLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={systemLogoUrl} alt="Logo" className="h-9 w-9 object-contain shrink-0" />
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight truncate">
              {systemName || "Project System"}
            </h2>
            <p className="text-[10px] font-bold text-[var(--sys-primary)] uppercase tracking-wider">
              {role.replace(/_/g, " ")}
            </p>
          </div>
        </div>

        <SidebarNav role={role} />
      </div>
    </aside>
  );
}