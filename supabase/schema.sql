-- ResQNet database schema (Supabase Postgres)

create extension if not exists pgcrypto;

-- Enums
do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'official', 'ngo', 'volunteer', 'public');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'sos_status') then
    create type sos_status as enum ('pending', 'acknowledged', 'in_progress', 'resolved');
  end if;
end $$;

-- Profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  role user_role not null default 'public',
  created_at timestamptz not null default now()
);

-- SOS reports
create table if not exists sos_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  phone text,
  latitude double precision not null,
  longitude double precision not null,
  category text not null,
  severity int not null check (severity between 1 and 5),
  message text,
  status sos_status not null default 'pending',
  assigned_to uuid references profiles(id),
  source_device text,
  synced_at timestamptz
);

create index if not exists sos_reports_created_at_idx on sos_reports (created_at desc);
create index if not exists sos_reports_status_idx on sos_reports (status);
create index if not exists sos_reports_severity_idx on sos_reports (severity);

-- Shelters
create table if not exists shelters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  capacity int,
  contact text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Trigger: create profile on auth signup
create or replace function handle_new_user()
returns trigger as $$
declare
  user_role_val user_role;
begin
  begin
    user_role_val := (new.raw_user_meta_data->>'role')::user_role;
  exception when others then
    user_role_val := 'public'::user_role;
  end;

  insert into profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    coalesce(user_role_val, 'public'::user_role)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure handle_new_user();

-- Row Level Security
alter table profiles enable row level security;
alter table sos_reports enable row level security;
alter table shelters enable row level security;

-- Profiles policies
drop policy if exists "Profiles are viewable by authenticated users" on profiles;
create policy "Profiles are viewable by authenticated users" on profiles
  for select to authenticated using (true);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- SOS reports policies
drop policy if exists "Anyone can insert SOS" on sos_reports;
create policy "Anyone can insert SOS" on sos_reports
  for insert to anon, authenticated with check (true);

drop policy if exists "Anyone can read SOS" on sos_reports;
create policy "Anyone can read SOS" on sos_reports
  for select to anon, authenticated using (true);

drop policy if exists "Authenticated can update SOS" on sos_reports;
create policy "Authenticated can update SOS" on sos_reports
  for update to authenticated using (true) with check (true);

-- Shelters policies
drop policy if exists "Anyone can read shelters" on shelters;
create policy "Anyone can read shelters" on shelters
  for select to anon, authenticated using (true);

drop policy if exists "Authenticated can insert shelters" on shelters;
create policy "Authenticated can insert shelters" on shelters
  for insert to authenticated with check (true);

drop policy if exists "Authenticated can update shelters" on shelters;
create policy "Authenticated can update shelters" on shelters
  for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated can delete shelters" on shelters;
create policy "Authenticated can delete shelters" on shelters
  for delete to authenticated using (true);
