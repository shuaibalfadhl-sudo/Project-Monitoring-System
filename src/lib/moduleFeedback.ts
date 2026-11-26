import type { SupabaseClient } from '@supabase/supabase-js'
import type { ModuleFeedbackDraft } from '@/types/moduleFeedback'
import { buildWeeklyPlanFilePath, WEEKLY_PLAN_SIGNED_URL_TTL } from './weeklyPlans'

export const MODULE_FEEDBACK_BUCKET = 'module-feedback'

export async function uploadModuleFeedbackFile(supabase: SupabaseClient, userId: string, file: File) {
  const path = buildWeeklyPlanFilePath(userId, file.name)
  const { error } = await supabase.storage.from(MODULE_FEEDBACK_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function removeModuleFeedbackFiles(supabase: SupabaseClient, paths: string[]) {
  if (paths.length === 0) return
  // Best effort: a file left behind must not block deleting the feedback row.
  const { error } = await supabase.storage.from(MODULE_FEEDBACK_BUCKET).remove(paths)
  if (error) console.error('module feedback storage cleanup failed', error)
}

export async function moduleFeedbackSignedUrl(supabase: SupabaseClient, path: string) {
  const { data, error } = await supabase.storage
    .from(MODULE_FEEDBACK_BUCKET)
    .createSignedUrl(path, WEEKLY_PLAN_SIGNED_URL_TTL)
  if (error) throw error
  return data.signedUrl
}

export async function submitModuleStatusWithFeedback(
  supabase: SupabaseClient,
  {
    moduleId,
    draft,
    updateStatus,
  }: {
    moduleId: string
    draft: ModuleFeedbackDraft
    updateStatus: () => PromiseLike<{ error: unknown }>
  },
) {
  const text = draft.text.trim()
  if (!text && draft.files.length === 0) {
    const { error } = await updateStatus()
    if (error) throw error
    return
  }

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) throw new Error('Please sign in before submitting feedback.')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  if (profileError || !profile?.role) throw new Error('Could not verify your profile role.')

  const filePaths: string[] = []
  try {
    for (const file of draft.files) {
      filePaths.push(await uploadModuleFeedbackFile(supabase, userId, file))
    }
  } catch (error) {
    await removeModuleFeedbackFiles(supabase, filePaths)
    throw error
  }

  const { data, error } = await supabase
    .from('module_feedback')
    .insert({
      module_id: moduleId,
      feedback_user_id: userId,
      created_by: userId,
      user_role: profile.role,
      feedback: text,
      file_paths: filePaths,
    })
    .select('id')
    .single()

  if (error || !data) {
    await removeModuleFeedbackFiles(supabase, filePaths)
    throw error ?? new Error('Feedback could not be saved.')
  }

  try {
    const { error: statusError } = await updateStatus()
    if (statusError) throw statusError
  } catch (statusError) {
    const { error: deleteError } = await supabase
      .from('module_feedback')
      .delete()
      .eq('id', data.id)
    if (deleteError) console.error('module feedback rollback failed', deleteError)
    await removeModuleFeedbackFiles(supabase, filePaths)
    throw statusError
  }
}
