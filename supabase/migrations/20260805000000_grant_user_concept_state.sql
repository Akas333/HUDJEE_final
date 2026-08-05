-- Same story as question_reports: user_concept_state never picked up the table-level
-- GRANTs from 20260802000000_grant_permissions.sql, so every client read fails with
-- 42501 permission denied ("permission denied for table user_concept_state") even
-- though its RLS policy already allows a user to select their own rows.
--
-- The mobile Home screen reads this table to show per-chapter mastery under
-- "Continue Learning"; without the grant it silently falls back to raw accuracy.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_concept_state TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_concept_state TO service_role;
