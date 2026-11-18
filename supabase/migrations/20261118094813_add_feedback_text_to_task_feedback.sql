-- add_feedback_text_to_task_feedback
-- Run the same SQL in the cloud (test) SQL Editor. This file is applied to LIVE when dev is merged into main.
-- Rules: plain SQL only; no BEGIN/COMMIT (each file already runs as one all-or-nothing step);
--        no CREATE INDEX CONCURRENTLY; new tables need their GRANT lines;
--        never edit or rename this file once it is on main (fix with a new file).

-- Feedback text: the sender writes a message; the file becomes optional.
alter table public.task_feedback add column feedback text;
alter table public.task_feedback alter column file_path drop not null;

create or replace function public.enforce_task_feedback_insert()
returns trigger
language plpgsql
as $$
declare
  actor uuid := auth.uid();
  task_owner uuid;
  task_assignee uuid;
begin
  select created_by, assigned_personnel
    into task_owner, task_assignee
    from public.weekly_plans
   where id = new.task_id;

  if not found then
    raise exception 'Task not found.';
  end if;

  if actor = task_owner then
    new.is_task_owner := true;
  elsif actor = task_assignee then
    new.is_task_owner := false;
  else
    raise exception 'Only the task owner or the assigned person may add feedback.';
  end if;

  if new.file_path is not null and new.file_path not like actor::text || '/%' then
    raise exception 'Feedback files must be uploaded to your own folder.';
  end if;

  new.feedback_user_id := actor;
  new.created_by := actor;
  return new;
end;
$$;

