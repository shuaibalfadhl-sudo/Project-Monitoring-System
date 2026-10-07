import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import AllModulesClient from "@/components/modules/AllModulesClient";

export default async function AllModulesPage() {
  const profile = await getUserProfile();

  if (!profile) {
    redirect("/login");
  }

  const supabase = await createClient();
  let allModules: any[] = [];

  if (profile.role === "super_admin") {
    const { data: projects } = await supabase.from("projects").select(`
        id,
        name,
        created_by,
        project_modules (*)
      `);

    if (projects) {
      projects.forEach((p) => {
        if (p.project_modules) {
          p.project_modules.forEach((m: any) => {
            allModules.push({
              ...m,
              project: { id: p.id, name: p.name, created_by: p.created_by },
            });
          });
        }
      });
    }
  } else if (profile.role === "project_manager") {
    const { data: projects } = await supabase
      .from("projects")
      .select(
        `
        id,
        name,
        created_by,
        project_modules (*)
      `,
      )
      .eq("created_by", profile.id);

    if (projects) {
      projects.forEach((p) => {
        if (p.project_modules) {
          p.project_modules.forEach((m: any) => {
            allModules.push({
              ...m,
              project: { id: p.id, name: p.name, created_by: p.created_by },
            });
          });
        }
      });
    }
  } else if (profile.role === "system_auditor") {
    const { data: memberships } = await supabase
      .from("project_members")
      .select(
        `
        projects (
          id,
          name,
          created_by,
          project_modules (*)
        )
      `,
      )
      .eq("user_id", profile.id);

    if (memberships) {
      memberships.forEach((membership) => {
        const p = membership.projects as any;
        if (p && p.project_modules) {
          p.project_modules.forEach((m: any) => {
            allModules.push({
              ...m,
              project: { id: p.id, name: p.name, created_by: p.created_by },
            });
          });
        }
      });
    }
  }

  // Fetch created_by names
  if (allModules.length > 0) {
    const creatorIds = [
      ...new Set(allModules.map((m) => m.project.created_by).filter(Boolean)),
    ];
    if (creatorIds.length > 0) {
      const { data: creators } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", creatorIds);

      const creatorMap = new Map(
        creators?.map((c) => [c.id, c.full_name]) || [],
      );
      allModules.forEach((m) => {
        if (m.project.created_by) {
          m.project.creator_name = creatorMap.get(m.project.created_by);
        }
      });
    }
  }

  // Fetch auditor and PM names for acknowledgements
  if (allModules.length > 0) {
    const userIds = [
      ...new Set(
        allModules
          .map((m) => m.qa_acknowledged_by)
          .concat(allModules.map((m) => m.qa_result_acknowledged_by))
          .filter(Boolean),
      ),
    ];
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const userMap = new Map(users?.map((u) => [u.id, u.full_name]) || []);
      allModules.forEach((m) => {
        if (m.qa_acknowledged_by) {
          m.qa_acknowledged_by_name = userMap.get(m.qa_acknowledged_by);
        }
        if (m.qa_result_acknowledged_by) {
          m.qa_result_acknowledged_by_name = userMap.get(
            m.qa_result_acknowledged_by,
          );
        }
      });
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          All Modules
        </h1>
      </div>

      <AllModulesClient initialModules={allModules} role={profile.role} />
    </div>
  );
}
