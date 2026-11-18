export interface TaskFeedback {
  id: number
  feedback_user_id: string
  task_id: number
  is_task_owner: boolean
  file_path: string
  created_at: string
  created_by: string
}