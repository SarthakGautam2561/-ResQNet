alter table sos_reports add column if not exists district text;

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
begin
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
