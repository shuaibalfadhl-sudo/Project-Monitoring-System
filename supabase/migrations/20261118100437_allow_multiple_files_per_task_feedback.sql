-- allow_multiple_files_per_task_feedback
-- Run the same SQL in the cloud (test) SQL Editor. This file is applied to LIVE when dev is merged into main.
-- Rules: plain SQL only; no BEGIN/COMMIT (each file already runs as one all-or-nothing step);
--        no CREATE INDEX CONCURRENTLY; new tables need their GRANT lines;
--        never edit or rename this file once it is on main (fix with a new file).

-- One feedback row can now carry several files: file_path becomes file_paths text[].
-- The storage read policy depends on file_path, so it is dropped before the column.
drop policy if exists "task_feedback_files_read" on storage.objects;

alter table public.task_feedback add column if not exists file_paths text[] not null default '{}';

do $do$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'task_feedback' and column_name = 'file_path'
  ) then
    update public.task_feedback
       set file_paths = array[file_path]
     where file_path is not null;
    alter table public.task_feedback drop column file_path;
  end if;
end;
$do$;

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

create policy "task_feedback_files_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'task-feedback'
  and exists (
    select 1
    from public.task_feedback f
    where name = any(f.file_paths)
  )
);

