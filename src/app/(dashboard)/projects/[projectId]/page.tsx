import { createClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProjectModule } from '@/types/project'
import ViewAllMembersModal from '@/components/ViewAllMembersModal'
import ModuleList from '@/components/modules/ModuleList'

export default async function ProjectDetailsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  // Wait for auth to resolve
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isManager = await hasRole('project_manager')
  const isAuditor = await hasRole('system_auditor')

  if (!isManager && !isAuditor) redirect('/dashboard')

  // RLS ensures only the creator (manager) or assigned member (auditor) can fetch this project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', resolvedParams.projectId)
    .single()

  if (projectError || !project) {
    redirect('/projects') // Blocked by RLS
  }

  // Get members via secure RPC
  const { data: members } = await supabase.rpc('get_project_member_names', {
    p_project_id: project.id
  })

  const processedMembers = members?.map((member: any) => ({
    ...member,
    is_owner: member.user_id === project.created_by || member.is_owner
  })) || []

  const { data: modules } = await supabase
    .from('project_modules')
    .select('*')
    .eq('project_id', project.id)
    .order('priority', { ascending: true })

  const totalModules = modules ? modules.length : 0
  
  const stats = {
    pending: modules ? modules.filter(m => !m.status || m.status === 'pending').length : 0,
    qa_approved: modules ? modules.filter(m => m.status === 'qa_approved').length : 0,
    rework: modules ? modules.filter(m => m.status === 'rework').length : 0,
  }

  const p_approved = totalModules > 0 ? (stats.qa_approved / totalModules) * 100 : 0
  const p_rework = totalModules > 0 ? (stats.rework / totalModules) * 100 : 0

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* HEADER CARD */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-[#2d3748] mb-2">{project.name}</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
              {project.status.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/projects" className="text-sm font-semibold text-gray-500 hover:text-[#2d3748]">
              ← Back to Projects
            </Link>
            {isManager && (
              <Link href={`/projects/${project.id}/edit`} className="py-2 px-5 bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl font-bold transition-all shadow-sm text-sm">
                Edit Project
              </Link>
            )}
          </div>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8 mt-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-gray-700 font-medium leading-relaxed">{project.description || 'No description provided.'}</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl space-y-4 border border-gray-100">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium text-sm">Start Date</span>
                <span className="font-semibold text-[#2d3748] text-sm">{project.start_date || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium text-sm">Target Date</span>
                <span className="font-semibold text-[#2d3748] text-sm">{project.target_date || 'Not set'}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Project Members</h3>
              <div className="flex gap-4 items-center">
                <ViewAllMembersModal members={processedMembers} isManager={isManager} />
                {isManager && (
                  <Link href={`/projects/${project.id}/members/new`} className="text-xs font-bold text-blue-600 hover:text-blue-800">
                    + Add Member
                  </Link>
                )}
              </div>
            </div>
            
            <div className="space-y-4 flex-1 overflow-y-auto">
              {processedMembers.slice(0, 3).map((member: any) => {
                return (
                <div key={member.user_id || member.id} className={`flex justify-between items-center p-3 rounded-xl border ${member.is_owner ? 'bg-blue-50/50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#2d3748]">{member.full_name || 'Unnamed member'}</p>
                      {member.is_owner && (
                        <span className="bg-blue-100 text-blue-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Owner</span>
                      )}
                    </div>
                  </div>
                  {isManager && !member.is_owner && (
                    <button className="text-xs font-bold text-red-500 hover:text-red-700 px-2 py-1">Remove</button>
                  )}
                </div>
              )})}
              
              {processedMembers.length > 3 && (
                <div className="text-center pt-2 border-t border-gray-100 mt-2">
                  <p className="text-xs font-bold text-gray-400 mt-2">+{processedMembers.length - 3} more members...</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">QA Progress</h3>
            <div className="flex-1 flex flex-col justify-center items-center">
              
              <div 
                className="w-32 h-32 rounded-full relative mb-6 shadow-inner"
                style={{
                  background: `conic-gradient(#10b981 0% ${p_approved}%, #ef4444 ${p_approved}% ${p_approved + p_rework}%, #f3f4f6 ${p_approved + p_rework}% 100%)`
                }}
              >
                <div className="absolute inset-0 m-auto w-[6.5rem] h-[6.5rem] bg-white rounded-full flex flex-col items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                  <span className="text-3xl font-black text-[#2d3748] tracking-tighter">{Math.round(p_approved)}%</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Done</span>
                </div>
              </div>

              <div className="w-full space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
                    <span className="text-sm font-semibold text-gray-700">QA Approved</span>
                  </div>
                  <span className="text-sm font-bold text-[#2d3748]">{stats.qa_approved}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
                    <span className="text-sm font-semibold text-gray-700">Rework</span>
                  </div>
                  <span className="text-sm font-bold text-[#2d3748]">{stats.rework}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-100 border border-gray-200"></div>
                    <span className="text-sm font-semibold text-gray-700">Pending</span>
                  </div>
                  <span className="text-sm font-bold text-[#2d3748]">{stats.pending}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODULES LIST */}
      <ModuleList 
        modules={modules || []} 
        projectId={project.id} 
        isManager={isManager} 
        isAuditor={isAuditor} 
      />
    </div>
  )
}
