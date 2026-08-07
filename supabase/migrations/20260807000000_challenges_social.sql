-- ── CHALLENGES (SOCIAL LAYER) ────────────────────────────────────────────────
-- The friend-vs-friend layer. Deliberately separate from the adaptive engine:
-- a challenge attempt writes nothing to `answer_events`, `user_concept_state`
-- or `sessions`, so a shared fixed question pool — which bypasses the personal
-- never-repeat rule and can re-serve a question the student has mastered —
-- cannot move anybody's theta. The only thing challenges feed is the social
-- record: win/loss per friend pair, the leaderboard, and the daily streak.
--
-- The pre-existing `challenges` table is a single-question "send a friend this
-- question" mechanic on a different status vocabulary. It is left alone; the
-- set-based workflow lives in `challenge_matches` + `challenge_attempts`.

-- ── PUBLIC PROFILE PROJECTION ────────────────────────────────────────────────
-- `profiles` is RLS'd to "own row only", which is right for cohort, strengths
-- and streak shields but leaves the social layer with nothing to render: a
-- leaderboard, a friend roster and "add by username" all need to read rows
-- belonging to other people. This view is the sanctioned hole in that wall —
-- a fixed, minimal column set, and nothing else.
--
-- `security_invoker = false` (the default, stated explicitly because the whole
-- point rides on it) runs the view as its owner, so the base table's RLS does
-- not apply. Supabase's linter flags such views; this one is intentional.

CREATE VIEW public_profiles WITH (security_invoker = false) AS
  SELECT
    id,
    username,
    level,
    total_xp,
    current_streak,
    longest_streak,
    created_at
  FROM profiles;

-- Signed-in users only: an anonymous reader has no business enumerating handles.
REVOKE ALL ON public_profiles FROM anon;
GRANT SELECT ON public_profiles TO authenticated;

-- ── FRIENDSHIPS ──────────────────────────────────────────────────────────────
-- The table shipped in the initial schema without RLS, which — combined with the
-- blanket table GRANTs — let any signed-in user read and rewrite everybody's
-- friend graph. Challenges are addressed by friendship, so that has to close
-- before this feature can be trusted at all.

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own friendships" ON friendships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- You may only ever send a request as yourself.
CREATE POLICY "Send own friend requests" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Either side can accept, block, or walk away.
CREATE POLICY "Respond to own friendships" ON friendships
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Remove own friendships" ON friendships
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- ── CHALLENGE MUTES ──────────────────────────────────────────────────────────
-- Recipient-side control from the Friend Profile screen: stay friends, stop
-- receiving challenges. Enforced in the insert trigger below, not just the UI.

CREATE TABLE challenge_mutes (
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  muted_user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, muted_user_id),
  CHECK (user_id <> muted_user_id)
);

ALTER TABLE challenge_mutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own mutes" ON challenge_mutes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── CHALLENGE MATCHES ────────────────────────────────────────────────────────

CREATE TABLE challenge_matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opponent_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  source          TEXT NOT NULL CHECK (source IN ('single_question', 'question_set')),

  -- The chapter the set was drawn from, plus a name/subject snapshot so a
  -- completed challenge still reads correctly after a chapter is renamed or
  -- deleted out from under it.
  chapter_id      UUID REFERENCES chapters(id) ON DELETE SET NULL,
  chapter_name    TEXT,
  subject         TEXT CHECK (subject IN ('physics', 'chemistry', 'maths')),

  -- Frozen at creation: both participants answer this exact list, in this exact
  -- order. Drawing per-participant would make the comparison meaningless.
  question_ids    UUID[] NOT NULL,

  -- Coarse band only. Challenges show a tier; the raw difficulty number stays
  -- an Arena-only affordance.
  difficulty_tier TEXT NOT NULL CHECK (difficulty_tier IN ('I', 'II', 'III', 'IV')),

  timer_type      TEXT NOT NULL DEFAULT 'per_question'
                    CHECK (timer_type IN ('per_question', 'total_budget')),
  timer_seconds   INTEGER NOT NULL CHECK (timer_seconds > 0),

  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'in_progress',
                                      'completed', 'declined', 'expired', 'void')),

  expires_at      TIMESTAMPTZ NOT NULL,
  responded_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (sender_id <> opponent_id),
  CHECK (cardinality(question_ids) > 0)
);

