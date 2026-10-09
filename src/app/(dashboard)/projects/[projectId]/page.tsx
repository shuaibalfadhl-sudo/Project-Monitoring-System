import { createClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProjectModule } from '@/types/project'
import ViewAllMembersModal from '@/components/ViewAllMembersModal'
import ModuleList from '@/components/modules/ModuleList'
import EditProjectModal from '@/components/projects/EditProjectModal'
import RemoveMemberButton from '@/components/projects/RemoveMemberButton'
import StatusFilter from '@/components/dashboard/StatusFilter'
import ProjectPieChart from '@/components/dashboard/ProjectPieChart'

export default async function ProjectDetailsPage({ params, searchParams }: { params: Promise<{ projectId: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await params
  const paramsSearch = await searchParams;
  const currentStatus = typeof paramsSearch?.status === 'string' ? paramsSearch.status : 'deployed';

  const supabase = await createClient()

  // Wait for auth to resolve
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isSuperAdmin = await hasRole('super_admin')
  const isManager = (await hasRole('project_manager')) || isSuperAdmin
  const isAuditor = await hasRole('system_auditor')
  const isDeveloper = await hasRole('developer')

  if (!isManager && !isAuditor && !isDeveloper) redirect('/dashboard')

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

  // Fetch all profiles to map auditor/PM names
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, full_name')
  
  const profilesMap = new Map(allProfiles?.map(p => [p.id, p.full_name]) || [])

  const mappedModules = modules?.map(m => ({
    ...m,
    qa_acknowledged_by_name: m.qa_acknowledged_by ? profilesMap.get(m.qa_acknowledged_by) : null,
    qa_result_acknowledged_by_name: m.qa_result_acknowledged_by ? profilesMap.get(m.qa_result_acknowledged_by) : null
  })) || []

  const totalModules = mappedModules.length
  
  let gradientString = '#f3f4f6 0% 100%';
  const statusCounts: Record<string, number> = {};
  const statusColors: Record<string, string> = {
    pending: '#9ca3af',
    development: '#3b82f6',
    pm_review: '#a855f7',
    for_qa: '#f97316',
    auditing: '#f59e0b',
    revision: '#ef4444',
    revising: '#f43f5e',
    qa_approved: '#22c55e',
    deployment: '#6366f1',
    deployed: '#10b981'
  };
  
  let presentStatuses: string[] = [];
  let pieChartData: any[] = [];

  if (totalModules > 0) {
    mappedModules.forEach(m => {
      const status = m.status || 'pending';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    const order = ['deployed', 'deployment', 'qa_approved', 'auditing', 'for_qa', 'revising', 'revision', 'pm_review', 'development', 'pending'];
    presentStatuses = Object.keys(statusCounts).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    
    pieChartData = presentStatuses.map(status => ({
      id: status,
      value: statusCounts[status] || 0,
      color: statusColors[status] || '#94a3b8'
    }));
  }
  
  const p_approved = totalModules > 0 ? (currentStatus === 'all' ? 100 : ((statusCounts[currentStatus] || 0) / totalModules) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* HEADER CARD */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-transparent dark:border-slate-800 p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-[var(--sys-primary)] mb-3">{project.name}</h1>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 capitalize border border-blue-100 dark:border-blue-800/50">
                {project.status === 'qa_approved' ? 'QA Approved' : project.status === 'for_qa' ? 'For QA' : project.status.replace('_', ' ')}
              </span>
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-gray-100 dark:border-slate-700">
                {project.start_date || 'N/A'} — {project.target_date || 'N/A'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/projects" className="text-sm font-semibold text-gray-500 dark:text-slate-400 hover:text-[var(--sys-primary)] dark:hover:text-[var(--sys-primary)]">
              ← Back to Projects
            </Link>
            {isManager && (
              <EditProjectModal project={project} />
            )}
          </div>
        </div>
        
        <div className="mt-6 border-t border-gray-100 dark:border-slate-800 pt-6">
          <StatusFilter currentStatus={currentStatus} />
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8 mt-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-gray-700 dark:text-slate-300 font-medium leading-relaxed">{project.description || 'No description provided.'}</p>
            </div>
            
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm dark:shadow-none flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Project Members</h3>
                <div className="flex gap-3 items-center">
                  <ViewAllMembersModal members={processedMembers} isManager={isManager} projectId={project.id} />
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
                  <div key={member.user_id || member.id} className={`flex justify-between items-center p-3 rounded-xl border ${member.is_owner ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/40' : 'bg-gray-50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-700'}`}>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[var(--sys-primary)]">{member.full_name || 'Unnamed member'}</p>
                      {member.is_owner && (
                        <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Owner</span>
                      )}
                    </div>
                    {isManager && !member.is_owner && (
                      <RemoveMemberButton projectId={project.id} userId={member.user_id || member.id} />
                    )}
                  </div>
                )})}
                
                {processedMembers.length > 3 && (
                  <div className="text-center pt-2 border-t border-gray-100 dark:border-slate-800 mt-2">
                    <p className="text-xs font-bold text-gray-400 dark:text-slate-500 mt-2">+{processedMembers.length - 3} more members...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm dark:shadow-none flex flex-col justify-center">
            <h3 className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-6">Module Status</h3>
            <div className="w-full space-y-3">
              {presentStatuses.length > 0 ? presentStatuses.map(status => (
                <div key={status} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: statusColors[status] }}></div>
                    <span className={`text-sm font-bold text-gray-700 dark:text-slate-300 ${status === 'qa_approved' || status === 'for_qa' ? '' : 'capitalize'}`}>{status === 'qa_approved' ? 'QA Approved' : status === 'for_qa' ? 'For QA' : status.replace('_', ' ')}</span>
                  </div>
                  <span className="text-base font-black text-[var(--sys-primary)]">{statusCounts[status]}</span>
                </div>
              )) : (
                <div className="text-center py-4">
                  <span className="text-sm font-semibold text-gray-500 dark:text-slate-400">No modules yet</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm dark:shadow-none flex flex-col justify-center items-center">
            <h3 className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-8 w-full">Project Progress</h3>
            <div className="flex-1 flex flex-col justify-center items-center py-4">
              <div className="w-56 h-56 rounded-full relative shadow-inner bg-gray-50 dark:bg-slate-800">
                <div className="absolute inset-0 z-0">
                  <ProjectPieChart data={typeof pieChartData !== 'undefined' ? pieChartData : []} activeId={currentStatus} />
                </div>
                <div className="absolute inset-8 bg-white dark:bg-slate-900 rounded-full flex flex-col items-center justify-center shadow-sm z-10 pointer-events-none">
                  <span className="text-5xl font-black text-[var(--sys-primary)] tracking-tighter">{Math.round(p_approved)}%</span>
                  <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-1 text-center leading-tight break-all px-2">
                    {currentStatus === 'qa_approved' ? 'QA Approved' : currentStatus === 'for_qa' ? 'For QA' : currentStatus.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODULES LIST */}
      <ModuleList 
        modules={mappedModules} 
        projectId={project.id} 
        isManager={isManager} 
        isAuditor={isAuditor}
        isDeveloper={isDeveloper}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  )
}
