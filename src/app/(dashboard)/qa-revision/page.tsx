import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import QaRevisionClient from '@/components/modules/QaRevisionClient'

export default async function QaRevisionPage() {
  const profile = await getUserProfile()

  if (!profile || (profile.role !== 'project_manager' && profile.role !== 'super_admin')) {
    redirect('/dashboard')
  }

  const supabaseServer = await createClient()

  // Fetch projects owned by PM (or all projects if Super Admin) with rework modules
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
        qa_result_acknowledged_at,
        qa_result_acknowledged_by,
        assigned_developer_id,
        website_link,
        deadline,
        category,
        platform,
        workstream,
        on_hold_remarks
      )
    `)

  const cookieStore = await cookies()
  const activeCompanyId = cookieStore.get('activeCompanyId')?.value || null;

  if (activeCompanyId) {
    projectsQuery = projectsQuery.eq('company_id', activeCompanyId)
  }

  if (profile.role !== 'super_admin') {
    projectsQuery = projectsQuery.eq('created_by', profile.id)
  }

  const { data: projects } = await projectsQuery

  const reworkModules: any[] = []

  if (projects) {
    projects.forEach((p: any) => {
      if (p.project_modules) {
        const mods = p.project_modules.filter((m: any) =>
          m.status === 'for revision' || m.status === 'for_revision'
        )
        mods.forEach((m: any) => {
          reworkModules.push({
            ...m,
            project: { id: p.id, name: p.name }
          })
        })
      }
    })
  }

  // Resolve profile names for auditors, PM acknowledgements, and assigned developers
  if (reworkModules.length > 0) {
    const userIds = [
      ...new Set(
        reworkModules
          .flatMap((m) => [m.qa_acknowledged_by, m.qa_result_acknowledged_by, m.assigned_developer_id])
          .filter(Boolean)
      ),
    ]
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseServer
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)

      const userMap = new Map(profiles?.map((a: any) => [a.id, a.full_name]) || [])
      reworkModules.forEach((m) => {
        if (m.qa_acknowledged_by) {
          m.auditor_name = userMap.get(m.qa_acknowledged_by) || null
          m.qa_acknowledged_by_name = userMap.get(m.qa_acknowledged_by) || null
        }
        if (m.qa_result_acknowledged_by) {
          m.qa_result_acknowledged_by_name = userMap.get(m.qa_result_acknowledged_by) || null
        }
        if (m.assigned_developer_id) {
          m.assigned_developer_name = userMap.get(m.assigned_developer_id) || null
        }
      })
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          QA Revision
        </h1>
      </div>

      <QaRevisionClient initialModules={reworkModules} />
    </div>
  )
}
