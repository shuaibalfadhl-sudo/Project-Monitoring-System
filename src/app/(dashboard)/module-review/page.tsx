import { getUserProfile } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import ModuleReviewView from "@/components/session/views/ModuleReviewView"

export default async function ModuleReviewPage() {
  const profile = await getUserProfile()

  if (!profile || (profile.role !== "project_manager" && profile.role !== "super_admin")) {
    redirect("/dashboard")
  }

  return <ModuleReviewView />;
}
