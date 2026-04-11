-- Backfill processed + analytics from existing sos_reports (optional)
insert into sos_reports_processed (
  id, source_project, name, phone, latitude, longitude, category, message, created_at, district,
  verified_severity, supply_requirements, casualties_reported, processed_at, rephrased_message
)
select
  r.id,
  'local',
  r.name,
  r.phone,
  r.latitude,
  r.longitude,
  r.category,
  r.message,
  r.created_at,
  coalesce(r.district, r.source_device, 'Unknown') as district,
  r.severity,
  case
    when r.category = 'Food / Water' then jsonb_build_object('food', 1, 'water', 1, 'doctor', 0, 'shelter', 0, 'medicines', 0)
    when r.category = 'Shelter Needed' then jsonb_build_object('food', 0, 'water', 0, 'doctor', 0, 'shelter', 1, 'medicines', 0)
    when r.category = 'Medical Emergency' then jsonb_build_object('food', 0, 'water', 0, 'doctor', 1, 'shelter', 0, 'medicines', 1)
    else jsonb_build_object('food', 0, 'water', 0, 'doctor', 0, 'shelter', 0, 'medicines', 0)
  end,
  false,
  now(),
  r.message
from sos_reports r
on conflict (id)
do update set
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

do $$
declare
  rec record;
begin
  for rec in
    select distinct district, created_at::date as date_bucket
    from sos_reports_processed
  loop
    perform update_disaster_analytics('local', rec.district, rec.date_bucket);
  end loop;
end $$;
