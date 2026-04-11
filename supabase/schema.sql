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
    create type sos_status as enum ('pending', 'processed', 'in_progress', 'resolved');
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
  district text,
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

-- Processed SOS reports (normalized/verified)
create table if not exists sos_reports_processed (
  id uuid primary key references sos_reports(id) on delete cascade,
  source_project text not null default 'local',
  name text,
  phone text,
  latitude double precision not null,
  longitude double precision not null,
  category text,
  message text,
  created_at timestamptz not null,
  district text,
  detailed_area text,
  verified_severity int,
  supply_requirements jsonb default '{}'::jsonb,
  casualties_reported boolean default false,
  processed_at timestamptz not null default now(),
  rephrased_message text
);

create index if not exists sos_reports_processed_created_idx on sos_reports_processed (created_at desc);
create index if not exists sos_reports_processed_district_idx on sos_reports_processed (district);
create index if not exists sos_reports_processed_source_idx on sos_reports_processed (source_project);
create index if not exists sos_reports_processed_processed_at_idx on sos_reports_processed (processed_at desc);

-- Disaster analytics (daily aggregates)
create table if not exists disaster_analytics (
  id uuid primary key default gen_random_uuid(),
  source_project text not null default 'local',
  district text not null,
  date_bucket date not null,
  total_incidents int default 0,
  avg_severity double precision,
  critical_needs jsonb default '{}'::jsonb,
  last_updated timestamptz default now(),
  overall_summary text
);

create unique index if not exists disaster_analytics_district_date_idx on disaster_analytics (source_project, district, date_bucket);
create index if not exists disaster_analytics_source_idx on disaster_analytics (source_project);
create index if not exists disaster_analytics_date_idx on disaster_analytics (date_bucket desc);

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
alter table sos_reports_processed enable row level security;
alter table disaster_analytics enable row level security;
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

-- Processed SOS policies (read only for clients)
drop policy if exists "Anyone can read processed SOS" on sos_reports_processed;
create policy "Anyone can read processed SOS" on sos_reports_processed
  for select to anon, authenticated using (true);

-- Analytics policies (read only)
drop policy if exists "Anyone can read analytics" on disaster_analytics;
create policy "Anyone can read analytics" on disaster_analytics
  for select to anon, authenticated using (true);

-- Processing functions
create or replace function update_disaster_analytics(p_source text, p_district text, p_date date)
returns void as $$
declare
  total_count int;
  avg_sev double precision;
  needs jsonb;
  summary text;
begin
  select count(*), avg(verified_severity)
    into total_count, avg_sev
  from sos_reports_processed
  where source_project = p_source
    and district = p_district
    and created_at::date = p_date;

  select jsonb_build_object(
    'food', coalesce(sum((supply_requirements->>'food')::int), 0),
    'water', coalesce(sum((supply_requirements->>'water')::int), 0),
    'doctor', coalesce(sum((supply_requirements->>'doctor')::int), 0),
    'shelter', coalesce(sum((supply_requirements->>'shelter')::int), 0),
    'medicines', coalesce(sum((supply_requirements->>'medicines')::int), 0)
  )
    into needs
  from sos_reports_processed
  where source_project = p_source
    and district = p_district
    and created_at::date = p_date;

  summary := format('District %s has %s incidents today with avg severity %s.', p_district, total_count, coalesce(avg_sev, 0));

  insert into disaster_analytics (source_project, district, date_bucket, total_incidents, avg_severity, critical_needs, last_updated, overall_summary)
  values (p_source, p_district, p_date, total_count, avg_sev, needs, now(), summary)
  on conflict (source_project, district, date_bucket)
  do update set
    total_incidents = excluded.total_incidents,
    avg_severity = excluded.avg_severity,
    critical_needs = excluded.critical_needs,
    last_updated = excluded.last_updated,
    overall_summary = excluded.overall_summary;
end;
$$ language plpgsql security definer;

create or replace function process_sos_report()
returns trigger as $$
declare
  needs jsonb;
  district_val text;
  has_friend boolean;
begin
  select exists(
    select 1 from sos_reports_processed
    where id = new.id and source_project = 'friend'
  ) into has_friend;

  if has_friend then
    return new;
  end if;

  district_val := coalesce(new.district, new.source_device, 'Unknown');

  needs := jsonb_build_object('food', 0, 'water', 0, 'doctor', 0, 'shelter', 0, 'medicines', 0);
  if new.category = 'Food / Water' then
    needs := jsonb_build_object('food', 1, 'water', 1, 'doctor', 0, 'shelter', 0, 'medicines', 0);
  elsif new.category = 'Shelter Needed' then
    needs := jsonb_build_object('food', 0, 'water', 0, 'doctor', 0, 'shelter', 1, 'medicines', 0);
  elsif new.category = 'Medical Emergency' then
    needs := jsonb_build_object('food', 0, 'water', 0, 'doctor', 1, 'shelter', 0, 'medicines', 1);
  end if;

  insert into sos_reports_processed (
    id, source_project, name, phone, latitude, longitude, category, message, created_at, district,
    verified_severity, supply_requirements, casualties_reported, processed_at, rephrased_message
  )
  values (
    new.id, 'local', new.name, new.phone, new.latitude, new.longitude, new.category, new.message,
    new.created_at, district_val, new.severity, needs, false, now(), new.message
  )
  on conflict (id)
  do update set
    source_project = excluded.source_project,
    name = excluded.name,
    phone = excluded.phone,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    category = excluded.category,
    message = excluded.message,
    created_at = excluded.created_at,
    district = excluded.district,
    verified_severity = excluded.verified_severity,
    supply_requirements = excluded.supply_requirements,
    processed_at = excluded.processed_at,
    rephrased_message = excluded.rephrased_message;

  perform update_disaster_analytics('local', district_val, new.created_at::date);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists process_sos_report_trigger on sos_reports;
create trigger process_sos_report_trigger
after insert or update on sos_reports
for each row execute procedure process_sos_report();

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
