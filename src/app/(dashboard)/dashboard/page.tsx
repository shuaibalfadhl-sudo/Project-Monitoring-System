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

  // Fetch SA specific data
  let saProjects: any[] = []
  let totalForQaModules = 0

  if (profile.role === 'system_auditor') {
    const supabaseServer = await createClient()
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
      saProjects = data.map(d => d.projects).filter(Boolean)
      saProjects.forEach((p: any) => {
        if (p.project_modules) {
          totalForQaModules += p.project_modules.filter((m: any) => m.status === 'for_qa').length
        }
      })
    }
  }

  return (
    <div className={`${profile.role === 'system_auditor' ? 'w-full' : 'max-w-4xl'} bg-white p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]`}>
      <h1 className="text-3xl font-extrabold text-[#2d3748] mb-6">{title}</h1>
      
      <div className="p-6 mb-8 bg-blue-50 border border-blue-100 rounded-2xl">
        <h2 className="text-lg font-bold text-blue-900 mb-4">User Profile</h2>
        <div className="space-y-2">
          <p className="text-blue-800 text-sm">
            <span className="font-semibold w-24 inline-block">Name:</span> {profile.full_name || 'N/A'}
          </p>
          <p className="text-blue-800 text-sm">
            <span className="font-semibold w-24 inline-block">Email:</span> {profile.email}
          </p>
          <p className="text-blue-800 text-sm">
            <span className="font-semibold w-24 inline-block">Role:</span> 
            <span className="ml-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-200 text-blue-800 capitalize">
              {profile.role.replace('_', ' ')}
            </span>
          </p>
        </div>
      </div>

      {profile.role === 'system_auditor' ? (
        <div className="space-y-8 mb-10">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Assigned Projects</h3>
              <p className="text-4xl font-black text-[#2d3748]">{saProjects.length}</p>
            </div>
            <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Modules For QA</h3>
              <p className="text-4xl font-black text-blue-600">{totalForQaModules}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Your Projects</h3>
              <Link href="/projects" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                View All →
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {saProjects.slice(0, 6).map((project: any) => {
                const totalModules = project.project_modules?.length || 0;
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
                
                // Order statuses logically
                const order = ['qa_approved', 'auditing', 'for_qa', 'pm_review', 'development', 'rework', 'pending'];
                const presentStatuses = Object.keys(statusCounts).sort((a, b) => order.indexOf(a) - order.indexOf(b));

                if (totalModules > 0) {
                  let currentPercentage = 0;
                  const gradientParts = presentStatuses.map(status => {
                    const percentage = (statusCounts[status] / totalModules) * 100;
                    const color = statusColors[status] || '#94a3b8';
                    const part = `${color} ${currentPercentage}% ${currentPercentage + percentage}%`;
                    currentPercentage += percentage;
                    return part;
                  });
                  
                  gradientString = gradientParts.join(', ');
                }
                
                const completedModules = project.project_modules?.filter((m: any) => m.status === 'qa_approved').length || 0;
                const progressPercentage = totalModules === 0 ? 0 : Math.round((completedModules / totalModules) * 100);
                
                return (
                  <div key={project.id} className="flex flex-col p-6 bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-full">
                        <div className="flex justify-between items-center gap-2 mb-2">
                          <h4 className="text-lg font-black text-[#2d3748] line-clamp-1 group-hover:text-blue-600 transition-colors">
                            {project.name}
                          </h4>
                          <span className="text-[10px] text-gray-400 font-semibold bg-gray-50 px-2 py-1 rounded-md border border-gray-100 whitespace-nowrap">
                            Due {project.target_date || 'Not set'}
                          </span>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                          project.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {project.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center flex-1 py-6">
                      <div className="relative w-28 h-28 rounded-full flex items-center justify-center bg-gray-50 shadow-inner" style={{ background: `conic-gradient(${gradientString})` }}>
                        <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-xl font-black text-[#2d3748]">{progressPercentage}%</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 mt-4 tracking-widest uppercase">PROGRESS</span>
                    </div>
                    
                    <Link href={`/projects/${project.id}`} className="absolute inset-0 z-10">
                      <span className="sr-only">View Project {project.name}</span>
                    </Link>
                  </div>
                );
              })}
              {saProjects.length === 0 && (
                <div className="col-span-full">
                  <p className="text-gray-500 text-sm font-medium text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">You are not assigned to any projects yet.</p>
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