CREATE INDEX idx_challenge_matches_sender ON challenge_matches(sender_id);
CREATE INDEX idx_challenge_matches_opponent ON challenge_matches(opponent_id);
CREATE INDEX idx_challenge_matches_status ON challenge_matches(status);
CREATE INDEX idx_challenge_matches_expires ON challenge_matches(expires_at);

ALTER TABLE challenge_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read their matches" ON challenge_matches
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = opponent_id);

CREATE POLICY "Send matches as yourself" ON challenge_matches
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Both sides move the status: the opponent on accept/decline, either on
-- completion or expiry resolution.
CREATE POLICY "Participants update their matches" ON challenge_matches
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = opponent_id);

-- ── CHALLENGE ATTEMPTS ───────────────────────────────────────────────────────
-- One row per participant per match. Answers are kept as a JSONB list rather
-- than a child table on purpose: they are written once, read as a whole, and
-- never joined against the question bank for scoring.

CREATE TABLE challenge_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID NOT NULL REFERENCES challenge_matches(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  status          TEXT NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('not_started', 'in_progress', 'completed', 'dnf')),

  -- [{ question_id, correct, time_ms }], in the order they were answered.
  answers         JSONB NOT NULL DEFAULT '[]'::jsonb,

  correct_count   INTEGER NOT NULL DEFAULT 0,
  total_time_ms   BIGINT NOT NULL DEFAULT 0,
  longest_streak  INTEGER NOT NULL DEFAULT 0,

  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,

  UNIQUE (match_id, user_id)
);

CREATE INDEX idx_challenge_attempts_match ON challenge_attempts(match_id);
CREATE INDEX idx_challenge_attempts_user ON challenge_attempts(user_id, completed_at);

ALTER TABLE challenge_attempts ENABLE ROW LEVEL SECURITY;

-- Whether the caller has earned sight of the *other* participant's attempt: both
-- halves are in, or the window has closed. Anything less and knowing the
-- opponent's running score would change how you spend your own set.
--
-- SECURITY DEFINER, and a function rather than a subquery inside the policy:
-- reading `challenge_attempts` from within that table's own policy would send
-- Postgres round the RLS loop and raise "infinite recursion detected in policy".
CREATE OR REPLACE FUNCTION challenge_attempt_visible(p_match_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM challenge_matches m
    WHERE m.id = p_match_id
      AND (auth.uid() = m.sender_id OR auth.uid() = m.opponent_id)
      AND (
        m.expires_at <= NOW()
        OR (
          SELECT COUNT(*) FROM challenge_attempts a
          WHERE a.match_id = m.id AND a.completed_at IS NOT NULL
        ) >= 2
      )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION challenge_attempt_visible(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION challenge_attempt_visible(UUID) TO authenticated;

-- Your own attempt is always yours to read. Your opponent's only becomes
-- readable once the comparison is allowed to exist — so an "unlocked" client is
-- not one question away from the other side's score either.
CREATE POLICY "Participants read match attempts" ON challenge_attempts
  FOR SELECT USING (
    auth.uid() = user_id OR challenge_attempt_visible(match_id)
  );

CREATE POLICY "Write only your own attempt" ON challenge_attempts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM challenge_matches m
      WHERE m.id = challenge_attempts.match_id
        AND (auth.uid() = m.sender_id OR auth.uid() = m.opponent_id)
    )
  );

