import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import QaMonitoringClient from '@/components/modules/QaMonitoringClient'

export default async function QaMonitoringPage() {
  const profile = await getUserProfile()

  if (!profile || (profile.role !== 'system_auditor' && profile.role !== 'super_admin')) {
    redirect('/dashboard')
  }

  const supabaseServer = await createClient()
  
  const isSuperAdmin = profile.role === 'super_admin'
  let saProjects: any[] = []

  const cookieStore = await cookies()
  const activeCompanyId = cookieStore.get('activeCompanyId')?.value || null;

  if (isSuperAdmin) {
    let query = supabaseServer
      .from('projects')
      .select(`
        id,
        name,
        created_by,
        company_id,
        project_modules (
          id,
          name,
          description,
          priority,
          status,
          module_document_url,
          qa_result_document_url,
          website_link,
          platform,
          workstream,
          on_hold_remarks,
          qa_acknowledged_by,
          assigned_developer_id,
          developer_feedback,
          updated_at
        )
      `)
      
    if (activeCompanyId) {
      query = query.eq('company_id', activeCompanyId)
    }
    
    const { data } = await query
    
    saProjects = data || []
  } else {
    let query = supabaseServer
      .from('project_members')
      .select(`
        projects!inner (
          id,
          name,
          created_by,
          company_id,
          project_modules (
            id,
            name,
            description,
            priority,
            status,
            module_document_url,
            qa_result_document_url,
            website_link,
            platform,
            workstream,
            on_hold_remarks,
            qa_acknowledged_by,
            assigned_developer_id,
            developer_feedback,
            updated_at
          )
        )
      `)
      .eq('user_id', profile.id)
      
    if (activeCompanyId) {
      query = query.eq('projects.company_id', activeCompanyId)
    }
      
    const { data } = await query
      
    if (data) {
      saProjects = data.map(d => d.projects).filter(Boolean)
    }
  }

  const allQaModules: any[] = []

  if (saProjects.length > 0) {
    saProjects.forEach((p: any) => {
      if (p.project_modules) {
        const qaModules = p.project_modules.filter((m: any) => m.status === 'for_qa' || m.status === 'auditing')
        qaModules.forEach((m: any) => {
          allQaModules.push({
            id: m.id,
            name: m.name,
            description: m.description,
            priority: m.priority,
            status: m.status,
            module_document_url: m.module_document_url,
            qa_result_document_url: m.qa_result_document_url,
            website_link: m.website_link,
            platform: m.platform,
            workstream: m.workstream,
            on_hold_remarks: m.on_hold_remarks,
            qa_acknowledged_by: m.qa_acknowledged_by,
            assigned_developer_id: m.assigned_developer_id,
            developer_feedback: m.developer_feedback,
            updated_at: m.updated_at,
            project: {
              id: p.id,
              name: p.name,
              created_by: p.created_by
            }
          })
        })
      }
    })
  }

  // Auditing modules first, then by priority (critical → low), then newest to oldest by updated_at
  const priorityRank = (p?: string) => {
    switch (p) {
      case 'critical': return 0
      case 'high': return 1
      case 'medium': return 2
      case 'low': return 3
      default: return 4
    }
  }
  allQaModules.sort((a, b) => {
    const aRank = a.status === 'auditing' ? 0 : 1
    const bRank = b.status === 'auditing' ? 0 : 1
    if (aRank !== bRank) return aRank - bRank
    const ap = priorityRank(a.priority)
    const bp = priorityRank(b.priority)
    if (ap !== bp) return ap - bp
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })

  // Fetch all profiles to map creator names
  const { data: allProfiles } = await supabaseServer
    .from('profiles')
    .select('id, full_name')
  
  const profilesMap = new Map(allProfiles?.map(p => [p.id, p.full_name]) || [])
  
  allQaModules.forEach((m: any) => {
    if (m.project && m.project.created_by) {
      m.project.creator_name = profilesMap.get(m.project.created_by)
    }
    if (m.qa_acknowledged_by) {
      m.auditor_name = profilesMap.get(m.qa_acknowledged_by) || null
    }
    if (m.assigned_developer_id) {
      m.assigned_developer_name = profilesMap.get(m.assigned_developer_id) || null
    }
  })

  // Build the project filter options scoped to the user's role:
  // super_admin -> all projects (in active company); system_auditor -> only projects they belong to.
  const projectOptions = saProjects
    .map((p: any) => ({ id: p.id, name: p.name }))
    .filter((p: any) => p.id);

  return <QaMonitoringClient initialModules={allQaModules} projects={projectOptions} />
}
