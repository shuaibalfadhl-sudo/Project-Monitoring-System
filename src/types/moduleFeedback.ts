export interface ModuleFeedback {
  id: number
  feedback_user_id: string
  module_id: string
  user_role: string
  feedback: string | null
  file_paths: string[]
  created_at: string
  created_by: string
}

export type ModuleFeedbackRole = 'developer' | 'system_auditor' | 'project_manager' | 'super_admin' | 'devops' | 'pending' | 'other'

export interface ModuleFeedbackDraft {
  text: string
  files: File[]
}
