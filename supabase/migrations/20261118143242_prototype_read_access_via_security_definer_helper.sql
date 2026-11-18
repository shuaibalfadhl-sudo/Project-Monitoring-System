-- prototype_read_access_via_security_definer_helper
-- Run the same SQL in the cloud (test) SQL Editor. This file is applied to LIVE when dev is merged into main.
-- Rules: plain SQL only; no BEGIN/COMMIT (each file already runs as one all-or-nothing step);
--        no CREATE INDEX CONCURRENTLY; new tables need their GRANT lines;
--        never edit or rename this file once it is on main (fix with a new file).

-- The inline branch subqueries in the previous read policy ran under the caller's
-- own RLS on project_modules / project_members, so roles with narrower table
-- visibility were denied even when they belonged to the project or company.
-- A SECURITY DEFINER helper evaluates the access rule with full visibility:
-- assigned developer, any project member, project creator, any member of the
-- module's company, or super admin. Write policies stay owner / super admin only.

create or replace function public.can_read_project_prototype(p_project_id uuid, p_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_modules m
    where m.id = p_module_id
      and m.project_id = p_project_id
      and (
        m.assigned_developer_id = auth.uid()
        or exists (
          select 1
          from public.project_members pm
          where pm.project_id = m.project_id
            and pm.user_id = auth.uid()
        )
        or exists (
          select 1
          from public.projects p
          where p.id = m.project_id
            and p.created_by = auth.uid()
        )
        or exists (
          select 1
          from public.company_members cm
          join public.projects p on p.id = m.project_id
          where cm.company_id = p.company_id
            and cm.user_id = auth.uid()
        )
        or exists (
          select 1
          from public.profiles pr
          where pr.id = auth.uid()
            and pr.role = 'super_admin'
        )
      )
  );
$$;

revoke execute on function public.can_read_project_prototype(uuid, uuid) from public, anon;
grant execute on function public.can_read_project_prototype(uuid, uuid) to authenticated;

drop policy if exists "project_prototypes_read_authorized" on storage.objects;
create policy "project_prototypes_read_authorized"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-prototypes'
  and array_length(storage.foldername(name), 1) = 2
  and name ~* '\.html$'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.can_read_project_prototype(
    ((storage.foldername(name))[1])::uuid,
    ((storage.foldername(name))[2])::uuid
  )
);