-- An attempt locks on submit: once `completed_at` is set there is no review or
-- edit pass, which is what keeps the comparison honest. The USING clause is what
-- enforces that — it is checked against the *existing* row, so an attempt that
-- already carries a `completed_at` matches nothing and cannot be updated again.
-- WITH CHECK has to be stated explicitly: Postgres otherwise reuses USING for the
-- new row too, which would reject the very write that sets `completed_at`.
CREATE POLICY "Update your own open attempt" ON challenge_attempts
  FOR UPDATE
  USING (auth.uid() = user_id AND completed_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- ── INSERT GUARDS ────────────────────────────────────────────────────────────
-- Spam control and the mute switch, in the database rather than the client:
-- both are about what one user can do to another, so neither can live behind a
-- disabled button.

CREATE OR REPLACE FUNCTION challenge_match_insert_guard()
RETURNS TRIGGER AS $$
DECLARE
  open_count INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM challenge_mutes
    WHERE user_id = NEW.opponent_id AND muted_user_id = NEW.sender_id
  ) THEN
    RAISE EXCEPTION 'This friend is not accepting challenges right now'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Max 3 challenges awaiting a response per pair, in this direction.
  SELECT COUNT(*) INTO open_count
  FROM challenge_matches
  WHERE sender_id = NEW.sender_id
    AND opponent_id = NEW.opponent_id
    AND status IN ('pending', 'accepted', 'in_progress')
    AND expires_at > NOW();

  IF open_count >= 3 THEN
    RAISE EXCEPTION 'You already have 3 open challenges with this friend'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER challenge_matches_insert_guard
  BEFORE INSERT ON challenge_matches
  FOR EACH ROW EXECUTE FUNCTION challenge_match_insert_guard();

-- ── EXPIRY RESOLUTION ────────────────────────────────────────────────────────
-- A challenge nobody finished has to land somewhere. Called by cron below; the
-- client also treats a past `expires_at` as resolved when it renders, so the
-- screens stay correct on a project where the cron job was never installed.

CREATE OR REPLACE FUNCTION resolve_expired_challenges()
RETURNS void AS $$
BEGIN
  -- Anything still open past its window: incomplete attempts become DNF.
  UPDATE challenge_attempts a
  SET status = 'dnf'
  FROM challenge_matches m
  WHERE a.match_id = m.id
    AND m.expires_at <= NOW()
    AND m.status IN ('pending', 'accepted', 'in_progress')
    AND a.completed_at IS NULL;

  -- Never opened → expired. Opened by at least one side → completed, and the
  -- comparison resolves on who actually finished. Neither side finished → void.
  UPDATE challenge_matches m
  SET status = CASE
        WHEN EXISTS (
          SELECT 1 FROM challenge_attempts a
          WHERE a.match_id = m.id AND a.completed_at IS NOT NULL
        ) THEN 'completed'
        WHEN EXISTS (SELECT 1 FROM challenge_attempts a WHERE a.match_id = m.id)
          THEN 'void'
        ELSE 'expired'
      END,
      completed_at = COALESCE(m.completed_at, NOW())
  WHERE m.expires_at <= NOW()
    AND m.status IN ('pending', 'accepted', 'in_progress');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

SELECT cron.schedule(
  'resolve-expired-challenges',
  '*/15 * * * *',
  $$SELECT resolve_expired_challenges()$$
);

-- ── LEADERBOARD ──────────────────────────────────────────────────────────────
-- Ranked on the last 7 days of real answering activity rather than on
-- `profiles.total_xp`, which no code path currently writes — a board of zeroes
-- reads as broken. SECURITY DEFINER because it aggregates `answer_events`
-- across users, which no student may read directly.
--
-- `p_scope`: 'friends' (accepted friendships plus the caller) or 'global'.

CREATE OR REPLACE FUNCTION challenge_leaderboard(p_scope TEXT DEFAULT 'friends', p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  user_id       UUID,
  username      TEXT,
  questions_7d  INTEGER,
  accuracy_pct  INTEGER,
  active_days   INTEGER,
  total_xp      INTEGER,
  is_self       BOOLEAN
) AS $$
DECLARE
  me UUID := auth.uid();
