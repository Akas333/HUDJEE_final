-- Table-level GRANTs for the challenges/social tables added in
-- 20260807000000_challenges_social.sql.
--
-- That migration enabled RLS and wrote policies but never granted the tables
-- themselves, so every read came back `42501 permission denied` rather than an
-- empty set — RLS only narrows what a role may already touch. The default
-- privileges set in 20260802000000_grant_permissions.sql did not cover these
-- three: ALTER DEFAULT PRIVILEGES applies only to objects created by the role
-- that ran it, and the push that created these tables did not match. Granting
-- explicitly is what 20260806000000_arena_session_contexts.sql already does.
--
-- The verbs mirror each table's policies rather than blanket-granting: a GRANT
-- with no matching policy is dead surface area.

-- FOR ALL policy ("Own mutes") — the app upserts and deletes.
GRANT SELECT, INSERT, UPDATE, DELETE ON challenge_mutes TO authenticated;

-- SELECT / INSERT / UPDATE policies only; matches are never deleted, they expire.
GRANT SELECT, INSERT, UPDATE ON challenge_matches TO authenticated;

-- SELECT / INSERT / UPDATE policies only; an attempt locks on submit.
GRANT SELECT, INSERT, UPDATE ON challenge_attempts TO authenticated;

GRANT ALL ON challenge_mutes, challenge_matches, challenge_attempts TO service_role;
