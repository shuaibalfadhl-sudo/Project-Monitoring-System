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
  
  let gradientString = '#f3f4f6 0% 100%';
  const statusCounts: Record<string, number> = {};
  const statusColors: Record<string, string> = {
    pending: '#94a3b8',
    development: '#3b82f6',
    pm_review: '#6366f1',
    for_qa: '#f59e0b',
    auditing: '#0ea5e9',
    rework: '#e11d48',
    qa_approved: '#10b981'
  };
  
  let presentStatuses: string[] = [];

  if (totalModules > 0) {
    modules?.forEach(m => {
      const status = m.status || 'pending';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    const order = ['qa_approved', 'auditing', 'for_qa', 'pm_review', 'development', 'rework', 'pending'];
    presentStatuses = Object.keys(statusCounts).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    
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
  
  const p_approved = totalModules > 0 ? ((statusCounts['qa_approved'] || 0) / totalModules) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* HEADER CARD */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-[#2d3748] mb-3">{project.name}</h1>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 capitalize border border-blue-100">
                {project.status.replace('_', ' ')}
              </span>
              <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                {project.start_date || 'N/A'} — {project.target_date || 'N/A'}
              </span>
            </div>
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
            
            <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Project Members</h3>
                <div className="flex gap-3 items-center">
                  <ViewAllMembersModal members={processedMembers} isManager={isManager} />
                  {isManager && (
                    <Link href={`/projects/${project.id}/members/new`} className="text-xs font-bold text-blue-600 hover:text-blue-800">
                      + Add Member
                    </Link>
                  )}
                </div>
              </div>
              
              <div className="space-y-3 flex-1 overflow-y-auto">
                {processedMembers.slice(0, 3).map((member: any) => {
                  return (
                  <div key={member.user_id || member.id} className={`flex justify-between items-center p-3 rounded-xl border ${member.is_owner ? 'bg-blue-50/50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#2d3748]">{member.full_name || 'Unnamed member'}</p>
                      {member.is_owner && (
                        <span className="bg-blue-100 text-blue-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Owner</span>
                      )}
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
          </div>
          
          <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Module Status</h3>
            <div className="w-full space-y-3">
              {presentStatuses.length > 0 ? presentStatuses.map(status => (
                <div key={status} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: statusColors[status] }}></div>
                    <span className="text-sm font-bold text-gray-700 capitalize">{status.replace('_', ' ')}</span>
                  </div>
                  <span className="text-base font-black text-[#2d3748]">{statusCounts[status]}</span>
                </div>
              )) : (
                <div className="text-center py-4">
                  <span className="text-sm font-semibold text-gray-500">No modules yet</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col justify-center items-center">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-8 w-full">QA Progress</h3>
            <div className="flex-1 flex flex-col justify-center items-center py-4">
              <div 
                className="w-48 h-48 rounded-full relative shadow-inner"
                style={{ background: `conic-gradient(${gradientString})` }}
              >
                <div className="absolute inset-5 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
                  <span className="text-4xl font-black text-[#2d3748] tracking-tighter">{Math.round(p_approved)}%</span>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 text-center leading-tight">QA<br/>Apprv</span>
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
