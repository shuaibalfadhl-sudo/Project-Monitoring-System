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
