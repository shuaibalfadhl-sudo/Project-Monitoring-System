import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
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
      project_modules (
        id,
        name,
        description,
        priority,
        status,
        qa_result_document_url,
        qa_acknowledged_at,
        qa_acknowledged_by
      )
    `)

  if (profile.role !== 'super_admin') {
    projectsQuery = projectsQuery.eq('created_by', profile.id)
  }

  const { data: projects } = await projectsQuery

  const reworkModules: any[] = []

  if (projects) {
    projects.forEach((p: any) => {
      if (p.project_modules) {
        const mods = p.project_modules.filter((m: any) => 
          m.status === 'revision' || m.status === 'revising'
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

  // Optionally fetch the auditor names if needed, but for now we display what we can
  if (reworkModules.length > 0) {
    const auditorIds = [...new Set(reworkModules.map(m => m.qa_acknowledged_by).filter(Boolean))]
    if (auditorIds.length > 0) {
      const { data: auditors } = await supabaseServer
        .from('profiles')
        .select('id, full_name')
        .in('id', auditorIds)
      
      const auditorMap = new Map(auditors?.map(a => [a.id, a.full_name]) || [])
      reworkModules.forEach(m => {
        if (m.qa_acknowledged_by) {
          m.auditor_name = auditorMap.get(m.qa_acknowledged_by)
        }
      })
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          QA Revision
        </h1>
      </div>

      <QaRevisionClient initialModules={reworkModules} />
    </div>
  )
}
