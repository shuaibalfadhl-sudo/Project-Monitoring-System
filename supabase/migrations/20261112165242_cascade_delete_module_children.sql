-- cascade_delete_module_children
-- Run the same SQL in the cloud (test) SQL Editor. This file is applied to LIVE when dev is merged into main.
-- Rules: plain SQL only; no BEGIN/COMMIT (each file already runs as one all-or-nothing step);
--        no CREATE INDEX CONCURRENTLY; new tables need their GRANT lines;
--        never edit or rename this file once it is on main (fix with a new file).

-- Deleting a module must also remove its related rows. Replace the existing
-- foreign keys from the module child tables to project_modules with
-- ON DELETE CASCADE. Constraint names are looked up instead of hard-coded.
do $$
declare
  child_table text;
  fk record;
begin
  foreach child_table in array array['qa_document_history', 'project_module_status_history']
  loop
    for fk in
      select conname
      from pg_constraint
      where contype = 'f'
        and conrelid = format('public.%I', child_table)::regclass
        and confrelid = 'public.project_modules'::regclass
    loop
      execute format('alter table public.%I drop constraint %I', child_table, fk.conname);
    end loop;

    execute format(
      'alter table public.%I add constraint %I foreign key (module_id) references public.project_modules(id) on delete cascade',
      child_table,
      child_table || '_module_id_fkey'
    );
  end loop;
end $$;
