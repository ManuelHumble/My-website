-- Apply after the original supabase-schema.sql has been run.
-- This migration changes policy definitions and table grants only.
-- It does not modify content rows, Storage objects, users, tables, or buckets.
-- Existing public-read policies are intentionally left unchanged.

begin;

-- Update the four owner policies created by the original schema in place.
-- ALTER POLICY avoids dropping/recreating the existing policies.
alter policy "Owner can manage portfolio content"
  on public.portfolio_content
  to authenticated
  using ((auth.jwt() ->> 'email') = 'okoromanuel@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'okoromanuel@gmail.com');

alter policy "Owner can add portfolio images"
  on storage.objects
  to authenticated
  with check (
    bucket_id = 'portfolio-images'
    and (auth.jwt() ->> 'email') = 'okoromanuel@gmail.com'
  );

alter policy "Owner can update portfolio images"
  on storage.objects
  to authenticated
  using (
    bucket_id = 'portfolio-images'
    and (auth.jwt() ->> 'email') = 'okoromanuel@gmail.com'
  )
  with check (
    bucket_id = 'portfolio-images'
    and (auth.jwt() ->> 'email') = 'okoromanuel@gmail.com'
  );

alter policy "Owner can delete portfolio images"
  on storage.objects
  to authenticated
  using (
    bucket_id = 'portfolio-images'
    and (auth.jwt() ->> 'email') = 'okoromanuel@gmail.com'
  );

-- Add the restrictive CMS policies from the current schema only when absent.
-- They prevent another permissive policy from broadening access to CMS content.
do $migration$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'portfolio_content'
      and policyname = 'CMS enforce published-or-owner reads'
  ) then
    create policy "CMS enforce published-or-owner reads"
      on public.portfolio_content as restrictive for select to anon, authenticated
      using (
        status = 'published'
        or (
          (select auth.role()) = 'authenticated'
          and (select auth.jwt() ->> 'email') = 'okoromanuel@gmail.com'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'portfolio_content'
      and policyname = 'CMS enforce owner inserts'
  ) then
    create policy "CMS enforce owner inserts"
      on public.portfolio_content as restrictive for insert to anon, authenticated
      with check (
        (select auth.role()) = 'authenticated'
        and (select auth.jwt() ->> 'email') = 'okoromanuel@gmail.com'
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'portfolio_content'
      and policyname = 'CMS enforce owner updates'
  ) then
    create policy "CMS enforce owner updates"
      on public.portfolio_content as restrictive for update to anon, authenticated
      using (
        (select auth.role()) = 'authenticated'
        and (select auth.jwt() ->> 'email') = 'okoromanuel@gmail.com'
      )
      with check (
        (select auth.role()) = 'authenticated'
        and (select auth.jwt() ->> 'email') = 'okoromanuel@gmail.com'
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'portfolio_content'
      and policyname = 'CMS enforce owner deletes'
  ) then
    create policy "CMS enforce owner deletes"
      on public.portfolio_content as restrictive for delete to anon, authenticated
      using (
        (select auth.role()) = 'authenticated'
        and (select auth.jwt() ->> 'email') = 'okoromanuel@gmail.com'
      );
  end if;
end;
$migration$;

-- Restrict portfolio-image mutations to the owner without affecting other buckets.
do $migration$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'CMS enforce portfolio image inserts'
  ) then
    create policy "CMS enforce portfolio image inserts"
      on storage.objects as restrictive for insert to public
      with check (
        bucket_id <> 'portfolio-images'
        or (
          (select auth.role()) = 'authenticated'
          and (select auth.jwt() ->> 'email') = 'okoromanuel@gmail.com'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'CMS enforce portfolio image updates'
  ) then
    create policy "CMS enforce portfolio image updates"
      on storage.objects as restrictive for update to public
      using (
        bucket_id <> 'portfolio-images'
        or (
          (select auth.role()) = 'authenticated'
          and (select auth.jwt() ->> 'email') = 'okoromanuel@gmail.com'
        )
      )
      with check (
        bucket_id <> 'portfolio-images'
        or (
          (select auth.role()) = 'authenticated'
          and (select auth.jwt() ->> 'email') = 'okoromanuel@gmail.com'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'CMS enforce portfolio image deletes'
  ) then
    create policy "CMS enforce portfolio image deletes"
      on storage.objects as restrictive for delete to public
      using (
        bucket_id <> 'portfolio-images'
        or (
          (select auth.role()) = 'authenticated'
          and (select auth.jwt() ->> 'email') = 'okoromanuel@gmail.com'
        )
      );
  end if;
end;
$migration$;

-- Match the current schema's minimum client grants. RLS still decides which
-- rows each role can access; these grants remove privileges RLS cannot filter.
revoke all on table public.portfolio_content from public, anon, authenticated;
grant select on table public.portfolio_content to anon, authenticated;
grant insert, update, delete on table public.portfolio_content to authenticated;

commit;
