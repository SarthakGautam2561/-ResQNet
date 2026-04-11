create index if not exists sos_reports_processed_source_idx on sos_reports_processed (source_project);
create index if not exists sos_reports_processed_processed_at_idx on sos_reports_processed (processed_at desc);
create index if not exists disaster_analytics_source_idx on disaster_analytics (source_project);
create index if not exists disaster_analytics_date_idx on disaster_analytics (date_bucket desc);
