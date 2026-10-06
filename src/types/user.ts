export type UserRole = "project_manager" | "system_auditor" | "pending";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}
