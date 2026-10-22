export type UserRole = "project_manager" | "system_auditor" | "developer" | "super_admin" | "devops" | "pending";

// Roles a super admin can assign. "pending" is the signup fallback and is not assignable.
export const ASSIGNABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "project_manager", label: "Project Manager" },
  { value: "system_auditor", label: "System Auditor" },
  { value: "developer", label: "Developer" },
  { value: "devops", label: "DevOps" },
];

export const ASSIGNABLE_ROLE_VALUES = ASSIGNABLE_ROLES.map((r) => r.value);

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
