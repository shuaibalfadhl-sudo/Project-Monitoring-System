import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import DeploymentClient from '@/components/modules/DeploymentClient'

export default async function DeploymentPage() {
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

  const deploymentModules: any[] = []

  if (projects) {
    projects.forEach((p: any) => {
      if (p.project_modules) {
        const mods = p.project_modules.filter((m: any) => 
          m.status === 'qa_approved' || m.status === 'deployment' || m.status === 'deployed'
        )
        mods.forEach((m: any) => {
          deploymentModules.push({
            ...m,
            project: { id: p.id, name: p.name }
          })
        })
      }
    })
  }

  if (deploymentModules.length > 0) {
    const auditorIds = [...new Set(deploymentModules.map(m => m.qa_acknowledged_by).filter(Boolean))]
    if (auditorIds.length > 0) {
      const { data: auditors } = await supabaseServer
        .from('profiles')
        .select('id, full_name')
        .in('id', auditorIds)
      
      const auditorMap = new Map(auditors?.map(a => [a.id, a.full_name]) || [])
      deploymentModules.forEach(m => {
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
          Deployment Status
        </h1>
      </div>

      <DeploymentClient initialModules={deploymentModules} />
    </div>
  )
}
