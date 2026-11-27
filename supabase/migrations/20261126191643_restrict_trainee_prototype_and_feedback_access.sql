-- restrict_trainee_prototype_and_feedback_access
-- Run the same SQL in the cloud (test) SQL Editor. This file is applied to LIVE when dev is merged into main.
-- Rules: plain SQL only; no BEGIN/COMMIT (each file already runs as one all-or-nothing step);
--        no CREATE INDEX CONCURRENTLY; new tables need their GRANT lines;
--        never edit or rename this file once it is on main (fix with a new file).

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
        (
          public.is_trainee()
          and (
            m.assigned_developer_id = auth.uid()
            or m.assigned_auditor = auth.uid()
          )
        )
        or (
          not public.is_trainee()
          and (
            m.assigned_developer_id = auth.uid()
            or m.assigned_auditor = auth.uid()
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
        )
      )
  );
$$;

revoke execute on function public.can_read_project_prototype(uuid, uuid) from public, anon;
grant execute on function public.can_read_project_prototype(uuid, uuid) to authenticated;

create or replace function public.enforce_module_feedback_insert()
returns trigger
language plpgsql
as $$
declare
  actor uuid := auth.uid();
  module_record record;
  valid_role boolean;
begin
  select assigned_developer_id, assigned_auditor, qa_acknowledged_by, project_id
    into module_record
    from public.project_modules
   where id = new.module_id;

  if not found then
    raise exception 'Module not found.';
  end if;

  valid_role := (
    public.is_super_admin()
    or actor = module_record.assigned_developer_id
    or actor = module_record.assigned_auditor
    or actor = module_record.qa_acknowledged_by
    or (
      not public.is_trainee()
      and exists (
        select 1
        from public.project_members pm
        join public.projects p on p.id = pm.project_id
        where p.id = module_record.project_id
          and pm.user_id = actor
      )
    )
  );

  if not valid_role then
    raise exception 'Only assigned developers, assigned auditors, QA auditors, or project members may add feedback.';
  end if;

  if exists (
    select 1
    from unnest(new.file_paths) as p
    where p not like actor::text || '/%'
  ) then
    raise exception 'Feedback files must be uploaded to your own folder.';
  end if;

  new.feedback_user_id := actor;
  new.created_by := actor;
  return new;
end;
$$;
