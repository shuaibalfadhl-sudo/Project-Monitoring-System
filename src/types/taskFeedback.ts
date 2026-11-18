export interface TaskFeedback {
  id: number
  feedback_user_id: string
  task_id: number
  is_task_owner: boolean
  feedback: string | null
  file_path: string | null
  created_at: string
  created_by: string
}