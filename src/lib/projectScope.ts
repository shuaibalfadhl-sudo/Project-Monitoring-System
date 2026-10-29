// Restricts a projects query to the projects the user created plus the ones they
// were invited to as a member. Used for project_manager scoping; super_admin/devops
// skip this and stay unfiltered.
export async function scopeProjectsToCreatedOrMember(
  query: any,
  supabase: any,
  userId: string,
) {
  const [{ data: createdProjects }, { data: memberships }] = await Promise.all([
    supabase.from("projects").select("id").eq("created_by", userId),
    supabase
      .from("project_members")
      .select("projects!inner(id)")
      .eq("user_id", userId),
  ]);

  const projectIds = [
    ...new Set([
      ...(createdProjects || []).map((p: any) => p.id),
      ...(memberships || []).map((m: any) => (m.projects as any).id),
    ]),
  ];

  // PostgREST `in.()` with an empty list is invalid, so match nothing instead.
  return projectIds.length > 0
    ? query.in("id", projectIds)
    : query.eq("id", "00000000-0000-0000-0000-000000000000");
}
