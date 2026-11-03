import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { scopeProjectsToCreatedOrMember } from '@/lib/projectScope'
import DeploymentClient from '@/components/modules/DeploymentClient'

export default async function DeploymentPage() {
  const profile = await getUserProfile()

  if (!profile || (profile.role !== 'devops' && profile.role !== 'super_admin')) {
    redirect('/dashboard')
  }

  const supabaseServer = await createClient()
  
  let projectsQuery = supabaseServer
    .from('projects')
    .select(`
      id,
      name,
      company_id,
      project_modules (
        id,
        name,
        description,
        priority,
        status,
        module_document_url,
        qa_result_document_url,
        qa_acknowledged_at,
        qa_acknowledged_by,
        website_link,
        deadline,
        category,
        platform,
        workstream,
        on_hold_remarks,
        assigned_developer_id
      )
    `)

  const cookieStore = await cookies()
  const activeCompanyId = cookieStore.get('activeCompanyId')?.value || null;

  if (activeCompanyId) {
    projectsQuery = projectsQuery.eq('company_id', activeCompanyId)
  }

  // DevOps sees every project in their company (RLS scopes to their companies),
  // so only non-privileged, non-devops roles are restricted to their own projects.
  if (profile.role !== 'super_admin' && profile.role !== 'devops') {
    projectsQuery = await scopeProjectsToCreatedOrMember(projectsQuery, supabaseServer, profile.id)
  }

  const { data: projects } = await projectsQuery

  const deploymentModules: any[] = []

  if (projects) {
    projects.forEach((p: any) => {
      if (p.project_modules) {
        const mods = p.project_modules.filter((m: any) => m.status === 'deployment')
        mods.forEach((m: any) => {
          deploymentModules.push({
            ...m,
            project_id: p.id,
            project: { id: p.id, name: p.name }
          })
        })
      }
    })
  }

  if (deploymentModules.length > 0) {
    const profileIds = [...new Set(
      deploymentModules.flatMap(m => [m.qa_acknowledged_by, m.assigned_developer_id]).filter(Boolean)
    )]
    if (profileIds.length > 0) {
      const { data: people } = await supabaseServer
        .from('profiles')
        .select('id, full_name')
        .in('id', profileIds)

      const nameMap = new Map(people?.map(p => [p.id, p.full_name]) || [])
      deploymentModules.forEach(m => {
        if (m.qa_acknowledged_by) {
          m.auditor_name = nameMap.get(m.qa_acknowledged_by)
        }
        if (m.assigned_developer_id) {
          m.developer_name = nameMap.get(m.assigned_developer_id)
        }
      })
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          For Deployment
        </h1>
      </div>

      <DeploymentClient initialModules={deploymentModules} />
    </div>
  )
}
