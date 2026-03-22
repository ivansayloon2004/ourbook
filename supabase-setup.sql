create extension if not exists "pgcrypto";

create table if not exists public.couple_spaces (
  id uuid primary key default gen_random_uuid(),
  shared_code text not null unique,
  phrase_hash text not null unique,
  couple_title text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  shared_code text not null,
  couple_title text,
  partner_names text,
  anniversary_date date,
  hero_quote text,
  reminder_days integer not null default 7,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles add column if not exists couple_title text;
alter table public.profiles add column if not exists partner_names text;
alter table public.profiles add column if not exists anniversary_date date;
alter table public.profiles add column if not exists hero_quote text;
alter table public.profiles add column if not exists reminder_days integer not null default 7;

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
  photo_paths jsonb not null default '[]'::jsonb,
  is_favorite boolean not null default false,
  is_pinned boolean not null default false,
  album_name text,
  song_link text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.memories add column if not exists is_favorite boolean not null default false;
alter table public.memories add column if not exists photo_paths jsonb not null default '[]'::jsonb;
alter table public.memories add column if not exists is_pinned boolean not null default false;
alter table public.memories add column if not exists album_name text;
alter table public.memories add column if not exists song_link text;

create table if not exists public.memory_comments (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  couple_code text not null,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.memory_reactions (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  couple_code text not null,
  author_name text not null,
  reaction text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (memory_id, owner_id, reaction)
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  couple_code text not null,
  title text not null,
  description text,
  milestone_date date not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.private_letters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  couple_code text not null,
  author_name text not null,
  recipient_name text not null,
  title text not null,
  body text not null,
  is_opened boolean not null default false,
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

create or replace function public.reserve_couple_space(
  input_shared_code text,
  input_phrase_hash text,
  input_couple_title text
)
returns table (shared_code text, couple_title text)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := lower(regexp_replace(coalesce(input_shared_code, ''), '[^a-z0-9]+', '-', 'g'));
  normalized_title text := trim(coalesce(input_couple_title, ''));
begin
  normalized_code := regexp_replace(normalized_code, '(^-+|-+$)', '', 'g');

  if length(normalized_title) < 3 then
    raise exception 'Add your names or couple title first.';
  end if;

  if length(normalized_code) < 4 then
    raise exception 'Choose a shared space code with at least 4 characters.';
  end if;

  if coalesce(length(input_phrase_hash), 0) <> 64 then
    raise exception 'Phrase security check failed. Try again.';
  end if;

  insert into public.couple_spaces (shared_code, phrase_hash, couple_title)
  values (normalized_code, input_phrase_hash, normalized_title);

  return query
  select normalized_code, normalized_title;
exception
  when unique_violation then
    if exists (
      select 1
      from public.couple_spaces
      where couple_spaces.shared_code = normalized_code
    ) then
      raise exception 'That shared space code is already taken. Try a more unique one.';
    end if;

    raise exception 'That private phrase is already reserved. Choose a different one.';
end;
$$;

create or replace function public.find_couple_space_by_phrase(input_phrase_hash text)
returns table (shared_code text, couple_title text)
language sql
security definer
set search_path = public
as $$
  select couple_spaces.shared_code, couple_spaces.couple_title
  from public.couple_spaces
  where couple_spaces.phrase_hash = input_phrase_hash
  limit 1
$$;

create or replace function public.find_couple_space_by_code(input_shared_code text)
returns table (shared_code text, couple_title text)
language sql
security definer
set search_path = public
as $$
  select couple_spaces.shared_code, couple_spaces.couple_title
  from public.couple_spaces
  where couple_spaces.shared_code = lower(regexp_replace(coalesce(input_shared_code, ''), '[^a-z0-9]+', '-', 'g'))
  limit 1
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.couple_spaces enable row level security;
alter table public.profiles enable row level security;
alter table public.memories enable row level security;
alter table public.memory_comments enable row level security;
alter table public.memory_reactions enable row level security;
alter table public.milestones enable row level security;
alter table public.private_letters enable row level security;

grant execute on function public.reserve_couple_space(text, text, text) to anon, authenticated;
grant execute on function public.find_couple_space_by_phrase(text) to anon, authenticated;
grant execute on function public.find_couple_space_by_code(text) to anon, authenticated;

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

drop policy if exists "memory comments shared read" on public.memory_comments;
create policy "memory comments shared read"
on public.memory_comments
for select
to authenticated
using (couple_code = public.current_shared_code());

drop policy if exists "memory comments shared insert" on public.memory_comments;
create policy "memory comments shared insert"
on public.memory_comments
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and couple_code = public.current_shared_code()
);

drop policy if exists "memory comments shared delete" on public.memory_comments;
create policy "memory comments shared delete"
on public.memory_comments
for delete
to authenticated
using (couple_code = public.current_shared_code());

drop policy if exists "memory reactions shared all" on public.memory_reactions;
create policy "memory reactions shared all"
on public.memory_reactions
for all
to authenticated
using (couple_code = public.current_shared_code())
with check (couple_code = public.current_shared_code());

drop policy if exists "milestones shared all" on public.milestones;
create policy "milestones shared all"
on public.milestones
for all
to authenticated
using (couple_code = public.current_shared_code())
with check (couple_code = public.current_shared_code());

drop policy if exists "letters shared all" on public.private_letters;
create policy "letters shared all"
on public.private_letters
for all
to authenticated
using (couple_code = public.current_shared_code())
with check (couple_code = public.current_shared_code());

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

do $$
begin
  alter publication supabase_realtime add table public.memory_comments;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.memory_reactions;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.milestones;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.private_letters;
exception
  when duplicate_object then null;
end $$;
