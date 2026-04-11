-- Disable local auto-processing so only friend-processed data is used
drop trigger if exists process_sos_report_trigger on sos_reports;
