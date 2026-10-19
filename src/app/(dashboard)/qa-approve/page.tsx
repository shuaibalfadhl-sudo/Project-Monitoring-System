import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import QaApproveClient from '@/components/modules/QaApproveClient'

export default async function QaApprovePage() {
  const profile = await getUserProfile()

  if (!profile || (profile.role !== 'project_manager' && profile.role !== 'super_admin')) {
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
        assigned_developer_id
      )
    `)

  const cookieStore = await cookies()
  const activeCompanyId = cookieStore.get('activeCompanyId')?.value || null;

  if (activeCompanyId) {
    projectsQuery = projectsQuery.eq('company_id', activeCompanyId)
  }

  // A project manager only sees their own projects; super_admin sees the whole company.
  if (profile.role !== 'super_admin') {
    projectsQuery = projectsQuery.eq('created_by', profile.id)
  }

  const { data: projects } = await projectsQuery

  const qaApprovedModules: any[] = []

  if (projects) {
    projects.forEach((p: any) => {
      if (p.project_modules) {
        const mods = p.project_modules.filter((m: any) => m.status === 'qa_approved')
        mods.forEach((m: any) => {
          qaApprovedModules.push({
            ...m,
            project_id: p.id,
            project: { id: p.id, name: p.name }
          })
        })
      }
    })
  }

  if (qaApprovedModules.length > 0) {
    const auditorIds = [...new Set(qaApprovedModules.map(m => m.qa_acknowledged_by).filter(Boolean))]
    if (auditorIds.length > 0) {
      const { data: auditors } = await supabaseServer
        .from('profiles')
        .select('id, full_name')
        .in('id', auditorIds)

      const auditorMap = new Map(auditors?.map(a => [a.id, a.full_name]) || [])
      qaApprovedModules.forEach(m => {
        if (m.qa_acknowledged_by) {
          m.auditor_name = auditorMap.get(m.qa_acknowledged_by)
        }
      })
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          QA Approved
        </h1>
      </div>

      <QaApproveClient initialModules={qaApprovedModules} />
    </div>
  )
}
