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
  const currentTraineeApproveCount = navCounts?.traineeApproveCount ?? 0;
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
  const isTrainee = role === 'trainee';

  const pipelineLinks = (isManager || isSuperAdmin || isAuditor) ? [
    { href: '/qa-monitoring', label: 'For QA Modules', count: currentForQaCount, badge: 'bg-orange-500' },
    ...(isSuperAdmin || isAuditor ? [
      { href: '/trainee-approve', label: 'Trainee Approve', count: currentTraineeApproveCount, badge: 'bg-lime-500' },
    ] : []),
    ...(isManager || isSuperAdmin ? [
      { href: '/module-review', label: 'Module Review', count: currentPmReviewCount, badge: 'bg-purple-600' },
      { href: '/qa-revision', label: 'QA Revision', count: currentQaRevisionCount, badge: 'bg-red-500' },
      { href: '/qa-approve', label: 'QA Approved', count: currentQaApproveCount, badge: 'bg-emerald-500' },
    ] : []),
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

  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const searching = query.length > 0;
  const matches = (label: string) => label.toLowerCase().includes(query);
  const show = (label: string) => !searching || matches(label);
  const shownLinks = (label: string, links: NavGroupLink[]) =>
    searching && !matches(label) ? links.filter((link) => matches(link.label)) : links;
  const groupVisible = (label: string, links: NavGroupLink[]) =>
    !searching || matches(label) || links.some((link) => matches(link.label));

  const weeklyShown = shownLinks('Weekly Pipeline', weeklyLinks);
  const pipelineShown = shownLinks('Module Pipeline', pipelineLinks);
  const weeklyVisible = groupVisible('Weekly Pipeline', weeklyLinks);
  const pipelineVisible = groupVisible('Module Pipeline', pipelineLinks);
  const anyVisible =
    (show('Dashboard') || show('Hall of Fame') || weeklyVisible || show('All Modules')) ||
    (isManager && (show('Projects') || pipelineVisible)) ||
    (isAuditor && (show('Assigned Projects') || pipelineVisible)) ||
    (isDeveloper && (show('Assigned Projects') || show('Dev Workspace'))) ||
    (isDevOps && (show('Dev Workspace') || show('For Deployment'))) ||
    (isTrainee && (show('All Projects') || show('Dev Workspace') || show('QA Modules'))) ||
    (isSuperAdmin && (show('All Projects') || pipelineVisible || show('Users') || show('System Settings')));

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
    <div className="flex-1 min-h-0 flex flex-col mt-4">
      <div className="relative shrink-0 mb-3">
        <svg
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search menu..."
          className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)]/30 focus:border-[var(--sys-primary)] transition-colors"
        />
      </div>

      <nav className="no-scrollbar flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {show('Dashboard') && (
          <Link href="/dashboard" className={getLinkClasses('/dashboard')}>
            Dashboard
          </Link>
        )}

        {show('Hall of Fame') && (
          <Link href="/hall-of-fame" className={getLinkClasses('/hall-of-fame')}>
            Hall of Fame
          </Link>
        )}

        {weeklyVisible && (
          <NavGroup
            label="Weekly Pipeline"
            links={weeklyShown}
            open={weeklyOpen || searching}
            onToggle={() => setWeeklyOpen((open) => !open)}
            getLinkClasses={getLinkClasses}
          />
        )}

        {show('All Modules') && (
          <Link href="/modules" className={getLinkClasses('/modules')}>
            All Modules
          </Link>
        )}
        {isManager && (
          <>
            {show('Projects') && (
              <Link href="/projects" className={getLinkClasses('/projects')}>
                Projects
              </Link>
            )}
            {pipelineVisible && (
              <NavGroup
                label="Module Pipeline"
                links={pipelineShown}
                open={pipelineOpen || searching}
                onToggle={() => setPipelineOpen((open) => !open)}
                getLinkClasses={getLinkClasses}
              />
            )}
          </>
        )}

        {isAuditor && (
          <>
            {show('Assigned Projects') && (
              <Link href="/projects" className={getLinkClasses('/projects')}>
                Assigned Projects
              </Link>
            )}
            {pipelineVisible && (
              <NavGroup
                label="Module Pipeline"
                links={pipelineShown}
                open={pipelineOpen || searching}
                onToggle={() => setPipelineOpen((open) => !open)}
                getLinkClasses={getLinkClasses}
              />
            )}
          </>
        )}

        {isDeveloper && (
          <>
            {show('Assigned Projects') && (
              <Link href="/projects" className={getLinkClasses('/projects')}>
                Assigned Projects
              </Link>
            )}
            {show('Dev Workspace') && (
              <Link href="/dev-workspace" className={getLinkClasses('/dev-workspace')}>
                <span className="flex items-center justify-between">
                  <span>Dev Workspace</span>
                  {currentDevWorkspaceCount > 0 && (
                    <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm transition-all duration-300 animate-in fade-in">{currentDevWorkspaceCount}</span>
                  )}
                </span>
              </Link>
            )}
          </>
        )}

        {isTrainee && (
          <>
            {show('All Projects') && (
              <Link href="/projects" className={getLinkClasses('/projects')}>
                All Projects
              </Link>
            )}
            {show('Dev Workspace') && (
              <Link href="/dev-workspace" className={getLinkClasses('/dev-workspace')}>
                <span className="flex items-center justify-between">
                  <span>Dev Workspace</span>
                  {currentDevWorkspaceCount > 0 && (
                    <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm transition-all duration-300 animate-in fade-in">{currentDevWorkspaceCount}</span>
                  )}
                </span>
              </Link>
            )}
            {show('QA Modules') && (
              <Link href="/qa-monitoring" className={getLinkClasses('/qa-monitoring')}>
                <span className="flex items-center justify-between">
                  <span>QA Modules</span>
                  {currentForQaCount > 0 && (
                    <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm transition-all duration-300 animate-in fade-in">{currentForQaCount}</span>
                  )}
                </span>
              </Link>
            )}
          </>
        )}

        {isDevOps && (
          <>
            {show('Dev Workspace') && (
              <Link href="/dev-workspace" className={getLinkClasses('/dev-workspace')}>
                <span className="flex items-center justify-between">
                  <span>Dev Workspace</span>
                  {currentDevWorkspaceCount > 0 && (
                    <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm transition-all duration-300 animate-in fade-in">{currentDevWorkspaceCount}</span>
                  )}
                </span>
              </Link>
            )}
            {show('For Deployment') && (
              <Link href="/deployment" className={getLinkClasses('/deployment')}>
                <span className="flex items-center justify-between">
                  <span>For Deployment</span>
                  {currentDeploymentCount > 0 && (
                    <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm transition-all duration-300 animate-in fade-in">{currentDeploymentCount}</span>
                  )}
                </span>
              </Link>
            )}
          </>
        )}

        {isSuperAdmin && (
          <>
            {show('All Projects') && (
              <Link href="/projects" className={getLinkClasses('/projects')}>
                All Projects
              </Link>
            )}
            {pipelineVisible && (
              <NavGroup
                label="Module Pipeline"
                links={pipelineShown}
                open={pipelineOpen || searching}
                onToggle={() => setPipelineOpen((open) => !open)}
                getLinkClasses={getLinkClasses}
              />
            )}
            {show('Users') && (
              <Link href="/users" className={getLinkClasses('/users')}>
                Users
              </Link>
            )}
            {show('System Settings') && (
              <Link href="/settings" className={getLinkClasses('/settings')}>
                System Settings
              </Link>
            )}
          </>
        )}

        {searching && !anyVisible && (
          <p className="px-4 py-3 text-xs font-medium text-slate-400 italic">No menu items match.</p>
        )}
      </nav>
    </div>
  );
}