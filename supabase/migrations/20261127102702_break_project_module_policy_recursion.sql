-- break_project_module_policy_recursion
-- Run the same SQL in the cloud (test) SQL Editor. This file is applied to LIVE when dev is merged into main.
-- Rules: plain SQL only; no BEGIN/COMMIT (each file already runs as one all-or-nothing step);
--        no CREATE INDEX CONCURRENTLY; new tables need their GRANT lines;
--        never edit or rename this file once it is on main (fix with a new file).

-- Read project_modules inside SECURITY DEFINER so this policy does not re-enter its RLS policies.
create or replace function public.is_trainee_assigned_to_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_trainee()
    and exists (
      select 1
      from public.project_modules m
      where m.project_id = p_project_id
        and (
          m.assigned_developer_id = auth.uid()
          or m.assigned_auditor = auth.uid()
        )
    );
$$;

revoke execute on function public.is_trainee_assigned_to_project(uuid) from public, anon;
grant execute on function public.is_trainee_assigned_to_project(uuid) to authenticated;

drop policy if exists "projects_trainee_assigned_select" on public.projects;
create policy "projects_trainee_assigned_select"
on public.projects
for select
to authenticated
using (
  public.is_trainee_assigned_to_project(projects.id)
);

