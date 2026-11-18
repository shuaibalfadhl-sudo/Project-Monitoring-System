-- add_revision_status_to_weekly_plans
-- Run the same SQL in the cloud (test) SQL Editor. This file is applied to LIVE when dev is merged into main.
-- Rules: plain SQL only; no BEGIN/COMMIT (each file already runs as one all-or-nothing step);
--        no CREATE INDEX CONCURRENTLY; new tables need their GRANT lines;
--        never edit or rename this file once it is on main (fix with a new file).

-- Adds the 'revision' status: an owner reviewing a done task can send it back
-- for rework (done -> revision) or close it (done -> completed). Creators and
-- super admins may already set any status; the assignee may now also pick a
-- revision task back up (revision -> in progress) with every other column
-- unchanged.
alter table public.weekly_plans
  drop constraint if exists weekly_plans_status_check;
alter table public.weekly_plans
  add constraint weekly_plans_status_check
  check (status in ('pending', 'onhold', 'in progress', 'done', 'completed', 'revision'));

create or replace function public.enforce_weekly_plan_update()
returns trigger
language plpgsql
as $$
declare
  actor uuid := auth.uid();
begin
  if actor = old.created_by or public.is_super_admin() then
    new.updated_by := actor;
    new.updated_at := now();
    return new;
  end if;

  if actor = old.assigned_personnel
     and (
       (old.status = 'pending' and new.status = 'in progress')
       or (old.status = 'revision' and new.status = 'in progress')
       or (old.status = 'in progress' and new.status = 'done')
     )
     and new.assigned_personnel = old.assigned_personnel
     and new.module is not distinct from old.module
     and new.date_weekly is not distinct from old.date_weekly
     and new.date_weekly_end is not distinct from old.date_weekly_end
     and new.title is not distinct from old.title
     and new.description is not distinct from old.description
     and new.document_attachments is not distinct from old.document_attachments
     and new.created_by = old.created_by
     and new.created_at = old.created_at
  then
    new.updated_by := actor;
    new.updated_at := now();
    return new;
  end if;

  raise exception 'Assigned personnel may only move a task from pending or revision to in progress, or from in progress to done.';
end;
$$;

