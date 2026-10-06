'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SidebarNav({ role }: { role: string }) {
  const pathname = usePathname();
  const isManager = role === 'project_manager';
  const isAuditor = role === 'system_auditor';

  const getLinkClasses = (path: string) => {
    // Exact match for dashboard to prevent it from matching /dashboard/projects if that existed
    const isActive = path === '/dashboard' 
      ? pathname === '/dashboard'
      : pathname === path || pathname.startsWith(`${path}/`);
    
    return isActive
      ? "block px-4 py-3 rounded-xl transition-all duration-300 font-bold text-sm bg-blue-600 text-white shadow-lg shadow-blue-900/20 translate-x-2"
      : "block px-4 py-3 rounded-xl transition-all duration-300 font-bold text-sm text-slate-400 hover:bg-white/20 hover:text-white hover:translate-x-1";
  };

  return (
    <nav className="flex-1 space-y-2 mt-4">
      <Link href="/dashboard" className={getLinkClasses('/dashboard')}>
        Dashboard
      </Link>
      
      {isManager && (
        <>
          <Link href="/projects" className={getLinkClasses('/projects')}>
            Projects
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
    </nav>
  );
}
