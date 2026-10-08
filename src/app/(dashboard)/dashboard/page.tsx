import { getUserProfile } from '@/lib/auth-utils'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import DashboardRealtime from '@/components/dashboard/DashboardRealtime'

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

  const cookieStore = await cookies()
  const activeCompanyId = cookieStore.get('activeCompanyId')?.value || null;

  const supabaseServer = await createClient()

  if (profile.role === 'system_auditor') {
    let query = supabaseServer
      .from('project_members')
      .select(`
        projects!inner (
          id,
          name,
          status,
          target_date,
          company_id,
          project_members ( user_id ),
          project_modules (
            id,
            status
          )
        )
      `)
      .eq('user_id', profile.id)
      
    if (activeCompanyId) {
      query = query.eq('projects.company_id', activeCompanyId)
    }

    const { data } = await query

    if (data) {
      displayProjects = data.map((d: any) => d.projects).filter(Boolean)
    }
  } else if (profile.role === 'project_manager' || profile.role === 'super_admin') {
    let query = supabaseServer
      .from('projects')
      .select(`
        id,
        name,
        status,
        target_date,
        company_id,
        project_members ( user_id ),
        project_modules (
          id,
          status
        )
      `)
      .order('created_at', { ascending: false })

    if (activeCompanyId) {
      query = query.eq('company_id', activeCompanyId)
    }
    
    const { data } = await query

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

  return (
    <div className="w-full bg-white dark:bg-slate-900 dark:bg-slate-900 p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-transparent dark:border-slate-800 transition-colors duration-300">
      <DashboardRealtime />
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white dark:text-white mb-6">{title}</h1>
      
      <StatusFilter currentStatus={currentStatus} />
      
      {(profile.role === 'system_auditor' || profile.role === 'project_manager' || profile.role === 'super_admin') ? (
        <div className="space-y-8 mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {(profile.role === 'project_manager' || profile.role === 'super_admin') ? (
              <>
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <h3 className="text-sm font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">Projects Handled</h3>
                  <p className="text-4xl font-black text-[var(--sys-primary)]">{totalProjects}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <h3 className="text-sm font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">Overall Progress</h3>
                  <p className="text-4xl font-black text-blue-600">{overallProgress}%</p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <h3 className="text-sm font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">Assigned Projects</h3>
                  <p className="text-4xl font-black text-[var(--sys-primary)]">{totalProjects}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm animate-slide-up" style={{ animationDelay: '0.2s' }}>
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
              {displayProjects.slice(0, 6).map((project: any, idx: number) => {
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
                
                const targetStatus = currentStatus === 'all' ? 'deployed' : currentStatus;
                const completedModules = project.project_modules?.filter((m: any) => m.status === targetStatus).length || 0;
                const progressPercentage = projectTotalModules === 0 ? 0 : Math.round((completedModules / projectTotalModules) * 100);
                const remainingModules = projectTotalModules - completedModules;
                
                const pieChartData = projectTotalModules === 0 ? [] : [
                  { id: targetStatus, value: completedModules, color: statusColors[targetStatus] || '#10b981' },
                  { id: 'remaining', value: remainingModules, color: '#f3f4f6' }
                ];
                
                const teamCount = project.project_members?.length || 0;
                
                return (
                  <div key={project.id} className="flex flex-col p-6 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group animate-scale-in" style={{ animationDelay: `${0.2 + idx * 0.1}s` }}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex flex-col items-start gap-2 max-w-[60%]">
                        <h4 className="text-lg font-black text-indigo-600 line-clamp-1 group-hover:text-indigo-700 transition-colors">
                          {project.name}
                        </h4>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize ${
                          project.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                        }`}>
                          {project.status === 'qa_approved' ? 'QA Approved' : project.status === 'for_qa' ? 'For QA' : project.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">DUE DATE</span>
                        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800 px-2.5 py-1 rounded border border-gray-100 dark:border-slate-700">
                          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-bold">{project.target_date || 'Not set'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center flex-1 py-8">
                      <div className="relative w-40 h-40 rounded-full flex items-center justify-center">
                        <div className="absolute inset-0 z-0 scale-[1.15]">
                          <ProjectPieChart data={pieChartData} activeId={undefined} />
                        </div>
                        <div className="absolute inset-4 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-[inset_0_2px_10px_rgb(0,0,0,0.02)] z-10 pointer-events-none">
                          <span className="text-2xl font-black text-slate-800 dark:text-white">{progressPercentage}%</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-6 tracking-widest uppercase">PROJECT PROGRESS</span>
                    </div>
                    
                    <div className="mt-4 border-t border-gray-100 dark:border-slate-800 pt-6 flex">
                      <div className="flex-1 flex flex-col items-center justify-center border-r border-gray-100 dark:border-slate-800">
                        <span className="text-xl font-black text-slate-800 dark:text-white leading-none mb-1">{projectTotalModules}</span>
                        <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">TASKS</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-slate-800 dark:text-white leading-none mb-1">{teamCount}</span>
                        <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">TEAM</span>
                      </div>
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

    </div>
  )
}
