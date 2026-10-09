export type ProjectStatus = 'planning' | 'in_progress' | 'completed' | 'on_hold'

export interface Project {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  start_date: string | null
  target_date: string | null
  created_by: string
  created_at: string
}

export type ModuleStatus = 'pending' | 'development' | 'pm_review' | 'for_qa' | 'auditing' | 'revision' | 'revising' | 'qa_approved' | 'deployment' | 'deployed'

export interface ProjectModule {
  id: string
  project_id: string
  name: string
  description: string | null
  priority: string
  status: ModuleStatus
  created_at: string
  qa_acknowledged_at?: string | null
  qa_acknowledged_by?: string | null
  qa_acknowledged_by_name?: string | null
  qa_result_acknowledged_at?: string | null
  qa_result_acknowledged_by?: string | null
  qa_result_acknowledged_by_name?: string | null
  module_document_url?: string | null
  qa_result_document_url?: string | null
  assigned_developer_id?: string | null
  category?: string | null
  revision_count?: number
  deadline?: string | null
}

export interface ProjectMember {
  project_id: string
  user_id: string
  is_owner: boolean
  created_at: string
  profiles?: {
    full_name: string
    role: string
  }
}
