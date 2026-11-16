import type { SupabaseClient } from '@supabase/supabase-js'

export const WEEKLY_PLAN_BUCKET = 'weekly-plan-documents'
export const WEEKLY_PLAN_MAX_BYTES = 20 * 1024 * 1024
export const WEEKLY_PLAN_SIGNED_URL_TTL = 300

const ALLOWED_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'csv',
  'zip',
]

export const WEEKLY_PLAN_ACCEPT = ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(',')

export function weeklyPlanFileExtension(fileName: string) {
  const index = fileName.lastIndexOf('.')
  return index === -1 ? '' : fileName.slice(index + 1).toLowerCase()
}

export function weeklyPlanFileError(file: File): string | null {
  if (!ALLOWED_EXTENSIONS.includes(weeklyPlanFileExtension(file.name))) {
    return `${file.name} is not an image or document type we accept.`
  }
  if (file.size > WEEKLY_PLAN_MAX_BYTES) {
    return `${file.name} is larger than 20 MB.`
  }
  return null
}

export function buildWeeklyPlanFilePath(userId: string, fileName: string) {
  const unique =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${userId}/${unique}.${weeklyPlanFileExtension(fileName)}`
}

export async function uploadWeeklyPlanFile(supabase: SupabaseClient, userId: string, file: File) {
  const path = buildWeeklyPlanFilePath(userId, file.name)
  const { error } = await supabase.storage.from(WEEKLY_PLAN_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function removeWeeklyPlanFiles(supabase: SupabaseClient, paths: string[]) {
  if (paths.length === 0) return
  // Best effort: a file left behind must not block editing or deleting the plan.
  const { error } = await supabase.storage.from(WEEKLY_PLAN_BUCKET).remove(paths)
  if (error) console.error('weekly plan storage cleanup failed', error)
}

export async function weeklyPlanSignedUrl(supabase: SupabaseClient, path: string) {
  const { data, error } = await supabase.storage
    .from(WEEKLY_PLAN_BUCKET)
    .createSignedUrl(path, WEEKLY_PLAN_SIGNED_URL_TTL)
  if (error) throw error
  return data.signedUrl
}

export function weeklyPlanFileName(path: string) {
  const name = path.split('/').pop() ?? path
  const dot = name.indexOf('.')
  return dot === -1 ? name : name.slice(0, dot)
}

export function isImageWeeklyPlanFile(path: string) {
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(weeklyPlanFileExtension(path))
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Rows saved before modules became ids can still hold the module's text name; show that, but never a dangling id.
export function weeklyPlanModuleLabel(module: string | null, names: Record<string, string>) {
  if (!module) return null
  const name = names[module]
  if (name) return name
  return UUID_PATTERN.test(module) ? null : module
}

// A plan stores the Monday of its week; the form picks whole weeks.
export function weeklyPlanWeekInputValue(date: string | null): string {  if (!date) return ''
  const parsed = new Date(`${date}T00:00:00Z`)
  const day = parsed.getUTCDay() || 7
  parsed.setUTCDate(parsed.getUTCDate() + 4 - day)
  const yearStart = Date.UTC(parsed.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((parsed.getTime() - yearStart) / 86400000 + 1) / 7)
  return `${parsed.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function weeklyPlanWeekToMonday(value: string): string {
  const [yearPart, weekPart] = value.split('-W')
  const year = Number(yearPart)
  const week = Number(weekPart)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const monday = new Date(Date.UTC(year, 0, 4 - jan4Day + 1))
  monday.setUTCDate(monday.getUTCDate() + (week - 1) * 7)
  return monday.toISOString().slice(0, 10)
}

// Shows the plan's start to end span; without an end date it falls back to start + 6 days.
export function weeklyPlanWeekRange(date: string | null, endDate?: string | null): string {
  if (!date) return 'No week set'
  const [year, month, day] = date.split('-').map(Number)
  const start = new Date(year, month - 1, day)
  let end: Date
  if (endDate) {
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number)
    end = new Date(endYear, endMonth - 1, endDay)
  } else {
    end = new Date(year, month - 1, day + 6)
  }
  const startLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(start)
  const endLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(end)
  return `${startLabel} – ${endLabel}`
}
