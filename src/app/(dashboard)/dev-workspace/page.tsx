import { getUserProfile } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import DevWorkspaceView from "@/components/session/views/DevWorkspaceView";

export default async function DevWorkspacePage() {
  const profile = await getUserProfile();

  if (!profile) {
    redirect("/dashboard");
  }

  const isSuperAdmin = profile.role === "super_admin";
  const isDevops = profile.role === "devops";
  if (!isSuperAdmin && !isDevops && profile.role !== "developer") {
    redirect("/dashboard");
  }

  return (
    <DevWorkspaceView userId={profile.id} isSuperAdmin={isSuperAdmin} isDevops={isDevops} />
  );
}
