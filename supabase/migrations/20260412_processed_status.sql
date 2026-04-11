do $$
begin
  if exists (
    select 1
    from pg_type
    where typname = 'sos_status'
  ) and exists (
    select 1
    from pg_enum
    where enumtypid = 'sos_status'::regtype
      and enumlabel = 'acknowledged'
  ) then
    alter type sos_status rename value 'acknowledged' to 'processed';
  end if;
end $$;
