import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import DevWorkspaceClient from "@/components/modules/DevWorkspaceClient";

export default async function DevWorkspacePage() {
  const profile = await getUserProfile();

  if (!profile) {
    redirect("/dashboard");
  }

  const isPrivilegedViewer = profile.role === "super_admin" || profile.role === "devops";
  if (!isPrivilegedViewer && profile.role !== "developer") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const cookieStore = await cookies();
  const activeCompanyId = cookieStore.get("activeCompanyId")?.value || null;

  const devModules: any[] = [];

  if (isPrivilegedViewer) {
    // super_admin sees all dev modules; devops sees all modules assigned to them
    // across every project in their companies (RLS-scoped). Both query projects
    // directly rather than via project_members.
    let query = supabase
      .from("projects")
      .select(`
        id,
        name,
        company_id,
        project_modules(
          id,
          name,
          description,
          priority,
          status,
          deadline,
          category,
          assigned_developer_id,
          module_document_url,
          website_link,
          qa_result_document_url,
          developer_feedback
        )
      `);

    if (activeCompanyId) {
      query = query.eq("company_id", activeCompanyId);
    }

    const { data } = await query;

    data?.forEach((project: any) => {
      project.project_modules?.forEach((mod: any) => {
        const devStatus =
          mod.status === "development" || mod.status === "developing" || mod.status === "revision" || mod.status === "revising";
        if (!devStatus) return;
        if (profile.role === "devops" && mod.assigned_developer_id !== profile.id) return;
        devModules.push({
          ...mod,
          project: { id: project.id, name: project.name },
        });
      });
    });
  } else {
    let membersQuery = supabase
      .from("project_members")
      .select(`
        projects!inner(
          id,
          name,
          company_id,
          project_modules(
            id,
            name,
            description,
            priority,
            status,
            deadline,
            category,
            assigned_developer_id,
            module_document_url,
            website_link,
            qa_result_document_url,
            developer_feedback
          )
        )
      `)
      .eq("user_id", profile.id);

    if (activeCompanyId) {
      membersQuery = membersQuery.eq("projects.company_id", activeCompanyId);
    }

    const { data } = await membersQuery;

    data?.forEach((member: any) => {
      const project = member.projects;
      if (!project) return;
      project.project_modules?.forEach((mod: any) => {
        if (
          mod.assigned_developer_id === profile.id &&
          (mod.status === "development" || mod.status === "developing" || mod.status === "revision" || mod.status === "revising")
        ) {
          devModules.push({
            ...mod,
            project: { id: project.id, name: project.name },
          });
        }
      });
    });
  }

  // Resolve developer names from profiles
  const devIds = [...new Set(devModules.map((m) => m.assigned_developer_id).filter(Boolean))];
  if (devIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", devIds);

    const nameMap = new Map(profiles?.map((p: any) => [p.id, p.full_name]) ?? []);
    devModules.forEach((m) => {
      m.assigned_developer_name = nameMap.get(m.assigned_developer_id) ?? null;
    });
  }

  return (
    <div className="w-full space-y-6">
      <DevWorkspaceClient
        initialModules={devModules}
        isSuperAdmin={profile.role === "super_admin"}
        canSubmitFeedback={profile.role === "developer" || profile.role === "super_admin"}
      />
    </div>
  );
}
