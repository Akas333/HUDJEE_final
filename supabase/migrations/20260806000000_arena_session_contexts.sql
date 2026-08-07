-- ── ARENA SESSION CONTEXTS ───────────────────────────────────────────────────
-- One row per subject per Arena session: the independent engine context that
-- subject runs on. The session itself stays in `sessions` (mode config lives in
-- its `config` JSONB) so Arena answers land in `answer_events` under a real
-- session id and every existing rollup — chapter mastery, coverage, readiness —
-- counts Arena practice without knowing Arena exists.
--
-- `starting_theta` is the subject's persisted ability rolled up over just the
-- chapters selected under it. Nothing but that subject's own answers ever moves
-- `current_theta`, which is what keeps a run of hard Physics from making the
-- next Maths question hard.

CREATE TABLE arena_session_contexts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject               TEXT NOT NULL CHECK (subject IN ('physics', 'chemistry', 'maths')),

  -- The chapters this context draws from, within its subject.
  chapter_ids           UUID[] NOT NULL DEFAULT '{}',

  starting_theta        NUMERIC NOT NULL DEFAULT 0,
  current_theta         NUMERIC NOT NULL DEFAULT 0,
  ending_theta          NUMERIC,

  questions_answered    INTEGER NOT NULL DEFAULT 0,
  correct_count         INTEGER NOT NULL DEFAULT 0,
  skipped_count         INTEGER NOT NULL DEFAULT 0,

  -- Skips are not answers, so they leave no `answer_event`; the ids are kept
  -- here to stop a skipped question coming straight back around.
  skipped_question_ids  UUID[] NOT NULL DEFAULT '{}',

  -- Modes 3 and 4: the per-subject target that locks the subject once met.
  target_count          INTEGER,
  locked_at             TIMESTAMPTZ,

  -- Per-subject clock. It only runs while the subject is active and freezes on
  -- switch, so it is written from the client at session end.
  elapsed_ms            BIGINT NOT NULL DEFAULT 0,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (session_id, subject)
);

CREATE INDEX idx_arena_contexts_session ON arena_session_contexts(session_id);
CREATE INDEX idx_arena_contexts_user ON arena_session_contexts(user_id);

ALTER TABLE arena_session_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read their own arena contexts"
  ON arena_session_contexts FOR SELECT
  USING (auth.uid() = user_id);

-- Writes come from the engine on the service-role key, same as the rest of the
-- adaptive layer.
CREATE POLICY "Service role writes arena contexts"
  ON arena_session_contexts FOR ALL
  USING (true);

-- Table-level GRANTs are separate from RLS here (see
-- 20260802000000_grant_permissions.sql) — without this a policy-passing read
-- still returns 42501.
GRANT SELECT ON arena_session_contexts TO authenticated;
GRANT ALL ON arena_session_contexts TO service_role;
