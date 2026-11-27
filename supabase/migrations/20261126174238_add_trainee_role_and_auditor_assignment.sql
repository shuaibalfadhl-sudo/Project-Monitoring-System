-- add_trainee_role_and_auditor_assignment
-- Run the same SQL in the cloud (test) SQL Editor. This file is applied to LIVE when dev is merged into main.
-- Rules: plain SQL only; no BEGIN/COMMIT (each file already runs as one all-or-nothing step);
--        no CREATE INDEX CONCURRENTLY; new tables need their GRANT lines;
--        never edit or rename this file once it is on main (fix with a new file).

alter table public.project_modules
  add column if not exists assigned_auditor uuid references public.profiles(id) on delete set null;

create index if not exists project_modules_assigned_auditor_idx
  on public.project_modules (assigned_auditor);

-- The original role CHECK lives only in Supabase, so replace every role CHECK
-- while preserving the roles already supported by the application.
do $$
declare
  role_constraint text;
begin
  for role_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', role_constraint);
  end loop;
end;
$$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('project_manager', 'system_auditor', 'developer', 'super_admin', 'devops', 'trainee', 'pending'));

alter table public.project_modules
  drop constraint if exists project_modules_status_check;

alter table public.project_modules
  add constraint project_modules_status_check
  check (status in (
    'pending',
    'for data gathering',
    'for_data_gathering',
    'development',
    'developing',
    'pm_review',
    'for_qa',
    'auditing',
    'trainee_approve',
    'for revision',
    'for_revision',
    'revision',
    'revising',
    'on_hold',
    'qa_approved',
    'deployment',
    'deployed'
  ));

create or replace function public.is_trainee()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'trainee'
  );
$$;

revoke execute on function public.is_trainee() from public, anon;
grant execute on function public.is_trainee() to authenticated;

-- Existing project-member policies are permissive, so restrictive policies are
-- required to keep trainees assignment-scoped even when they belong to a project.
drop policy if exists "project_modules_trainee_read_scope" on public.project_modules;
create policy "project_modules_trainee_read_scope"
on public.project_modules
as restrictive
for select
to authenticated
using (
  not public.is_trainee()
  or assigned_developer_id = auth.uid()
  or assigned_auditor = auth.uid()
);

drop policy if exists "project_modules_trainee_update_scope" on public.project_modules;
create policy "project_modules_trainee_update_scope"
on public.project_modules
as restrictive
for update
to authenticated
using (
  not public.is_trainee()
  or assigned_developer_id = auth.uid()
  or assigned_auditor = auth.uid()
)
with check (
  not public.is_trainee()
  or assigned_developer_id = auth.uid()
  or assigned_auditor = auth.uid()
);

drop policy if exists "project_modules_trainee_assigned_update" on public.project_modules;
create policy "project_modules_trainee_assigned_update"
on public.project_modules
for update
to authenticated
using (
  public.is_trainee()
  and (assigned_developer_id = auth.uid() or assigned_auditor = auth.uid())
)
with check (
  public.is_trainee()
  and (assigned_developer_id = auth.uid() or assigned_auditor = auth.uid())
);

drop policy if exists "project_modules_trainee_no_insert" on public.project_modules;
create policy "project_modules_trainee_no_insert"
on public.project_modules
as restrictive
for insert
to authenticated
with check (not public.is_trainee());

drop policy if exists "project_modules_trainee_no_delete" on public.project_modules;
create policy "project_modules_trainee_no_delete"
on public.project_modules
as restrictive
for delete
to authenticated
using (not public.is_trainee());

create or replace function public.enforce_trainee_module_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  actor_role text;
begin
  select role into actor_role from public.profiles where id = actor;

  if actor_role is distinct from 'trainee' then
    return new;
  end if;

  if to_jsonb(new) - array['status', 'qa_result_document_url', 'updated_at']
     is distinct from to_jsonb(old) - array['status', 'qa_result_document_url', 'updated_at'] then
    raise exception 'Trainees may only update module status and QA result document.';
  end if;

  if old.status in ('for_qa', 'auditing', 'trainee_approve')
     and old.assigned_auditor = actor then
    if new.status not in ('trainee_approve', 'for revision', 'for_revision') then
      raise exception 'Assigned trainee auditors may only mark Trainee Approve or Needs Revision.';
    end if;
  elsif old.assigned_developer_id = actor then
    if new.status not in ('development', 'developing', 'revision', 'revising', 'pm_review') then
      raise exception 'Assigned trainee developers may only use developer workflow statuses.';
    end if;
  elsif old.assigned_auditor = actor then
    if new.status not in ('trainee_approve', 'for revision', 'for_revision') then
      raise exception 'Assigned trainee auditors may only mark Trainee Approve or Needs Revision.';
    end if;
  else
    raise exception 'Trainees may only update modules assigned to them.';
  end if;

  return new;
