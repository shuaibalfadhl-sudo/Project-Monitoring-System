'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SidebarNav({ role }: { role: string }) {
  const pathname = usePathname();
  const isManager = role === 'project_manager';
  const isAuditor = role === 'system_auditor';
  const isDeveloper = role === 'developer';
  const isSuperAdmin = role === 'super_admin';

  const getLinkClasses = (path: string) => {
    // Exact match for dashboard to prevent it from matching /dashboard/projects if that existed
    const isActive = path === '/dashboard' 
      ? pathname === '/dashboard'
      : pathname === path || pathname.startsWith(`${path}/`);
    
    return isActive
      ? "block px-4 py-3 rounded-xl transition-all duration-300 font-bold text-sm bg-[var(--sys-primary)] text-white shadow-lg translate-x-2"
      : "block px-4 py-3 rounded-xl transition-all duration-300 font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:translate-x-1";
  };

  return (
    <nav className="flex-1 space-y-2 mt-4">
      <Link href="/dashboard" className={getLinkClasses('/dashboard')}>
        Dashboard
      </Link>
      
      <Link href="/modules" className={getLinkClasses('/modules')}>
        All Modules
      </Link>
      {isManager && (
        <>
          <Link href="/projects" className={getLinkClasses('/projects')}>
            Projects
          </Link>
          <Link href="/qa-rework" className={getLinkClasses('/qa-rework')}>
            QA Rework
          </Link>
        </>
      )}

      {isAuditor && (
        <>
          <Link href="/projects" className={getLinkClasses('/projects')}>
            Assigned Projects
          </Link>
          <Link href="/qa-monitoring" className={getLinkClasses('/qa-monitoring')}>
            QA Monitoring
          </Link>
        </>
      )}

      {isDeveloper && (
        <>
          <Link href="/projects" className={getLinkClasses('/projects')}>
            Assigned Projects
          </Link>
        </>
      )}

      {isSuperAdmin && (
        <>
          <Link href="/projects" className={getLinkClasses('/projects')}>
            All Projects
          </Link>
          <Link href="/qa-monitoring" className={getLinkClasses('/qa-monitoring')}>
            For QA Modules
          </Link>
          <Link href="/qa-rework" className={getLinkClasses('/qa-rework')}>
            QA Rework
          </Link>
          <Link href="/users" className={getLinkClasses('/users')}>
            Users
          </Link>
          <Link href="/settings" className={getLinkClasses('/settings')}>
            System Settings
          </Link>
        </>
      )}
    </nav>
  );
}
