import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import WeeklyPlansClient from '@/components/weekly-plans/WeeklyPlansClient'
import type { WeeklyPlan, WeeklyPlanModule } from '@/types/weeklyPlan'

interface ModuleRow {
  id: string
  name: string
  assigned_developer_id: string | null
  projects: { id: string; name: string; created_by: string; company_id: string } | null
}

export default async function WeeklyPlansPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  const supabase = await createClient()
  const cookieStore = await cookies()
  const activeCompanyId = cookieStore.get('activeCompanyId')?.value || null
  const isSuperAdmin = profile.role === 'super_admin'

  let modulesQuery = supabase
    .from('project_modules')
    .select('id, name, assigned_developer_id, projects!inner(id, name, created_by, company_id)')
  if (activeCompanyId) {
    modulesQuery = modulesQuery.eq('projects.company_id', activeCompanyId)
  }

  const [{ data: plansData }, { data: moduleData }, { data: ownedData }, { data: companyData }] =
    await Promise.all([
      supabase
        .from('weekly_plans')
        .select(
          'id, assigned_personnel, module, date_weekly, date_weekly_end, title, description, status, document_attachments, created_by, created_at, updated_by, updated_at',
        )
        .order('date_weekly', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }),
      modulesQuery.order('name'),
      supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', profile.id)
        .eq('is_owner', true),
      supabase.from('company_members').select('company_id').eq('user_id', profile.id),
    ])

  const plans = (plansData ?? []) as WeeklyPlan[]
  const moduleRows = (moduleData ?? []) as unknown as ModuleRow[]
  const ownedProjectIds = new Set(
    ((ownedData ?? []) as { project_id: string }[]).map((row) => row.project_id),
  )

  // Only modules they are assigned to, or that live in a project they created/own.
  const modules: WeeklyPlanModule[] = moduleRows
    .filter((row) => {
      if (!row.projects) return false
      if (isSuperAdmin) return true
      return (
        row.assigned_developer_id === profile.id ||
        row.projects.created_by === profile.id ||
        ownedProjectIds.has(row.projects.id)
      )
    })
    .map((row) => ({
      id: row.id,
      name: row.name,
      projectName: row.projects?.name ?? '',
    }))

  const moduleNames: Record<string, string> = Object.fromEntries(
    moduleRows.map((row) => [row.id, row.name]),
  )
  const moduleProjects: Record<string, string> = {}
  for (const row of moduleRows) {
    if (row.projects) moduleProjects[row.id] = row.projects.name
  }
  const missingModuleIds = [
    ...new Set(
      plans
        .map((plan) => plan.module)
        .filter((id): id is string => Boolean(id && !moduleNames[id])),
    ),
  ]
  if (missingModuleIds.length > 0) {
    const { data: extraModules } = await supabase
      .from('project_modules')
      .select('id, name, projects(name)')
      .in('id', missingModuleIds)
    ;((extraModules ?? []) as unknown as {
      id: string
      name: string
      projects: { name: string } | null
    }[]).forEach((row) => {
      moduleNames[row.id] = row.name
      if (row.projects) moduleProjects[row.id] = row.projects.name
    })
  }

  let peopleQuery = supabase.from('profiles').select('id, full_name, email')
  if (activeCompanyId) {
    const { data: colleagueData } = await supabase
      .from('company_members')
      .select('user_id')
      .eq('company_id', activeCompanyId)
    const memberIds = [
      ...new Set([
        ...((colleagueData ?? []) as { user_id: string }[]).map((row) => row.user_id),
        profile.id,
      ]),
    ]
    peopleQuery = peopleQuery.in('id', memberIds)
  } else if (!isSuperAdmin) {
    const myCompanyIds = ((companyData ?? []) as { company_id: string }[]).map(
      (row) => row.company_id,
    )
    if (myCompanyIds.length > 0) {
      const { data: colleagueData } = await supabase
        .from('company_members')
        .select('user_id')
        .in('company_id', myCompanyIds)
      const memberIds = [
        ...new Set([
          ...((colleagueData ?? []) as { user_id: string }[]).map((row) => row.user_id),
          profile.id,
        ]),
      ]
      peopleQuery = peopleQuery.in('id', memberIds)
    } else {
      peopleQuery = peopleQuery.eq('id', profile.id)
    }
  }
  const { data: people } = await peopleQuery.order('full_name')

  return (
    <div className="w-full min-h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Weekly Plans
        </h1>
      </div>

      <WeeklyPlansClient
        initialPlans={plans}
        people={people ?? []}
        modules={modules}
        moduleNames={moduleNames}
        moduleProjects={moduleProjects}
        viewer={{ id: profile.id, role: profile.role }}
      />
    </div>
  )
}
