-- allow_assigned_trainees_to_read_qa_modules
-- Run the same SQL in the cloud (test) SQL Editor. This file is applied to LIVE when dev is merged into main.
-- Rules: plain SQL only; no BEGIN/COMMIT (each file already runs as one all-or-nothing step);
--        no CREATE INDEX CONCURRENTLY; new tables need their GRANT lines;
--        never edit or rename this file once it is on main (fix with a new file).

drop policy if exists "project_modules_trainee_assigned_select" on public.project_modules;
create policy "project_modules_trainee_assigned_select"
on public.project_modules
for select
to authenticated
using (
  public.is_trainee()
  and (
    assigned_developer_id = auth.uid()
    or assigned_auditor = auth.uid()
  )
);

drop policy if exists "projects_trainee_assigned_select" on public.projects;
create policy "projects_trainee_assigned_select"
on public.projects
for select
to authenticated
using (
  public.is_trainee()
  and exists (
    select 1
    from public.project_modules m
    where m.project_id = projects.id
      and (
        m.assigned_developer_id = auth.uid()
        or m.assigned_auditor = auth.uid()
      )
  )
);

