-- allow_project_members_to_download_module_prototypes
-- Run the same SQL in the cloud (test) SQL Editor. This file is applied to LIVE when dev is merged into main.
-- Rules: plain SQL only; no BEGIN/COMMIT (each file already runs as one all-or-nothing step);
--        no CREATE INDEX CONCURRENTLY; new tables need their GRANT lines;
--        never edit or rename this file once it is on main (fix with a new file).

-- Downloading a prototype creates a signed URL, which needs SELECT on the storage
-- object. The old read policy only allowed the assigned developer, the project
-- owner, super admins and auditor members, so every other project member (PM,
-- developer, devops) was denied and Storage answered "Object not found".
-- Membership now covers owner and auditor too, and the project creator is kept as
-- a branch for managers without a membership row. Write policies stay unchanged
-- (owner / super admin only).

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
        )
        or exists (
          select 1
          from public.projects p
          where p.id = m.project_id
            and p.created_by = auth.uid()
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