'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavCounts } from '@/context/NavCountsContext';

interface NavGroupLink {
  href: string;
  label: string;
  count?: number;
  badge?: string;
}

function NavGroup({
  label,
  links,
  open,
  onToggle,
  getLinkClasses,
}: {
  label: string;
  links: NavGroupLink[];
  open: boolean;
  onToggle: () => void;
  getLinkClasses: (path: string) => string;
}) {
  const total = links.reduce((sum, link) => sum + (link.count ?? 0), 0);
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:translate-x-1"
      >
        <span>{label}</span>
        <span className="flex items-center gap-2">
          {!open && total > 0 && (
            <span className="bg-[var(--sys-primary)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              {total}
            </span>
          )}
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="mt-1 ml-3 pl-3 border-l border-slate-200 dark:border-slate-800 space-y-1">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={getLinkClasses(link.href)}>
              <span className="flex items-center justify-between">
                <span>{link.label}</span>
                {(link.count ?? 0) > 0 && (
                  <span className={`${link.badge} text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm transition-all duration-300 animate-in fade-in`}>
                    {link.count}
                  </span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SidebarNav({ 
  role,
  forQaCount = 0,
  qaRevisionCount = 0
}: { 
  role: string,
  forQaCount?: number,
  qaRevisionCount?: number
}) {
  const navCounts = useNavCounts();
  const pathname = usePathname();
  const currentForQaCount = navCounts?.forQaCount ?? 0;
  const currentQaRevisionCount = navCounts?.qaRevisionCount ?? 0;
  const currentPmReviewCount = navCounts?.pmReviewCount ?? 0;
  const currentQaApproveCount = navCounts?.qaApproveCount ?? 0;
  const currentDeploymentCount = navCounts?.deploymentCount ?? 0;
  const currentDevWorkspaceCount = (navCounts?.developmentCount ?? 0) + (navCounts?.revisionCount ?? 0) + (navCounts?.revisingCount ?? 0);

  const isManager = role === 'project_manager';
  const isAuditor = role === 'system_auditor';
  const isDeveloper = role === 'developer';
  const isSuperAdmin = role === 'super_admin';
  const isDevOps = role === 'devops';

  const pipelineLinks = (isManager || isSuperAdmin) ? [
    ...(isSuperAdmin ? [{ href: '/qa-monitoring', label: 'For QA Modules', count: currentForQaCount, badge: 'bg-orange-500' }] : []),
    { href: '/module-review', label: 'Module Review', count: currentPmReviewCount, badge: 'bg-purple-600' },
    { href: '/qa-revision', label: 'QA Revision', count: currentQaRevisionCount, badge: 'bg-red-500' },
    { href: '/qa-approve', label: 'QA Approved', count: currentQaApproveCount, badge: 'bg-emerald-500' },
    ...(isSuperAdmin ? [
      { href: '/dev-workspace', label: 'Dev Workspace', count: currentDevWorkspaceCount, badge: 'bg-indigo-500' },
      { href: '/deployment', label: 'For Deployment', count: currentDeploymentCount, badge: 'bg-purple-600' },
    ] : []),
  ] : [];
  const weeklyLinks = [
    { href: '/weekly-plans', label: 'Weekly Plans' },
    { href: '/weekly-tasks', label: 'Weekly Tasks', count: navCounts?.weeklyTasksCount ?? 0, badge: 'bg-blue-500' },
    { href: '/done-tasks', label: 'Done Tasks', count: navCounts?.doneTasksCount ?? 0, badge: 'bg-green-500' },
  ];
  const insideGroup = (links: { href: string }[]) =>
    links.some((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));
  const [pipelineOpen, setPipelineOpen] = useState(() => insideGroup(pipelineLinks));
  const [weeklyOpen, setWeeklyOpen] = useState(() => insideGroup(weeklyLinks));
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (insideGroup(pipelineLinks)) setPipelineOpen(true);
    if (insideGroup(weeklyLinks)) setWeeklyOpen(true);
  }

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
      
      <Link href="/hall-of-fame" className={getLinkClasses('/hall-of-fame')}>
        Hall of Fame
      </Link>

      <NavGroup
        label="Weekly Pipeline"
        links={weeklyLinks}
        open={weeklyOpen}
        onToggle={() => setWeeklyOpen((open) => !open)}
        getLinkClasses={getLinkClasses}
      />
      
      <Link href="/modules" className={getLinkClasses('/modules')}>
        All Modules
      </Link>
      {isManager && (
        <>
          <Link href="/projects" className={getLinkClasses('/projects')}>
            Projects
          </Link>
          <NavGroup
            label="Module Pipeline"
            links={pipelineLinks}
            open={pipelineOpen}
            onToggle={() => setPipelineOpen((open) => !open)}
            getLinkClasses={getLinkClasses}
          />
        </>
      )}

      {isAuditor && (
        <>
          <Link href="/projects" className={getLinkClasses('/projects')}>
            Assigned Projects
          </Link>
          <Link href="/qa-monitoring" className={getLinkClasses('/qa-monitoring')}>
            <span className="flex items-center justify-between">
              <span>QA Monitoring</span>
              {currentForQaCount > 0 && (
                <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm transition-all duration-300 animate-in fade-in">{currentForQaCount}</span>
              )}
            </span>
          </Link>
        </>
      )}

      {isDeveloper && (
        <>
          <Link href="/projects" className={getLinkClasses('/projects')}>
            Assigned Projects
          </Link>
          <Link href="/dev-workspace" className={getLinkClasses('/dev-workspace')}>
            <span className="flex items-center justify-between">
              <span>Dev Workspace</span>
              {currentDevWorkspaceCount > 0 && (
                <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm transition-all duration-300 animate-in fade-in">{currentDevWorkspaceCount}</span>
              )}
            </span>
          </Link>
        </>
      )}

      {isDevOps && (
        <>
          <Link href="/dev-workspace" className={getLinkClasses('/dev-workspace')}>
            <span className="flex items-center justify-between">
              <span>Dev Workspace</span>
              {currentDevWorkspaceCount > 0 && (
                <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm transition-all duration-300 animate-in fade-in">{currentDevWorkspaceCount}</span>
              )}
            </span>
          </Link>
          <Link href="/deployment" className={getLinkClasses('/deployment')}>
            <span className="flex items-center justify-between">
              <span>For Deployment</span>
              {currentDeploymentCount > 0 && (
                <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm transition-all duration-300 animate-in fade-in">{currentDeploymentCount}</span>
              )}
            </span>
          </Link>
        </>
      )}

      {isSuperAdmin && (
        <>
          <Link href="/projects" className={getLinkClasses('/projects')}>
            All Projects
          </Link>
          <NavGroup
            label="Module Pipeline"
            links={pipelineLinks}
            open={pipelineOpen}
            onToggle={() => setPipelineOpen((open) => !open)}
            getLinkClasses={getLinkClasses}
          />
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
