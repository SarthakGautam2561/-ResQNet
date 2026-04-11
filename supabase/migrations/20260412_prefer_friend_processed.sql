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
