import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import QaMonitoringClient from '@/components/modules/QaMonitoringClient'

export default async function TraineeApprovePage() {
  const profile = await getUserProfile()

  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'system_auditor')) {
    redirect('/dashboard')
  }

  const supabaseServer = await createClient()
  const isSuperAdmin = profile.role === 'super_admin'
  const cookieStore = await cookies()
  const activeCompanyId = cookieStore.get('activeCompanyId')?.value || null

  let query = supabaseServer
    .from('project_modules')
    .select(`
      id,
      name,
      description,
      priority,
      status,
      module_document_url,
      qa_result_document_url,
      website_link,
      prototype,
      platform,
      workstream,
      on_hold_remarks,
      qa_acknowledged_by,
      assigned_developer_id,
      assigned_auditor,
      updated_at,
      projects!inner (
        id,
        name,
        created_by,
        company_id
      )
    `)
    .eq('status', 'trainee_approve')

  if (activeCompanyId && !isSuperAdmin) {
    query = query.eq('projects.company_id', activeCompanyId)
  }

  const { data } = await query

  const modules = (data || []).flatMap((module) => {
    const project = Array.isArray(module.projects) ? module.projects[0] : module.projects
    if (!project) return []

    return [{
      ...module,
      project: {
        id: project.id,
        name: project.name,
        created_by: project.created_by,
      },
    }]
  })

  const profileIds = new Set(
    modules.flatMap((module) => [
      module.project.created_by,
      module.qa_acknowledged_by,
      module.assigned_developer_id,
      module.assigned_auditor,
    ].filter((id): id is string => Boolean(id))),
  )

  let profilesMap = new Map<string, string>()
  if (profileIds.size > 0) {
    const { data: profiles } = await supabaseServer
      .from('profiles')
      .select('id, full_name')
      .in('id', [...profileIds])

    profilesMap = new Map(profiles?.map((item) => [item.id, item.full_name]) || [])
  }

  const priorityRank = (priority?: string) => {
    switch (priority) {
      case 'critical': return 0
      case 'high': return 1
      case 'medium': return 2
      case 'low': return 3
      default: return 4
    }
  }

  const initialModules = modules
    .map((module) => ({
      ...module,
      auditor_name: module.qa_acknowledged_by
        ? profilesMap.get(module.qa_acknowledged_by) || null
        : null,
      assigned_developer_name: module.assigned_developer_id
        ? profilesMap.get(module.assigned_developer_id) || null
        : null,
      assigned_auditor_name: module.assigned_auditor
        ? profilesMap.get(module.assigned_auditor) || null
        : null,
      project: {
        ...module.project,
        creator_name: module.project.created_by
          ? profilesMap.get(module.project.created_by)
          : undefined,
      },
    }))
    .sort((a, b) => {
      const priorityDifference = priorityRank(a.priority) - priorityRank(b.priority)
      if (priorityDifference !== 0) return priorityDifference
      return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
    })

  return (
    <QaMonitoringClient
      initialModules={initialModules}
      title="Trainee Approve"
      countLabel="Total Modules Pending Final QA"
      showStatusFilter={false}
      emptyMessage="No modules are waiting for final QA approval."
    />
  )
}