end;
$$;

drop trigger if exists modules_b_enforce_trainee_update_scope on public.project_modules;
create trigger modules_b_enforce_trainee_update_scope
  before update on public.project_modules
  for each row execute function public.enforce_trainee_module_update_scope();

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
    or exists (
      select 1
      from public.project_members pm
      join public.projects p on p.id = pm.project_id
      where p.id = module_record.project_id
        and pm.user_id = actor
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

drop policy if exists "module_feedback_select_parties_admin" on public.module_feedback;
create policy "module_feedback_select_parties_admin"
on public.module_feedback
for select
to authenticated
using (
  created_by = auth.uid()
  or feedback_user_id = auth.uid()
  or public.is_super_admin()
  or exists (
    select 1
    from public.project_modules m
    where m.id = module_id
      and (
        m.assigned_developer_id = auth.uid()
        or m.assigned_auditor = auth.uid()
        or m.qa_acknowledged_by = auth.uid()
        or exists (
          select 1
          from public.project_members pm
          where pm.project_id = m.project_id
            and pm.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "module_feedback_trainee_read_scope" on public.module_feedback;
create policy "module_feedback_trainee_read_scope"
on public.module_feedback
as restrictive
for select
to authenticated
using (
  not public.is_trainee()
  or exists (
    select 1
    from public.project_modules m
    where m.id = module_id
      and (m.assigned_developer_id = auth.uid() or m.assigned_auditor = auth.uid())
  )
);

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
  );
$$;

revoke execute on function public.can_read_project_prototype(uuid, uuid) from public, anon;
grant execute on function public.can_read_project_prototype(uuid, uuid) to authenticated;

drop policy if exists "qa_document_history_trainee_assigned_select" on public.qa_document_history;
create policy "qa_document_history_trainee_assigned_select"
on public.qa_document_history
for select
to authenticated
using (
  exists (
    select 1
    from public.project_modules m
    where m.id = module_id
      and (m.assigned_developer_id = auth.uid() or m.assigned_auditor = auth.uid())
  )
);

drop policy if exists "qa_document_history_trainee_read_scope" on public.qa_document_history;
create policy "qa_document_history_trainee_read_scope"
on public.qa_document_history
as restrictive
for select
to authenticated
using (
  not public.is_trainee()
  or exists (
    select 1
    from public.project_modules m
    where m.id = module_id
      and (m.assigned_developer_id = auth.uid() or m.assigned_auditor = auth.uid())
  )
);

drop policy if exists "qa_document_history_trainee_auditor_insert" on public.qa_document_history;
create policy "qa_document_history_trainee_auditor_insert"
on public.qa_document_history
for insert
to authenticated
with check (
  public.is_trainee()
  and uploaded_by = auth.uid()
  and exists (
    select 1
    from public.project_modules m
    where m.id = module_id
      and m.assigned_auditor = auth.uid()
  )
);

drop policy if exists "project_module_status_history_trainee_assigned_select" on public.project_module_status_history;
create policy "project_module_status_history_trainee_assigned_select"
on public.project_module_status_history
for select
to authenticated
using (
  exists (
    select 1
    from public.project_modules m
    where m.id = module_id
      and (m.assigned_developer_id = auth.uid() or m.assigned_auditor = auth.uid())
  )
);

drop policy if exists "project_module_status_history_trainee_read_scope" on public.project_module_status_history;
create policy "project_module_status_history_trainee_read_scope"
on public.project_module_status_history
as restrictive
for select
to authenticated
using (
  not public.is_trainee()
  or exists (
    select 1
    from public.project_modules m
    where m.id = module_id
      and (m.assigned_developer_id = auth.uid() or m.assigned_auditor = auth.uid())
  )
);
