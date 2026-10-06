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

  async function signOut() {
    'use server'
    const supabaseServer = await createClient()
    await supabaseServer.auth.signOut()
    revalidatePath('/')
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
    <div className="max-w-4xl bg-white p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
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
            
            <div className="space-y-3">
              {saProjects.slice(0, 5).map((project: any) => (
                <div key={project.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <Link href={`/projects/${project.id}`} className="font-bold text-[#2d3748] hover:text-blue-600 transition-colors">
                      {project.name}
                    </Link>
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs font-semibold text-gray-500 capitalize">Status: {project.status.replace('_', ' ')}</span>
                      <span className="text-xs font-semibold text-gray-500">Target: {project.target_date || 'Not set'}</span>
                    </div>
                  </div>
                  <Link href={`/projects/${project.id}`} className="text-sm font-bold bg-white border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                    Open
                  </Link>
                </div>
              ))}
              {saProjects.length === 0 && (
                <p className="text-gray-500 text-sm font-medium text-center py-4">You are not assigned to any projects yet.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-sm font-medium mb-10">
          You have successfully authenticated. Features corresponding to your role will appear in the navigation bar.
        </p>
      )}

      <form action={signOut}>
        <button type="submit" className="py-2.5 px-6 bg-white border-2 border-[#2d3748] text-[#2d3748] hover:bg-slate-50 rounded-xl font-bold transition-colors">
          Logout
        </button>
      </form>
    </div>
  )
}
