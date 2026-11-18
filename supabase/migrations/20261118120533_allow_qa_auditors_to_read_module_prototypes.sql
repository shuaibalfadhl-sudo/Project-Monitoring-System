-- allow_qa_auditors_to_read_module_prototypes
-- Run the same SQL in the cloud (test) SQL Editor. This file is applied to LIVE when dev is merged into main.
-- Rules: plain SQL only; no BEGIN/COMMIT (each file already runs as one all-or-nothing step);
--        no CREATE INDEX CONCURRENTLY; new tables need their GRANT lines;
--        never edit or rename this file once it is on main (fix with a new file).

-- The QA review popup (For QA Modules) now shows the module's HTML prototype.
-- Read access was limited to the assigned developer, the project owner and
-- super admins, so a system_auditor could not open the file. This recreates the
-- read policy with one extra branch: an auditor who is a member of the module's
-- project. Write policies are unchanged (owner / super admin only).

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
  and exists (
    select 1
    from public.project_modules m
    where m.id = ((storage.foldername(name))[2])::uuid
      and m.project_id = ((storage.foldername(name))[1])::uuid
      and (
        m.assigned_developer_id = auth.uid()
        or exists (
          select 1
          from public.project_members pm
          where pm.project_id = m.project_id
            and pm.user_id = auth.uid()
            and pm.is_owner = true
        )
        or exists (
          select 1
          from public.project_members pm
          join public.profiles pr on pr.id = pm.user_id
          where pm.project_id = m.project_id
            and pm.user_id = auth.uid()
            and pr.role = 'system_auditor'
        )
        or exists (
          select 1
          from public.profiles pr
          where pr.id = auth.uid()
            and pr.role = 'super_admin'
        )
      )
  )
);

