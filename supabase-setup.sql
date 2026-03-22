create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  shared_code text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  couple_code text not null,
  author_name text not null,
  title text not null,
  description text not null,
  category text not null,
  memory_date date not null,
  photo_path text,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.current_shared_code()
returns text
language sql
stable
as $$
  select shared_code from public.profiles where id = auth.uid()
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, shared_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'shared_code', 'our-story')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.memories enable row level security;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "memories shared read" on public.memories;
create policy "memories shared read"
on public.memories
for select
to authenticated
using (couple_code = public.current_shared_code());

drop policy if exists "memories shared insert" on public.memories;
create policy "memories shared insert"
on public.memories
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and couple_code = public.current_shared_code()
);

drop policy if exists "memories shared update" on public.memories;
create policy "memories shared update"
on public.memories
for update
to authenticated
using (couple_code = public.current_shared_code())
with check (couple_code = public.current_shared_code());

drop policy if exists "memories shared delete" on public.memories;
create policy "memories shared delete"
on public.memories
for delete
to authenticated
using (couple_code = public.current_shared_code());

insert into storage.buckets (id, name, public)
values ('memory-photos', 'memory-photos', false)
on conflict (id) do nothing;

drop policy if exists "photo upload shared" on storage.objects;
create policy "photo upload shared"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'memory-photos'
  and split_part(name, '/', 1) = public.current_shared_code()
);

drop policy if exists "photo read shared" on storage.objects;
create policy "photo read shared"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'memory-photos'
  and split_part(name, '/', 1) = public.current_shared_code()
);

drop policy if exists "photo delete shared" on storage.objects;
create policy "photo delete shared"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'memory-photos'
  and split_part(name, '/', 1) = public.current_shared_code()
);

do $$
begin
  alter publication supabase_realtime add table public.memories;
exception
  when duplicate_object then null;
end $$;
