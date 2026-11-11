import { getUserProfile } from '@/lib/auth-utils'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

import ModuleStatusBreakdown from '@/components/dashboard/ModuleStatusBreakdown'
import ModuleMovementChart from '@/components/dashboard/ModuleMovementChart'
import ProjectOverviewRow from '@/components/dashboard/ProjectOverviewRow'
import ModuleStatusPieCard from '@/components/dashboard/ModuleStatusPieCard'
import { aggregateStatusMovements, type StatusMovement } from '@/lib/statusMovements'

export default async function DashboardPage() {
  const profile = await getUserProfile()

  if (!profile) {
    redirect('/login')
  }



  let title = "Dashboard"
  if (profile.role === 'project_manager') title = "Project Manager Dashboard"
  if (profile.role === 'system_auditor') title = "System Auditor Dashboard"
  if (profile.role === 'super_admin') title = "Super Admin Dashboard"
  if (profile.role === 'developer') title = "Developer Dashboard"
  if (profile.role === 'devops') title = "DevOps Dashboard"

  const hasDashboard =
    profile.role === 'system_auditor' ||
    profile.role === 'project_manager' ||
    profile.role === 'super_admin' ||
    profile.role === 'developer' ||
    profile.role === 'devops'

  // Fetch data
  let displayProjects: any[] = []
  let totalProjects = 0
  let totalModules = 0
  let deployedModules = 0

  const cookieStore = await cookies()
  const activeCompanyId = cookieStore.get('activeCompanyId')?.value || null;

  const supabaseServer = await createClient()

  if (profile.role === 'system_auditor') {
    let query = supabaseServer
      .from('project_members')
      .select(`
        projects!inner (
          id,
          name,
          status,
          target_date,
          company_id,
          project_members ( user_id ),
          project_modules (
            id,
            status
          )
        )
      `)
      .eq('user_id', profile.id)
      
    if (activeCompanyId) {
      query = query.eq('projects.company_id', activeCompanyId)
    }

    const { data } = await query

    if (data) {
      displayProjects = data.map((d: any) => d.projects).filter(Boolean)
    }
  } else if (profile.role === 'project_manager' || profile.role === 'super_admin') {
    let query = supabaseServer
      .from('projects')
      .select(`
        id,
        name,
        status,
        target_date,
        company_id,
        project_members ( user_id ),
        project_modules (
          id,
          status
        )
      `)
      .order('created_at', { ascending: false })

    if (activeCompanyId) {
      query = query.eq('company_id', activeCompanyId)
    }
    
    const { data } = await query

    if (data) {
      displayProjects = data
    }
  } else if (profile.role === 'developer') {
    // Projects this developer belongs to, keeping only the modules assigned to them.
    let query = supabaseServer
      .from('project_members')
      .select(`
        projects!inner (
          id,
          name,
          status,
          target_date,
          company_id,
          project_members ( user_id ),
          project_modules (
            id,
            status,
            assigned_developer_id
          )
        )
      `)
      .eq('user_id', profile.id)

    if (activeCompanyId) {
      query = query.eq('projects.company_id', activeCompanyId)
    }

    const { data } = await query

    if (data) {
      displayProjects = data
        .map((d) => {
          // PostgREST returns the to-one `projects` relation as an object.
          const project = Array.isArray(d.projects) ? d.projects[0] : d.projects
          if (!project) return null
          return {
            ...project,
            project_modules: (project.project_modules ?? []).filter(
              (m) => m.assigned_developer_id === profile.id
            ),
          }
        })
        .filter((project) => !!project && project.project_modules.length > 0)
    }
  } else if (profile.role === 'devops') {
    // DevOps modules live across all projects in their companies; keep only theirs.
    let query = supabaseServer
      .from('projects')
      .select(`
        id,
        name,
        status,
        target_date,
        company_id,
        project_members ( user_id ),
        project_modules (
          id,
          status,
          assigned_developer_id
        )
      `)

    if (activeCompanyId) {
      query = query.eq('company_id', activeCompanyId)
    }

    const { data } = await query

    if (data) {
      displayProjects = data
        .map((project) => ({
          ...project,
          project_modules: (project.project_modules ?? []).filter(
            (m) => m.assigned_developer_id === profile.id
          ),
        }))
        .filter((project) => project.project_modules.length > 0)
    }
  }

  displayProjects.forEach((p: any) => {
    if (p.project_modules) {
      totalModules += p.project_modules.length
      deployedModules += p.project_modules.filter((m: any) => m.status === 'deployed').length
    }
  })

  // Distinct people on the projects in view (company-scoped for super admins).
  const memberIds = new Set<string>()
  displayProjects.forEach((p) => {
    for (const member of p.project_members ?? []) memberIds.add(member.user_id)
  })
  const totalUsers = memberIds.size

  totalProjects = displayProjects.length

  const dashboardStats = [
    { label: 'Total Projects', value: totalProjects },
    { label: 'Total Modules', value: totalModules },
    { label: 'Total Team Members', value: totalUsers },
    { label: 'Deployed Modules', value: deployedModules },
  ]

  // Movement history for the monthly chart, scoped to the modules in view.
  let movements: StatusMovement[] = []
  const moduleIds = new Set<string>(
    displayProjects.flatMap((p: { project_modules?: { id: string }[] }) =>
      (p.project_modules ?? []).map((m) => m.id)
    )
  )

  if (moduleIds.size > 0) {
    const historyRows: { module_id: string; status: string | null; created_at: string }[] = []
    const PAGE_SIZE = 1000
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabaseServer
        .from('project_module_status_history')
        .select('module_id, status, created_at')
        .order('created_at', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)

      if (error || !data || data.length === 0) break
      historyRows.push(...data)
      if (data.length < PAGE_SIZE) break
    }

    movements = aggregateStatusMovements(
      historyRows
        .filter((row) => moduleIds.has(row.module_id))
        .map((row) => ({ status: row.status, created_at: row.created_at }))
    )
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 dark:bg-slate-900 p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-transparent dark:border-slate-800 transition-colors duration-300">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white dark:text-white mb-6">{title}</h1>
      
      {hasDashboard ? (
        <div className="space-y-8 mb-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboardStats.map((stat) => (
              <div
                key={stat.label}
                className="bg-[#2f313d] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-xl px-4 py-6 text-center shadow-sm"
              >
                <p className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-3">
                  {stat.label}
                </p>
                <p className="text-3xl sm:text-4xl font-semibold text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          <ProjectOverviewRow projects={displayProjects} />

          <ModuleStatusBreakdown
            modules={displayProjects.flatMap((p) => p.project_modules ?? [])}
          />
          <ModuleMovementChart movements={movements} />
          <ModuleStatusPieCard projects={displayProjects} />
        </div>
      ) : (
        <p className="text-gray-500 text-sm font-medium mb-10">
          You have successfully authenticated. Features corresponding to your role will appear in the navigation bar.
        </p>
      )}

    </div>
  )
}
