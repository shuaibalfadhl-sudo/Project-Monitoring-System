-- Storage policies for the private "project-prototypes" bucket.
-- Object layout: <project_id>/<module_id>/<unique>.html
-- The bucket and public.project_modules.prototype column are managed outside this migration.

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
          from public.profiles pr
          where pr.id = auth.uid()
            and pr.role = 'super_admin'
        )
      )
  )
);

drop policy if exists "project_prototypes_owner_insert" on storage.objects;
create policy "project_prototypes_owner_insert"
on storage.objects
for insert
to authenticated
with check (
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
        exists (
          select 1
          from public.project_members pm
          where pm.project_id = m.project_id
            and pm.user_id = auth.uid()
            and pm.is_owner = true
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

drop policy if exists "project_prototypes_owner_update" on storage.objects;
create policy "project_prototypes_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'project-prototypes'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.project_modules m
    where m.id = ((storage.foldername(name))[2])::uuid
      and m.project_id = ((storage.foldername(name))[1])::uuid
      and (
        exists (
          select 1
          from public.project_members pm
          where pm.project_id = m.project_id
            and pm.user_id = auth.uid()
            and pm.is_owner = true
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
with check (
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
        exists (
          select 1
          from public.project_members pm
          where pm.project_id = m.project_id
            and pm.user_id = auth.uid()
            and pm.is_owner = true
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

drop policy if exists "project_prototypes_owner_delete" on storage.objects;
create policy "project_prototypes_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-prototypes'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.project_modules m
    where m.id = ((storage.foldername(name))[2])::uuid
      and m.project_id = ((storage.foldername(name))[1])::uuid
      and (
        exists (
          select 1
          from public.project_members pm
          where pm.project_id = m.project_id
            and pm.user_id = auth.uid()
            and pm.is_owner = true
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
