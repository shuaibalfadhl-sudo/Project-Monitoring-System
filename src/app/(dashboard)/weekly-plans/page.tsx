import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import WeeklyPlansClient from '@/components/weekly-plans/WeeklyPlansClient'
import type { WeeklyPlan } from '@/types/weeklyPlan'

export default async function WeeklyPlansPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  const supabase = await createClient()

  const [{ data: plans }, { data: people }] = await Promise.all([
    supabase
      .from('weekly_plans')
      .select(
        'id, assigned_personnel, module, date_weekly, title, description, status, document_attachments, created_by, created_at, updated_by, updated_at',
      )
      .order('date_weekly', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, email').order('full_name'),
  ])

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Weekly Plans
        </h1>
      </div>

      <WeeklyPlansClient
        initialPlans={(plans ?? []) as WeeklyPlan[]}
        people={people ?? []}
        viewer={{ id: profile.id, role: profile.role }}
      />
    </div>
  )
}
