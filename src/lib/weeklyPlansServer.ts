import { createClient } from '@/lib/supabase/server'
import type { WeeklyPlan, WeeklyPlanPerson } from '@/types/weeklyPlan'

interface ModuleRow {
  id: string
  name: string
  projects: { name: string } | null
}

// Name lookups shared by the weekly task pages: people visible to the viewer
// (company-scoped) and module/project names for the plans' linked modules.
export async function fetchWeeklyPlanLookups(
  profile: { id: string; role: string },
  activeCompanyId: string | null,
  plans: WeeklyPlan[],
) {
  const supabase = await createClient()
  const isSuperAdmin = profile.role === 'super_admin'

  let modulesQuery = supabase
    .from('project_modules')
    .select('id, name, projects!inner(name, company_id)')
  if (activeCompanyId) {
    modulesQuery = modulesQuery.eq('projects.company_id', activeCompanyId)
  }
  const { data: moduleData } = await modulesQuery.order('name')
  const moduleRows = (moduleData ?? []) as unknown as ModuleRow[]

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
    ;((extraModules ?? []) as unknown as ModuleRow[]).forEach((row) => {
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
    const { data: companyData } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', profile.id)
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

  return {
    people: (people ?? []) as WeeklyPlanPerson[],
    moduleNames,
    moduleProjects,
  }
}