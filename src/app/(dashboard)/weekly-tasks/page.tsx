import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import WeeklyTasksClient from '@/components/weekly-plans/WeeklyTasksClient'
import { fetchWeeklyPlanLookups } from '@/lib/weeklyPlansServer'
import type { WeeklyPlan } from '@/types/weeklyPlan'

export default async function WeeklyTasksPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  const supabase = await createClient()
  const cookieStore = await cookies()
  const activeCompanyId = cookieStore.get('activeCompanyId')?.value || null

  const { data: plansData } = await supabase
    .from('weekly_plans')
    .select(
      'id, assigned_personnel, module, date_weekly, date_weekly_end, title, description, status, document_attachments, created_by, created_at, updated_by, updated_at',
    )
    .eq('assigned_personnel', profile.id)
    .neq('status', 'done')
    .order('date_weekly', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  const plans = (plansData ?? []) as WeeklyPlan[]
  const { people, moduleNames, moduleProjects } = await fetchWeeklyPlanLookups(
    profile,
    activeCompanyId,
    plans,
  )

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Weekly Tasks
        </h1>
      </div>

      <WeeklyTasksClient
        initialPlans={plans}
        people={people}
        moduleNames={moduleNames}
        moduleProjects={moduleProjects}
        viewer={{ id: profile.id, role: profile.role }}
      />
    </div>
  )
}