import type { SupabaseClient } from '@supabase/supabase-js'
import { buildWeeklyPlanFilePath, WEEKLY_PLAN_SIGNED_URL_TTL } from './weeklyPlans'

export const TASK_FEEDBACK_BUCKET = 'task-feedback'

export async function uploadTaskFeedbackFile(supabase: SupabaseClient, userId: string, file: File) {
  const path = buildWeeklyPlanFilePath(userId, file.name)
  const { error } = await supabase.storage.from(TASK_FEEDBACK_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function removeTaskFeedbackFiles(supabase: SupabaseClient, paths: string[]) {
  if (paths.length === 0) return
  // Best effort: a file left behind must not block deleting the feedback row.
  const { error } = await supabase.storage.from(TASK_FEEDBACK_BUCKET).remove(paths)
  if (error) console.error('task feedback storage cleanup failed', error)
}

export async function taskFeedbackSignedUrl(supabase: SupabaseClient, path: string) {
  const { data, error } = await supabase.storage
    .from(TASK_FEEDBACK_BUCKET)
    .createSignedUrl(path, WEEKLY_PLAN_SIGNED_URL_TTL)
  if (error) throw error
  return data.signedUrl
}