-- allow_assignee_to_start_weekly_task
-- Run the same SQL in the cloud (test) SQL Editor. This file is applied to LIVE when dev is merged into main.
-- Rules: plain SQL only; no BEGIN/COMMIT (each file already runs as one all-or-nothing step);
--        no CREATE INDEX CONCURRENTLY; new tables need their GRANT lines;
--        never edit or rename this file once it is on main (fix with a new file).

-- Assignees may now also start a task (pending -> in progress), in addition
-- to finishing one (in progress -> done). Every other column must stay
-- unchanged; creators and super admins can still change anything.
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

  raise exception 'Assigned personnel may only move a task from pending to in progress, or from in progress to done.';
end;
$$;

