create extension if not exists "pgcrypto";

create table if not exists public.couple_spaces (
  id uuid primary key default gen_random_uuid(),
  shared_code text not null unique,
  phrase_hash text not null,
  phrase_salt text,
  phrase_fingerprint text unique,
  couple_title text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.couple_spaces add column if not exists phrase_salt text;
alter table public.couple_spaces add column if not exists phrase_fingerprint text;

create table if not exists public.couple_invites (
  id uuid primary key default gen_random_uuid(),
  shared_code text not null references public.couple_spaces(shared_code) on delete cascade,
  token text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  max_uses integer not null default 1,
  uses_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_users (
  email text primary key,
  role text not null default 'owner',
  created_at timestamptz not null default timezone('utc', now())
);

delete from public.admin_users
where lower(email) = 'ivansayloon20@gmail.com'
  and not exists (
    select 1
    from auth.users
    where lower(users.email) = lower(admin_users.email)
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

create table if not exists public.account_warnings (
  id uuid primary key default gen_random_uuid(),
  shared_code text not null references public.couple_spaces(shared_code) on delete cascade,
  target_profile_id uuid references public.profiles(id) on delete cascade,
  reason text not null,
  severity text not null default 'warning',
  status text not null default 'open',
  source text not null default 'manual',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.account_warnings add column if not exists target_profile_id uuid references public.profiles(id) on delete cascade;
alter table public.account_warnings add column if not exists severity text not null default 'warning';
alter table public.account_warnings add column if not exists status text not null default 'open';
alter table public.account_warnings add column if not exists source text not null default 'manual';
alter table public.account_warnings add column if not exists created_by uuid references auth.users(id) on delete set null;

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
declare
  wants_admin boolean := lower(coalesce(new.raw_user_meta_data->>'admin_registration', 'false')) = 'true';
  normalized_email text := lower(trim(coalesce(new.email, '')));
begin
  insert into public.profiles (id, display_name, shared_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'shared_code', 'our-story')
  )
  on conflict (id) do nothing;

  if wants_admin and normalized_email <> '' then
    if exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = normalized_email
    ) then
      null;
    elsif not exists (
      select 1
      from public.admin_users
    ) then
      insert into public.admin_users (email, role)
      values (normalized_email, 'owner')
      on conflict (email) do nothing;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.compute_phrase_fingerprint(input_phrase text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(lower(trim(coalesce(input_phrase, ''))), 'sha256'), 'hex')
$$;

create or replace function public.compute_phrase_hash(input_phrase text, input_salt text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(coalesce(input_phrase, '') || ':' || coalesce(input_salt, ''), 'sha256'), 'hex')
$$;

create or replace function public.current_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

create or replace function public.admin_signup_allowed(input_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when lower(trim(coalesce(input_email, ''))) = '' then false
    when exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(trim(input_email))
    ) then true
    else not exists (select 1 from public.admin_users)
  end
$$;

create or replace function public.reserve_couple_space(
  input_shared_code text,
  input_phrase text,
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
  generated_salt text := encode(extensions.gen_random_bytes(16), 'hex');
  phrase_fingerprint text;
  secured_phrase_hash text;
begin
  normalized_code := regexp_replace(normalized_code, '(^-+|-+$)', '', 'g');

  if length(normalized_title) < 3 then
    raise exception 'Add your names or couple title first.';
  end if;

  if length(normalized_code) < 4 then
    raise exception 'Choose a shared space code with at least 4 characters.';
  end if;

  if length(trim(coalesce(input_phrase, ''))) < 14 then
    raise exception 'Choose a stronger private phrase before continuing.';
  end if;

  phrase_fingerprint := public.compute_phrase_fingerprint(input_phrase);
  secured_phrase_hash := public.compute_phrase_hash(input_phrase, generated_salt);

  insert into public.couple_spaces (shared_code, phrase_hash, phrase_salt, phrase_fingerprint, couple_title)
  values (normalized_code, secured_phrase_hash, generated_salt, phrase_fingerprint, normalized_title);

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

create or replace function public.verify_couple_phrase(input_phrase text)
returns table (shared_code text, couple_title text)
language sql
security definer
set search_path = public
as $$
  select couple_spaces.shared_code, couple_spaces.couple_title
  from public.couple_spaces
  where (
    couple_spaces.phrase_salt is not null
    and couple_spaces.phrase_fingerprint = public.compute_phrase_fingerprint(input_phrase)
    and couple_spaces.phrase_hash = public.compute_phrase_hash(input_phrase, couple_spaces.phrase_salt)
  ) or (
    couple_spaces.phrase_salt is null
    and couple_spaces.phrase_hash = encode(extensions.digest(coalesce(input_phrase, ''), 'sha256'), 'hex')
  )
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

create or replace function public.create_couple_invite(input_shared_code text, input_expires_hours integer default 72)
returns table (token text, shared_code text, couple_title text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := lower(regexp_replace(coalesce(input_shared_code, ''), '[^a-z0-9]+', '-', 'g'));
  generated_token text := encode(extensions.gen_random_bytes(24), 'hex');
  resolved_title text;
  resolved_expiry timestamptz := timezone('utc', now()) + make_interval(hours => greatest(coalesce(input_expires_hours, 72), 1));
begin
  if auth.uid() is null then
    raise exception 'Sign in before creating an invite link.';
  end if;

  if normalized_code <> public.current_shared_code() then
    raise exception 'You can only create invite links for your own couple space.';
  end if;

  select couple_spaces.couple_title
  into resolved_title
  from public.couple_spaces
  where couple_spaces.shared_code = normalized_code;

  if resolved_title is null then
    raise exception 'Reserve your couple space before creating an invite link.';
  end if;

  insert into public.couple_invites (shared_code, token, created_by, expires_at)
  values (normalized_code, generated_token, auth.uid(), resolved_expiry);

  return query
  select generated_token, normalized_code, resolved_title, resolved_expiry;
end;
$$;

create or replace function public.claim_couple_invite(input_token text)
returns table (shared_code text, couple_title text)
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.couple_invites%rowtype;
  resolved_title text;
begin
  select *
  into invite_row
  from public.couple_invites
  where couple_invites.token = coalesce(input_token, '');

  if invite_row.id is null then
    raise exception 'That invite link is invalid.';
  end if;

  if invite_row.expires_at < timezone('utc', now()) then
    raise exception 'That invite link has expired.';
  end if;

  if invite_row.uses_count >= invite_row.max_uses then
    raise exception 'That invite link has already been used.';
  end if;

  update public.couple_invites
  set uses_count = uses_count + 1
  where id = invite_row.id;

  select couple_spaces.couple_title
  into resolved_title
  from public.couple_spaces
  where couple_spaces.shared_code = invite_row.shared_code;

  return query
  select invite_row.shared_code, resolved_title;
end;
$$;

create or replace function public.admin_site_overview()
returns table (
  total_couples bigint,
  total_profiles bigint,
  total_memories bigint,
  total_letters bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_is_admin() then
    raise exception 'Admin access required.';
  end if;

  return query
  select
    (select count(*) from public.couple_spaces),
    (select count(*) from public.profiles),
    (select count(*) from public.memories),
    (select count(*) from public.private_letters);
end;
$$;

create or replace function public.admin_couple_spaces()
returns table (
  shared_code text,
  couple_title text,
  profile_count bigint,
  memory_count bigint,
  letter_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_is_admin() then
    raise exception 'Admin access required.';
  end if;

  return query
  select
    spaces.shared_code,
    spaces.couple_title,
    count(distinct profiles.id) as profile_count,
    count(distinct memories.id) as memory_count,
    count(distinct letters.id) as letter_count
  from public.couple_spaces spaces
  left join public.profiles profiles on profiles.shared_code = spaces.shared_code
  left join public.memories memories on memories.couple_code = spaces.shared_code
  left join public.private_letters letters on letters.couple_code = spaces.shared_code
  group by spaces.shared_code, spaces.couple_title
  order by spaces.created_at desc;
end;
$$;

create or replace function public.admin_couple_moderation()
returns table (
  shared_code text,
  couple_title text,
  profile_count bigint,
  memory_count bigint,
  letter_count bigint,
  warning_count bigint,
  risk_level text,
  risk_reasons text,
  latest_warning text,
  members jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_is_admin() then
    raise exception 'Admin access required.';
  end if;

  return query
  select
    spaces.shared_code,
    spaces.couple_title,
    coalesce(profile_stats.profile_count, 0) as profile_count,
    coalesce(memory_stats.memory_count, 0) as memory_count,
    coalesce(letter_stats.letter_count, 0) as letter_count,
    coalesce(warning_stats.warning_count, 0) as warning_count,
    case
      when coalesce(risk_stats.keyword_hits, 0) >= 2
        or coalesce(risk_stats.activity_hits, 0) >= 20
        or coalesce(warning_stats.warning_count, 0) >= 3
      then 'high'
      when coalesce(risk_stats.keyword_hits, 0) >= 1
        or coalesce(risk_stats.activity_hits, 0) >= 10
        or coalesce(risk_stats.link_hits, 0) >= 4
        or coalesce(warning_stats.warning_count, 0) >= 1
      then 'watch'
      else 'clear'
    end as risk_level,
    coalesce(
      nullif(
        concat_ws(
          ' | ',
          case when coalesce(warning_stats.warning_count, 0) > 0 then warning_stats.warning_count::text || ' open warning(s)' end,
          case when coalesce(risk_stats.keyword_hits, 0) > 0 then risk_stats.keyword_hits::text || ' keyword risk hit(s)' end,
          case when coalesce(risk_stats.link_hits, 0) >= 4 then risk_stats.link_hits::text || ' link-heavy item(s)' end,
          case when coalesce(risk_stats.activity_hits, 0) >= 10 then risk_stats.activity_hits::text || ' activity event(s) in 24h' end
        ),
        ''
      ),
      'No automatic issues detected.'
    ) as risk_reasons,
    warning_stats.latest_warning,
    coalesce(member_stats.members, '[]'::jsonb) as members
  from public.couple_spaces spaces
  left join lateral (
    select count(*) as profile_count
    from public.profiles
    where profiles.shared_code = spaces.shared_code
  ) profile_stats on true
  left join lateral (
    select
      count(*) as memory_count,
      count(*) filter (
        where memories.created_at >= timezone('utc', now()) - interval '24 hours'
      ) as recent_memory_count,
      count(*) filter (
        where lower(coalesce(memories.title, '') || ' ' || coalesce(memories.description, '')) ~ '(scam|fraud|blackmail|extort|exploit|hate|abuse|violent|kill|nude|sexual)'
      ) as keyword_memory_count,
      count(*) filter (
        where coalesce(memories.description, '') ~* '(https?://|www\.)'
      ) as link_memory_count
    from public.memories
    where memories.couple_code = spaces.shared_code
  ) memory_stats on true
  left join lateral (
    select
      count(*) as letter_count,
      count(*) filter (
        where private_letters.created_at >= timezone('utc', now()) - interval '24 hours'
      ) as recent_letter_count,
      count(*) filter (
        where lower(coalesce(private_letters.title, '') || ' ' || coalesce(private_letters.body, '')) ~ '(scam|fraud|blackmail|extort|exploit|hate|abuse|violent|kill|nude|sexual)'
      ) as keyword_letter_count,
      count(*) filter (
        where coalesce(private_letters.body, '') ~* '(https?://|www\.)'
      ) as link_letter_count
    from public.private_letters
    where private_letters.couple_code = spaces.shared_code
  ) letter_stats on true
  left join lateral (
    select
      count(*) filter (
        where memory_comments.created_at >= timezone('utc', now()) - interval '24 hours'
      ) as recent_comment_count,
      count(*) filter (
        where lower(coalesce(memory_comments.body, '')) ~ '(scam|fraud|blackmail|extort|exploit|hate|abuse|violent|kill|nude|sexual)'
      ) as keyword_comment_count,
      count(*) filter (
        where coalesce(memory_comments.body, '') ~* '(https?://|www\.)'
      ) as link_comment_count
    from public.memory_comments
    where memory_comments.couple_code = spaces.shared_code
  ) comment_stats on true
  left join lateral (
    select
      coalesce(memory_stats.recent_memory_count, 0)
        + coalesce(letter_stats.recent_letter_count, 0)
        + coalesce(comment_stats.recent_comment_count, 0) as activity_hits,
      coalesce(memory_stats.keyword_memory_count, 0)
        + coalesce(letter_stats.keyword_letter_count, 0)
        + coalesce(comment_stats.keyword_comment_count, 0) as keyword_hits,
      coalesce(memory_stats.link_memory_count, 0)
        + coalesce(letter_stats.link_letter_count, 0)
        + coalesce(comment_stats.link_comment_count, 0) as link_hits
  ) risk_stats on true
  left join lateral (
    select
      count(*) filter (where account_warnings.status = 'open') as warning_count,
      (
        array_agg(
          account_warnings.severity || ': ' || left(account_warnings.reason, 120)
          order by account_warnings.created_at desc
        )
      )[1] as latest_warning
    from public.account_warnings
    where account_warnings.shared_code = spaces.shared_code
  ) warning_stats on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', profiles.id,
        'display_name', profiles.display_name,
        'email', coalesce(users.email, '')
      )
      order by profiles.created_at asc
    ) as members
    from public.profiles
    left join auth.users users on users.id = profiles.id
    where profiles.shared_code = spaces.shared_code
  ) member_stats on true
  order by spaces.created_at desc;
end;
$$;

create or replace function public.admin_recent_memories()
returns table (
  id uuid,
  shared_code text,
  title text,
  description text,
  author_name text,
  memory_date date,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_is_admin() then
    raise exception 'Admin access required.';
  end if;

  return query
  select
    memories.id,
    memories.couple_code as shared_code,
    memories.title,
    memories.description,
    memories.author_name,
    memories.memory_date,
    memories.created_at
  from public.memories memories
  order by memories.created_at desc
  limit 30;
end;
$$;

create or replace function public.admin_delete_memory(input_memory_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_is_admin() then
    raise exception 'Admin access required.';
  end if;

  delete from public.memories where memories.id = input_memory_id;
end;
$$;

create or replace function public.admin_warn_couple(
  input_shared_code text,
  input_reason text,
  input_severity text default 'warning'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := lower(trim(coalesce(input_shared_code, '')));
  normalized_reason text := trim(coalesce(input_reason, ''));
  normalized_severity text := lower(trim(coalesce(input_severity, 'warning')));
  warning_id uuid;
begin
  if not public.current_is_admin() then
    raise exception 'Admin access required.';
  end if;

  if normalized_reason = '' then
    raise exception 'Add a warning reason first.';
  end if;

  if normalized_severity not in ('warning', 'probation', 'suspend') then
    normalized_severity := 'warning';
  end if;

  insert into public.account_warnings (shared_code, reason, severity, status, source, created_by)
  values (normalized_code, normalized_reason, normalized_severity, 'open', 'manual', auth.uid())
  returning id into warning_id;

  return warning_id;
end;
$$;

create or replace function public.admin_clear_couple_warnings(input_shared_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_is_admin() then
    raise exception 'Admin access required.';
  end if;

  update public.account_warnings
  set status = 'resolved'
  where account_warnings.shared_code = lower(trim(coalesce(input_shared_code, '')))
    and account_warnings.status = 'open';
end;
$$;

create or replace function public.admin_delete_profile(input_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_is_admin() then
    raise exception 'Admin access required.';
  end if;

  delete from storage.objects
  where objects.bucket_id = 'memory-photos'
    and split_part(objects.name, '/', 2) = input_profile_id::text;

  delete from auth.users
  where users.id = input_profile_id;

  delete from public.profiles
  where profiles.id = input_profile_id;
end;
$$;

create or replace function public.admin_delete_couple_space(input_shared_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := lower(trim(coalesce(input_shared_code, '')));
begin
  if not public.current_is_admin() then
    raise exception 'Admin access required.';
  end if;

  delete from storage.objects
  where objects.bucket_id = 'memory-photos'
    and split_part(objects.name, '/', 1) = normalized_code;

  delete from auth.users
  where users.id in (
    select profiles.id
    from public.profiles
    where profiles.shared_code = normalized_code
  );

  delete from public.profiles where profiles.shared_code = normalized_code;
  delete from public.memories where memories.couple_code = normalized_code;
  delete from public.memory_comments where memory_comments.couple_code = normalized_code;
  delete from public.memory_reactions where memory_reactions.couple_code = normalized_code;
  delete from public.milestones where milestones.couple_code = normalized_code;
  delete from public.private_letters where private_letters.couple_code = normalized_code;
  delete from public.couple_invites where couple_invites.shared_code = normalized_code;
  delete from public.account_warnings where account_warnings.shared_code = normalized_code;
  delete from public.couple_spaces where couple_spaces.shared_code = normalized_code;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.couple_spaces enable row level security;
alter table public.couple_invites enable row level security;
alter table public.admin_users enable row level security;
alter table public.profiles enable row level security;
alter table public.account_warnings enable row level security;
alter table public.memories enable row level security;
alter table public.memory_comments enable row level security;
alter table public.memory_reactions enable row level security;
alter table public.milestones enable row level security;
alter table public.private_letters enable row level security;

grant execute on function public.reserve_couple_space(text, text, text) to anon, authenticated;
grant execute on function public.verify_couple_phrase(text) to anon, authenticated;
grant execute on function public.find_couple_space_by_code(text) to anon, authenticated;
grant execute on function public.create_couple_invite(text, integer) to authenticated;
grant execute on function public.claim_couple_invite(text) to anon, authenticated;
grant execute on function public.current_is_admin() to authenticated;
grant execute on function public.admin_signup_allowed(text) to anon, authenticated;
grant execute on function public.admin_site_overview() to authenticated;
grant execute on function public.admin_couple_spaces() to authenticated;
grant execute on function public.admin_couple_moderation() to authenticated;
grant execute on function public.admin_recent_memories() to authenticated;
grant execute on function public.admin_delete_memory(uuid) to authenticated;
grant execute on function public.admin_warn_couple(text, text, text) to authenticated;
grant execute on function public.admin_clear_couple_warnings(text) to authenticated;
grant execute on function public.admin_delete_profile(uuid) to authenticated;
grant execute on function public.admin_delete_couple_space(text) to authenticated;

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

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own"
on public.profiles
for insert
to authenticated
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
