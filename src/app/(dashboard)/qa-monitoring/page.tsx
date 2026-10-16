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
          qa_acknowledged_by
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
            qa_acknowledged_by
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
            qa_acknowledged_by: m.qa_acknowledged_by,
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

  // Sort by priority (1 is highest, assuming numerical priority)
  allQaModules.sort((a, b) => a.priority - b.priority)

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
  })

  // Build the project filter options scoped to the user's role:
  // super_admin -> all projects (in active company); system_auditor -> only projects they belong to.
  const projectOptions = saProjects
    .map((p: any) => ({ id: p.id, name: p.name }))
    .filter((p: any) => p.id);

  return <QaMonitoringClient initialModules={allQaModules} projects={projectOptions} />
}
