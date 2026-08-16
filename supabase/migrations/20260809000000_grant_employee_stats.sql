-- `GET /api/team` returned `42501 permission denied for view employee_stats`.
--
-- 20260803000001_add_user_roles.sql granted the view to `authenticated` and
-- `anon` but not to `service_role`, and the team route — like every /api/*
-- route in the CMS — reads through the service-role client. Being service_role
-- bypasses RLS, not table-level GRANTs, so the view stayed unreadable for the
-- one role that actually queries it.
--
-- The view is defined with the default security_invoker = off, so it executes
-- as its owner; this grant is what lets service_role select from it at all.

GRANT SELECT ON public.employee_stats TO service_role;
