export type UserRole = "project_manager" | "system_auditor" | "developer" | "super_admin" | "pending";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  avatar_path?: string | null;
  gender?: string | null;
  birthday?: string | null;
  age?: number | null;
  created_at: string;
  updated_at: string;
}