BEGIN
  IF me IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH cohort AS (
    SELECT me AS id
    UNION
    SELECT CASE WHEN f.requester_id = me THEN f.recipient_id ELSE f.requester_id END
    FROM friendships f
    WHERE f.status = 'accepted'
      AND (f.requester_id = me OR f.recipient_id = me)
      AND p_scope = 'friends'
    UNION
    SELECT p.id FROM profiles p WHERE p_scope = 'global'
  ),
  activity AS (
    SELECT
      e.user_id,
      COUNT(*)::INTEGER AS answered,
      COUNT(*) FILTER (WHERE e.is_correct)::INTEGER AS correct,
      COUNT(DISTINCT (e.answered_at AT TIME ZONE 'Asia/Kolkata')::date)::INTEGER AS days
    FROM answer_events e
    WHERE e.answered_at >= NOW() - INTERVAL '7 days'
      AND e.user_id IN (SELECT id FROM cohort)
    GROUP BY e.user_id
  )
  SELECT
    p.id,
    p.username,
    COALESCE(a.answered, 0),
    CASE WHEN COALESCE(a.answered, 0) > 0
      THEN ROUND(100.0 * a.correct / a.answered)::INTEGER
      ELSE 0 END,
    COALESCE(a.days, 0),
    COALESCE(p.total_xp, 0),
    p.id = me
  FROM profiles p
  JOIN cohort c ON c.id = p.id
  LEFT JOIN activity a ON a.user_id = p.id
  -- Everyone in the friends scope shows up even at zero; the global board is
  -- the top of an unbounded list, so an untouched account has no place on it.
  WHERE p_scope = 'friends' OR COALESCE(a.answered, 0) > 0 OR p.id = me
  ORDER BY COALESCE(a.answered, 0) DESC, COALESCE(a.correct, 0) DESC, p.username ASC
  LIMIT GREATEST(p_limit, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION challenge_leaderboard(TEXT, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION challenge_leaderboard(TEXT, INTEGER) TO authenticated;

-- ── QUESTION POOL FOR A CHALLENGE SET ────────────────────────────────────────
-- Picking N random published MCQs from a chapter needs `ORDER BY random()`,
-- which PostgREST cannot express. SECURITY INVOKER: the caller's own RLS on
-- `questions` (published only) still applies, so this exposes nothing new.

CREATE OR REPLACE FUNCTION challenge_question_pool(p_chapter_id UUID, p_count INTEGER)
RETURNS TABLE (
  id             UUID,
  difficulty     TEXT,
  irt_difficulty DOUBLE PRECISION
) AS $$
  SELECT q.id, q.difficulty, q.irt_difficulty
  FROM questions q
  WHERE q.chapter_id = p_chapter_id
    AND q.published = TRUE
    -- The attempt UI is a single-select answer sheet; the other six formats
    -- would need their own input affordances before they can be challenged on.
    AND q.format = 'mcq_single'
    AND q.options IS NOT NULL
  ORDER BY random()
  LIMIT GREATEST(COALESCE(p_count, 5), 1);
-- VOLATILE, not STABLE: the whole point is a different draw on every call, and
-- STABLE would licence the planner to assume otherwise.
$$ LANGUAGE sql VOLATILE;

GRANT EXECUTE ON FUNCTION challenge_question_pool(UUID, INTEGER) TO authenticated;

-- ── HEAD-TO-HEAD RECORD ──────────────────────────────────────────────────────
-- "You lead Rohan 4–2" on the Friend Profile screen. Wins are decided the same
-- way the results screen decides them: more correct, then less time, else a draw.

CREATE OR REPLACE FUNCTION challenge_head_to_head(p_friend_id UUID)
RETURNS TABLE (wins INTEGER, losses INTEGER, draws INTEGER) AS $$
DECLARE
  me UUID := auth.uid();
BEGIN
  IF me IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH decided AS (
    SELECT
      CASE
        WHEN mine.correct_count > theirs.correct_count THEN 'win'
        WHEN mine.correct_count < theirs.correct_count THEN 'loss'
        WHEN mine.total_time_ms < theirs.total_time_ms THEN 'win'
        WHEN mine.total_time_ms > theirs.total_time_ms THEN 'loss'
        ELSE 'draw'
      END AS outcome
    FROM challenge_matches m
    JOIN challenge_attempts mine
      ON mine.match_id = m.id AND mine.user_id = me AND mine.completed_at IS NOT NULL
    JOIN challenge_attempts theirs
      ON theirs.match_id = m.id AND theirs.user_id = p_friend_id AND theirs.completed_at IS NOT NULL
    WHERE m.status = 'completed'
      AND ((m.sender_id = me AND m.opponent_id = p_friend_id)
        OR (m.sender_id = p_friend_id AND m.opponent_id = me))
  )
  SELECT
    COUNT(*) FILTER (WHERE outcome = 'win')::INTEGER,
    COUNT(*) FILTER (WHERE outcome = 'loss')::INTEGER,
    COUNT(*) FILTER (WHERE outcome = 'draw')::INTEGER
  FROM decided;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION challenge_head_to_head(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION challenge_head_to_head(UUID) TO authenticated;
