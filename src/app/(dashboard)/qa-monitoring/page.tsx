import { getUserProfile } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import QaMonitoringView from "@/components/session/views/QaMonitoringView"

export default async function QaMonitoringPage() {
  const profile = await getUserProfile()

  if (!profile || (profile.role !== "system_auditor" && profile.role !== "super_admin")) {
    redirect("/dashboard")
  }

  return <QaMonitoringView />;
}
