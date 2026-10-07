import { getUserProfile } from '@/lib/auth-utils'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

import StatusFilter from '@/components/dashboard/StatusFilter'
import ProjectPieChart from '@/components/dashboard/ProjectPieChart'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const profile = await getUserProfile()
  const params = await searchParams;
  const currentStatus = typeof params?.status === 'string' ? params.status : 'deployed';

  if (!profile) {
    redirect('/login')
  }



  let title = "Dashboard"
  if (profile.role === 'project_manager') title = "Project Manager Dashboard"
  if (profile.role === 'system_auditor') title = "System Auditor Dashboard"
  if (profile.role === 'super_admin') title = "Super Admin Dashboard"

  // Fetch data
  let displayProjects: any[] = []
  let totalProjects = 0
  let totalModules = 0
  let approvedModules = 0
  let totalForQaModules = 0

  const supabaseServer = await createClient()

  if (profile.role === 'system_auditor') {
    const { data } = await supabaseServer
      .from('project_members')
      .select(`
        projects (
          id,
          name,
          status,
          target_date,
          project_modules (
            id,
            status
          )
        )
      `)
      .eq('user_id', profile.id)

    if (data) {
      displayProjects = data.map(d => d.projects).filter(Boolean)
    }
  } else if (profile.role === 'project_manager' || profile.role === 'super_admin') {
    const { data } = await supabaseServer
      .from('projects')
      .select(`
        id,
        name,
        status,
        target_date,
        project_modules (
          id,
          status
        )
      `)
      .order('created_at', { ascending: false })

    if (data) {
      displayProjects = data
    }
  }

  displayProjects.forEach((p: any) => {
    if (p.project_modules) {
      totalModules += p.project_modules.length
      approvedModules += p.project_modules.filter((m: any) => m.status === currentStatus).length
      totalForQaModules += p.project_modules.filter((m: any) => m.status === 'for_qa').length
    }
  })
  
  totalProjects = displayProjects.length
  const overallProgress = totalModules === 0 ? 0 : Math.round((approvedModules / totalModules) * 100)

  // Fetch leaderboard data for everyone
  let pmLeaderboard: { pmName: string; deployedPercentage: number; totalModules: number; deployedModules: number; pmId: string }[] = [];
  
  // Try to use the RPC which bypasses RLS (if the user has created it)
  const { data: rpcData, error: rpcError } = await supabaseServer.rpc('get_pm_leaderboard');
  
  if (rpcError) {
    console.error("RPC Error:", rpcError);
  }

  if (!rpcError && rpcData) {
    pmLeaderboard = rpcData.map((row: any) => ({
      pmId: row.pm_id,
      pmName: row.pm_name,
      totalModules: Number(row.total_modules),
      deployedModules: Number(row.deployed_modules),
      deployedPercentage: Number(row.deployed_percentage)
    }));
  } else {
    // Fallback to manual fetching if RPC doesn't exist (this is subject to RLS for non-admins)
    const [ { data: allProjectsForLeaderboard }, { data: allProfiles } ] = await Promise.all([
      supabaseServer
        .from('projects')
        .select(`
          id,
          created_by,
          project_modules (id, status)
        `),
      supabaseServer
        .from('profiles')
        .select('id, full_name')
    ]);

    const profilesMap = new Map(allProfiles?.map(p => [p.id, p.full_name]) || []);

    if (allProjectsForLeaderboard) {
      const pmStats: Record<string, { name: string; total: number; deployed: number }> = {};
      
      allProjectsForLeaderboard.forEach((p: any) => {
        const pmId = p.created_by;
        const pmName = profilesMap.get(pmId) || 'Unknown PM';
        
        if (!pmStats[pmId]) {
          pmStats[pmId] = { name: pmName, total: 0, deployed: 0 };
        }
        
        if (p.project_modules) {
          pmStats[pmId].total += p.project_modules.length;
          pmStats[pmId].deployed += p.project_modules.filter((m: any) => m.status === 'deployed').length;
        }
      });

      pmLeaderboard = Object.entries(pmStats)
        .filter(([_, stat]) => stat.total > 0)
        .map(([id, stat]) => ({
          pmId: id,
          pmName: stat.name,
          totalModules: stat.total,
          deployedModules: stat.deployed,
          deployedPercentage: (stat.deployed / stat.total) * 100
        }))
        .sort((a, b) => a.deployedPercentage - b.deployedPercentage)
        .slice(0, 3);
    }
  }

  // Fetch Developer Revision Leaderboard
  let devRevisionLeaderboard: { devId: string; devName: string; totalRevisions: number; totalModules: number }[] = [];
  
  const { data: devRpcData, error: devRpcError } = await supabaseServer.rpc('get_dev_revision_leaderboard');
  
  if (devRpcError) {
    console.error("Dev RPC Error:", devRpcError);
  }

  if (!devRpcError && devRpcData) {
    devRevisionLeaderboard = devRpcData.map((row: any) => ({
      devId: row.dev_id,
      devName: row.dev_name,
      totalRevisions: Number(row.total_revisions),
      totalModules: Number(row.total_modules)
    }));
  } else {
    // Fallback logic for Developer Revisions
    const [ { data: allModulesForLeaderboard }, { data: allProfiles } ] = await Promise.all([
      supabaseServer
        .from('project_modules')
        .select('id, assigned_developer_id, revision_count'),
      supabaseServer
        .from('profiles')
        .select('id, full_name')
    ]);

    if (allModulesForLeaderboard && allProfiles) {
      const profilesMap = new Map(allProfiles.map(p => [p.id, p.full_name]));
      const devStats: Record<string, { name: string; totalRevisions: number; totalModules: number }> = {};
      
      allModulesForLeaderboard.forEach((m: any) => {
        if (m.assigned_developer_id) {
          const devId = m.assigned_developer_id;
          const devName = profilesMap.get(devId) || 'Unknown Developer';
          
          if (!devStats[devId]) {
            devStats[devId] = { name: devName, totalRevisions: 0, totalModules: 0 };
          }
          
          devStats[devId].totalModules += 1;
          devStats[devId].totalRevisions += (m.revision_count || 0);
        }
      });

      devRevisionLeaderboard = Object.entries(devStats)
        .filter(([_, stat]) => stat.totalRevisions > 0)
        .map(([id, stat]) => ({
          devId: id,
          devName: stat.name,
          totalRevisions: stat.totalRevisions,
          totalModules: stat.totalModules
        }))
        .sort((a, b) => b.totalRevisions - a.totalRevisions)
        .slice(0, 3);
    }
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 dark:bg-slate-900 p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-transparent dark:border-slate-800 transition-colors duration-300">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white dark:text-white mb-6">{title}</h1>
      
      <StatusFilter currentStatus={currentStatus} />
      
      {(profile.role === 'system_auditor' || profile.role === 'project_manager' || profile.role === 'super_admin') ? (
        <div className="space-y-8 mb-10">
          <div className="grid grid-cols-2 gap-6">
            {(profile.role === 'project_manager' || profile.role === 'super_admin') ? (
              <>
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">Projects Handled</h3>
                  <p className="text-4xl font-black text-[var(--sys-primary)]">{totalProjects}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">Overall Progress</h3>
                  <p className="text-4xl font-black text-blue-600">{overallProgress}%</p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">Assigned Projects</h3>
                  <p className="text-4xl font-black text-[var(--sys-primary)]">{totalProjects}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">Modules For QA</h3>
                  <p className="text-4xl font-black text-blue-600">{totalForQaModules}</p>
                </div>
              </>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">Your Projects</h3>
              <Link href="/projects" className="text-sm font-bold text-blue-600 hover:text-blue-800 dark:text-blue-300 transition-colors">
                View All →
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayProjects.slice(0, 6).map((project: any) => {
                const projectTotalModules = project.project_modules?.length || 0;
                let gradientString = '#f3f4f6 0% 100%';
                
                const statusColors: Record<string, string> = {
                  pending: '#9ca3af',      // Gray
                  development: '#3b82f6',  // Blue
                  pm_review: '#a855f7',    // Purple
                  for_qa: '#f97316',       // Orange
                  auditing: '#f59e0b',     // Amber
                  revision: '#ef4444',     // Red
                  revising: '#f43f5e',     // Rose
                  qa_approved: '#22c55e',  // Green
                  deployment: '#6366f1',   // Indigo
                  deployed: '#10b981'      // Emerald
                };
                
                const statusCounts = project.project_modules?.reduce((acc: any, m: any) => {
                  const status = m.status || 'pending';
                  acc[status] = (acc[status] || 0) + 1;
                  return acc;
                }, {}) || {};
                
                const order = ['deployed', 'deployment', 'qa_approved', 'auditing', 'for_qa', 'revising', 'revision', 'pm_review', 'development', 'pending'];
                const presentStatuses = Object.keys(statusCounts).sort((a, b) => order.indexOf(a) - order.indexOf(b));

                const pieChartData = presentStatuses.map(status => ({
                  id: status,
                  value: statusCounts[status] || 0,
                  color: statusColors[status] || '#94a3b8'
                }));
                
                const completedModules = currentStatus === 'all' ? projectTotalModules : (project.project_modules?.filter((m: any) => m.status === currentStatus).length || 0);
                const progressPercentage = projectTotalModules === 0 ? 0 : Math.round((completedModules / projectTotalModules) * 100);
                
                return (
                  <div key={project.id} className="flex flex-col p-6 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-full">
                        <div className="flex justify-between items-center gap-2 mb-2">
                          <h4 className="text-lg font-black text-[var(--sys-primary)] line-clamp-1 group-hover:text-blue-600 transition-colors">
                            {project.name}
                          </h4>
                          <span className="text-[10px] text-gray-400 dark:text-gray-400 font-semibold bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded-md border border-gray-100 dark:border-slate-800 whitespace-nowrap">
                            Due {project.target_date || 'Not set'}
                          </span>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                          project.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-50 dark:bg-slate-800 text-blue-700 border border-blue-100'
                        }`}>
                          {project.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center flex-1 py-6">
                      <div className="relative w-32 h-32 rounded-full flex items-center justify-center bg-gray-50 dark:bg-slate-800 shadow-inner">
                        <div className="absolute inset-0 z-0">
                          <ProjectPieChart data={pieChartData} activeId={currentStatus} />
                        </div>
                        <div className="absolute inset-6 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm z-10 pointer-events-none">
                          <span className="text-xl font-black text-[var(--sys-primary)]">{progressPercentage}%</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 mt-4 tracking-widest uppercase">PROJECT PROGRESS</span>
                    </div>
                    
                    <Link href={`/projects/${project.id}`} className="absolute inset-0 z-10">
                      <span className="sr-only">View Project {project.name}</span>
                    </Link>
                  </div>
                );
              })}
              {displayProjects.length === 0 && (
                <div className="col-span-full">
                  <p className="text-gray-500 text-sm font-medium text-center py-10 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                    {profile.role === 'project_manager' ? 'You have not created any projects yet.' : 'You are not assigned to any projects yet.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-sm font-medium mb-10">
          You have successfully authenticated. Features corresponding to your role will appear in the navigation bar.
        </p>
      )}

      {pmLeaderboard.length > 0 && (
        <div className="mt-12 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-8 rounded-2xl shadow-sm">
          <h2 className="text-xl font-black text-[var(--sys-primary)] mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
            Lowest Deployment Rates (Top 3 Project Managers)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pmLeaderboard.map((pm, idx) => (
              <div key={pm.pmId} className="bg-gray-50 dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 flex flex-col items-center text-center relative overflow-hidden group">
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500"></div>
                <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center text-2xl font-bold text-gray-700 dark:text-gray-200 shadow-sm mb-4 border-2 border-gray-100 dark:border-slate-600">
                  {idx + 1}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">{pm.pmName}</h3>
                <p className="text-3xl font-black text-red-500 mb-2">{Math.round(pm.deployedPercentage)}%</p>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {pm.deployedModules} of {pm.totalModules} Deployed
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {devRevisionLeaderboard.length > 0 && (
        <div className="mt-8 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-8 rounded-2xl shadow-sm">
          <h2 className="text-xl font-black text-[var(--sys-primary)] mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Highest Revision Counts (Top 3 Developers)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {devRevisionLeaderboard.map((dev, idx) => (
              <div key={dev.devId} className="bg-gray-50 dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 flex flex-col items-center text-center relative overflow-hidden group">
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-rose-400 to-red-500"></div>
                <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center text-2xl font-bold text-gray-700 dark:text-gray-200 shadow-sm mb-4 border-2 border-gray-100 dark:border-slate-600">
                  {idx + 1}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">{dev.devName}</h3>
                <p className="text-3xl font-black text-rose-500 mb-2">{dev.totalRevisions}</p>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Revisions across {dev.totalModules} Modules
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
