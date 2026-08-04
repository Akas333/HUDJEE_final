-- question_reports was created directly on the remote database, so it never picked up the
-- table-level GRANTs from 20260802000000_grant_permissions.sql (which only covered tables
-- existing at that time). Without them every read fails with 42501 permission denied,
-- breaking the CMS Reports page. RLS policies still govern row visibility.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_reports TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_reports TO service_role;
