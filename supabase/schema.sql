-- Run the full file in Supabase Dashboard → SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_ajker_alo_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  slug text not null unique check (char_length(slug) between 1 and 180),
  category text not null,
  excerpt text not null default '',
  content text not null,
  cover_image text,
  image_alt text,
  author text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (key, value) values ('public', '{"siteName":"সময়ের পথ","tagline":"সময়ের সঙ্গে, সত্যের পথে","breakingText":"দেশজুড়ে নানা উদ্যোগে বদলে যাচ্ছে মানুষের জীবনযাত্রা • আজকের সব খবর পড়ুন এখানে","categories":["বাংলাদেশ","রাজনীতি","বিশ্ব","ব্যবসা","মতামত","খেলা","বিনোদন","চাকরি","জীবনযাপন","শিক্ষা","প্রযুক্তি","পরিবেশ"],"aboutText":"সময়ের পথ — সময়ের সঙ্গে, সত্যের পথে।","contactEmail":""}'::jsonb)
on conflict (key) do nothing;

grant usage on schema public to anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;
grant select on public.admins to authenticated;
grant execute on function public.is_ajker_alo_admin() to anon, authenticated;

create index if not exists posts_published_order on public.posts (published_at desc) where is_published = true;
alter table public.posts enable row level security;
alter table public.admins enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "published or admin can read posts" on public.posts;
create policy "published or admin can read posts" on public.posts for select
  using (is_published = true or public.is_ajker_alo_admin());
drop policy if exists "admin can insert posts" on public.posts;
create policy "admin can insert posts" on public.posts for insert
  with check (public.is_ajker_alo_admin());
drop policy if exists "admin can update posts" on public.posts;
create policy "admin can update posts" on public.posts for update
  using (public.is_ajker_alo_admin()) with check (public.is_ajker_alo_admin());
drop policy if exists "admin can delete posts" on public.posts;
create policy "admin can delete posts" on public.posts for delete
  using (public.is_ajker_alo_admin());
drop policy if exists "admin can read own admin row" on public.admins;
create policy "admin can read own admin row" on public.admins for select
  using (user_id = auth.uid());
drop policy if exists "public can read site settings" on public.site_settings;
create policy "public can read site settings" on public.site_settings for select
  using (key = 'public');
drop policy if exists "admin can manage site settings" on public.site_settings;
create policy "admin can manage site settings" on public.site_settings for all
  using (public.is_ajker_alo_admin()) with check (public.is_ajker_alo_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "public can view news photos" on storage.objects;
create policy "public can view news photos" on storage.objects for select
  using (bucket_id = 'post-images');
drop policy if exists "admin can upload news photos" on storage.objects;
create policy "admin can upload news photos" on storage.objects for insert
  with check (bucket_id = 'post-images' and public.is_ajker_alo_admin());
drop policy if exists "admin can update news photos" on storage.objects;
create policy "admin can update news photos" on storage.objects for update
  using (bucket_id = 'post-images' and public.is_ajker_alo_admin())
  with check (bucket_id = 'post-images' and public.is_ajker_alo_admin());
drop policy if exists "admin can delete news photos" on storage.objects;
create policy "admin can delete news photos" on storage.objects for delete
  using (bucket_id = 'post-images' and public.is_ajker_alo_admin());

-- Create your first admin account in Authentication → Users, then run this:
-- insert into public.admins (user_id) values ('PASTE_AUTH_USER_UUID_HERE');

