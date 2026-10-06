import { createClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Project } from '@/types/project'
import CreateProjectModal from '@/components/projects/CreateProjectModal'

export default async function ProjectsPage() {
  const isManager = await hasRole('project_manager')
  const isAuditor = await hasRole('system_auditor')
  
  if (!isManager && !isAuditor) {
    redirect('/dashboard')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let projects: any[] = []

  if (isManager) {
    // RLS will enforce that we only see projects created by this user
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    projects = data || []
  } else if (isAuditor) {
    // For auditors, get the projects they are a member of
    const { data } = await supabase
      .from('project_members')
      .select('projects(*)')
      .eq('user_id', user.id)
    projects = data?.map(d => d.projects).filter(Boolean) || []
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-[#2d3748]">
          {isAuditor ? 'Assigned Projects' : 'Projects'}
        </h1>
        {isManager && <CreateProjectModal />}
      </div>

      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
        {(!projects || projects.length === 0) ? (
          <div className="text-center py-12">
            <p className="text-gray-500 font-medium">
              {isAuditor ? 'You have no assigned projects.' : 'No projects found. Create your first project to get started.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: Project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow hover:border-gray-200 group">
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-[#2d3748] mb-2">{project.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">{project.description || 'No description'}</p>
                  <div className="flex justify-between items-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                      {project.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(project.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
