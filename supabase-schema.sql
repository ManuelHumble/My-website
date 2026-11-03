-- Run once in Supabase SQL Editor. Replace the admin email if needed.
create extension if not exists pgcrypto;

create table if not exists public.portfolio_content (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('project', 'article', 'page')),
  title text not null,
  slug text not null unique,
  description text not null default '',
  body_markdown text not null default '',
  image_url text not null default '',
  image_title text not null default '',
  image_alt text not null default '',
  image_caption text not null default '',
  gallery_images jsonb not null default '[]'::jsonb,
  links jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  project_url text not null default '',
  project_label text not null default 'View project',
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint portfolio_content_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

alter table public.portfolio_content
  add column if not exists gallery_images jsonb not null default '[]'::jsonb;
alter table public.portfolio_content
  add column if not exists links jsonb not null default '[]'::jsonb;
alter table public.portfolio_content
  drop constraint if exists portfolio_content_kind_check;
alter table public.portfolio_content
  add constraint portfolio_content_kind_check check (kind in ('project', 'article', 'page'));

create index if not exists portfolio_content_public_idx
  on public.portfolio_content (kind, status, published_at desc);

alter table public.portfolio_content enable row level security;

drop policy if exists "Public can read published content" on public.portfolio_content;
create policy "Public can read published content"
  on public.portfolio_content for select
  using (status = 'published');

drop policy if exists "Owner can manage portfolio content" on public.portfolio_content;
create policy "Owner can manage portfolio content"
  on public.portfolio_content for all to authenticated
  using ((auth.jwt() ->> 'email') = 'okoromanuel@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'okoromanuel@gmail.com');

-- Restrictive policies cap any other permissive policies that might already
-- exist on this table. PostgreSQL combines permissive policies with OR, so
-- the owner check must also be enforced with AND.
drop policy if exists "CMS enforce published-or-owner reads" on public.portfolio_content;
create policy "CMS enforce published-or-owner reads"
  on public.portfolio_content as restrictive for select to anon, authenticated
  using (
    status = 'published'
    or (
      (select auth.role()) = 'authenticated'
      and (select auth.jwt() ->> 'email') = 'okoromanuel@gmail.com'
    )
  );

drop policy if exists "CMS enforce owner inserts" on public.portfolio_content;
create policy "CMS enforce owner inserts"
  on public.portfolio_content as restrictive for insert to anon, authenticated
  with check (
    (select auth.role()) = 'authenticated'
    and (select auth.jwt() ->> 'email') = 'okoromanuel@gmail.com'
  );

drop policy if exists "CMS enforce owner updates" on public.portfolio_content;
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

drop policy if exists "CMS enforce owner deletes" on public.portfolio_content;
create policy "CMS enforce owner deletes"
  on public.portfolio_content as restrictive for delete to anon, authenticated
  using (
    (select auth.role()) = 'authenticated'
    and (select auth.jwt() ->> 'email') = 'okoromanuel@gmail.com'
  );

-- The public website only needs SELECT; the signed-in CMS needs CRUD.
-- This removes broad table grants such as TRUNCATE that RLS does not cover.
revoke all on table public.portfolio_content from public, anon, authenticated;
grant select on table public.portfolio_content to anon, authenticated;
grant insert, update, delete on table public.portfolio_content to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-images', 'portfolio-images', true, 8388608,
        array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = true, file_size_limit = 8388608,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view portfolio images" on storage.objects;
create policy "Public can view portfolio images"
  on storage.objects for select using (bucket_id = 'portfolio-images');

drop policy if exists "Owner can add portfolio images" on storage.objects;
create policy "Owner can add portfolio images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio-images'
    and (auth.jwt() ->> 'email') = 'okoromanuel@gmail.com');

drop policy if exists "Owner can update portfolio images" on storage.objects;
create policy "Owner can update portfolio images"
  on storage.objects for update to authenticated
  using (bucket_id = 'portfolio-images'
    and (auth.jwt() ->> 'email') = 'okoromanuel@gmail.com')
  with check (bucket_id = 'portfolio-images'
    and (auth.jwt() ->> 'email') = 'okoromanuel@gmail.com');

drop policy if exists "Owner can delete portfolio images" on storage.objects;
create policy "Owner can delete portfolio images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio-images'
    and (auth.jwt() ->> 'email') = 'okoromanuel@gmail.com');

-- These restrictive policies protect the CMS bucket even if another
-- permissive storage policy is added later. Other buckets are unaffected.
drop policy if exists "CMS enforce portfolio image inserts" on storage.objects;
create policy "CMS enforce portfolio image inserts"
  on storage.objects as restrictive for insert to public
  with check (
    bucket_id <> 'portfolio-images'
    or ((select auth.role()) = 'authenticated'
      and (select auth.jwt() ->> 'email') = 'okoromanuel@gmail.com')
  );

drop policy if exists "CMS enforce portfolio image updates" on storage.objects;
create policy "CMS enforce portfolio image updates"
  on storage.objects as restrictive for update to public
  using (
    bucket_id <> 'portfolio-images'
    or ((select auth.role()) = 'authenticated'
      and (select auth.jwt() ->> 'email') = 'okoromanuel@gmail.com')
  )
  with check (
    bucket_id <> 'portfolio-images'
    or ((select auth.role()) = 'authenticated'
      and (select auth.jwt() ->> 'email') = 'okoromanuel@gmail.com')
  );

drop policy if exists "CMS enforce portfolio image deletes" on storage.objects;
create policy "CMS enforce portfolio image deletes"
  on storage.objects as restrictive for delete to public
  using (
    bucket_id <> 'portfolio-images'
    or ((select auth.role()) = 'authenticated'
      and (select auth.jwt() ->> 'email') = 'okoromanuel@gmail.com')
  );
