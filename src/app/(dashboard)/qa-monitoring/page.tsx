import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import QaMonitoringClient from '@/components/modules/QaMonitoringClient'

export default async function QaMonitoringPage() {
  const profile = await getUserProfile()

  if (!profile || profile.role !== 'system_auditor') {
    redirect('/dashboard')
  }

  const supabaseServer = await createClient()
  
  const { data } = await supabaseServer
    .from('project_members')
    .select(`
      projects (
        id,
        name,
        project_modules (
          id,
          name,
          description,
          priority,
          status
        )
      )
    `)
    .eq('user_id', profile.id)

  const allQaModules: any[] = []

  if (data) {
    const saProjects = data.map(d => d.projects).filter(Boolean)
    saProjects.forEach((p: any) => {
      if (p.project_modules) {
        const qaModules = p.project_modules.filter((m: any) => m.status === 'for_qa')
        qaModules.forEach((m: any) => {
          allQaModules.push({
            id: m.id,
            name: m.name,
            description: m.description,
            priority: m.priority,
            status: m.status,
            project: {
              id: p.id,
              name: p.name
            }
          })
        })
      }
    })
  }

  // Sort by priority (1 is highest, assuming numerical priority)
  allQaModules.sort((a, b) => a.priority - b.priority)

  return <QaMonitoringClient initialModules={allQaModules} />
}
