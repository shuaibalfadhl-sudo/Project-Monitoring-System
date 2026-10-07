import { getUserProfile } from '@/lib/auth-utils'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

export default async function DashboardPage() {
  const profile = await getUserProfile()

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
      approvedModules += p.project_modules.filter((m: any) => m.status === 'qa_approved').length
      totalForQaModules += p.project_modules.filter((m: any) => m.status === 'for_qa').length
    }
  })
  
  totalProjects = displayProjects.length
  const overallProgress = totalModules === 0 ? 0 : Math.round((approvedModules / totalModules) * 100)

  return (
    <div className="w-full bg-white dark:bg-slate-900 dark:bg-slate-900 p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-transparent dark:border-slate-800 transition-colors duration-300">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white dark:text-white mb-6">{title}</h1>
      
      <div className="p-6 mb-8 bg-blue-50 dark:bg-slate-800 border border-blue-100 rounded-2xl">
        <h2 className="text-lg font-bold text-blue-900 dark:text-blue-400 mb-4">User Profile</h2>
        <div className="space-y-2">
          <p className="text-blue-800 dark:text-blue-300 text-sm">
            <span className="font-semibold w-24 inline-block">Name:</span> {profile.full_name || 'N/A'}
          </p>
          <p className="text-blue-800 dark:text-blue-300 text-sm">
            <span className="font-semibold w-24 inline-block">Email:</span> {profile.email}
          </p>
          <p className="text-blue-800 dark:text-blue-300 text-sm">
            <span className="font-semibold w-24 inline-block">Role:</span> 
            <span className="ml-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-200 text-blue-800 dark:text-blue-300 capitalize">
              {profile.role.replace('_', ' ')}
            </span>
          </p>
        </div>
      </div>

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
                  pending: '#94a3b8',      // Slate / Cool Gray
                  development: '#3b82f6',  // Royal Blue
                  pm_review: '#6366f1',    // Indigo / Violet
                  for_qa: '#f59e0b',       // Amber / Warm Yellow
                  auditing: '#0ea5e9',     // Cyan / Teal
                  rework: '#e11d48',       // Crimson / Rose Red
                  qa_approved: '#10b981'   // Emerald Green
                };
                
                const statusCounts = project.project_modules?.reduce((acc: any, m: any) => {
                  const status = m.status || 'pending';
                  acc[status] = (acc[status] || 0) + 1;
                  return acc;
                }, {}) || {};
                
                const order = ['qa_approved', 'auditing', 'for_qa', 'pm_review', 'development', 'rework', 'pending'];
                const presentStatuses = Object.keys(statusCounts).sort((a, b) => order.indexOf(a) - order.indexOf(b));

                if (projectTotalModules > 0) {
                  let currentPercentage = 0;
                  const gradientParts = presentStatuses.map(status => {
                    const percentage = (statusCounts[status] / projectTotalModules) * 100;
                    const color = statusColors[status] || '#94a3b8';
                    const part = `${color} ${currentPercentage}% ${currentPercentage + percentage}%`;
                    currentPercentage += percentage;
                    return part;
                  });
                  
                  gradientString = gradientParts.join(', ');
                }
                
                const completedModules = project.project_modules?.filter((m: any) => m.status === 'qa_approved').length || 0;
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
                      <div className="relative w-28 h-28 rounded-full flex items-center justify-center bg-gray-50 dark:bg-slate-800 shadow-inner" style={{ background: `conic-gradient(${gradientString})` }}>
                        <div className="absolute inset-4 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-xl font-black text-[var(--sys-primary)]">{progressPercentage}%</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 mt-4 tracking-widest uppercase">PROGRESS</span>
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
