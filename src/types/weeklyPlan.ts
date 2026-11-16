export type WeeklyPlanStatus = 'pending' | 'onhold' | 'in progress' | 'done' | 'completed'

export interface WeeklyPlan {
  id: number
  assigned_personnel: string
  module: string
  date_weekly: string | null
  title: string
  description: string | null
  status: WeeklyPlanStatus
  document_attachments: string[] | null
  created_by: string
  created_at: string
  updated_by: string | null
  updated_at: string | null
}

export interface WeeklyPlanPerson {
  id: string
  full_name: string | null
  email: string | null
}

export const WEEKLY_PLAN_STATUSES: {
  value: WeeklyPlanStatus
  label: string
  badge: string
  dot: string
}[] = [
  {
    value: 'pending',
    label: 'Pending',
    badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-400/20',
    dot: '#F59E0B',
  },
  {
    value: 'onhold',
    label: 'On Hold',
    badge: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-400/20',
    dot: '#F97316',
  },
  {
    value: 'in progress',
    label: 'In Progress',
    badge: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-400/20',
    dot: '#3B82F6',
  },
  {
    value: 'done',
    label: 'Done',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/20',
    dot: '#10B981',
  },
  {
    value: 'completed',
    label: 'Completed',
    badge: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-400/20',
    dot: '#8B5CF6',
  },
]

export function weeklyPlanStatusMeta(status: string) {
  return WEEKLY_PLAN_STATUSES.find((s) => s.value === status) ?? WEEKLY_PLAN_STATUSES[0]
}
