-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── PROFILES ──────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT UNIQUE NOT NULL,
  cohort          TEXT CHECK (cohort IN ('class_11', 'class_12', 'dropper')),
  target_year     INTEGER,
  coaching_name   TEXT,
  daily_target_min INTEGER DEFAULT 30,
  strength_physics TEXT CHECK (strength_physics IN ('strong', 'average', 'weak')),
  strength_chemistry TEXT CHECK (strength_chemistry IN ('strong', 'average', 'weak')),
  strength_maths  TEXT CHECK (strength_maths IN ('strong', 'average', 'weak')),
  active_badge_id UUID, -- References badges(id) added later
  level           INTEGER DEFAULT 1,
  total_xp        INTEGER DEFAULT 0,
  current_streak  INTEGER DEFAULT 0,
  longest_streak  INTEGER DEFAULT 0,
  streak_shields  INTEGER DEFAULT 0 CHECK (streak_shields <= 3),
  last_session_at TIMESTAMPTZ,
  streak_broken_at TIMESTAMPTZ,       -- for yellow profile logic
  onboarding_done BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, created_at)
  VALUES (NEW.id, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Users can only read/write their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile only" ON profiles
  FOR ALL USING (auth.uid() = id);

-- ── QUESTIONS ────────────────────────────────────────────────────────
CREATE TABLE questions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  format            TEXT NOT NULL CHECK (format IN (
                      'mcq_single', 'mcq_multi', 'integer',
                      'numerical', 'assertion_reason', 'passage', 'matrix'
                    )),
  subject           TEXT NOT NULL CHECK (subject IN ('physics', 'chemistry', 'maths')),
  chapter           TEXT NOT NULL,
  topic             TEXT NOT NULL,
  difficulty        TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  source_type       TEXT NOT NULL CHECK (source_type IN ('pyq', 'non_pyq')),
  pyq_year          INTEGER,
  pyq_paper         TEXT CHECK (pyq_paper IN ('jee_main', 'jee_advanced')),
  pyq_shift         TEXT,
  question_body     TEXT NOT NULL,          -- LaTeX string
  options           JSONB,                  -- [{id, text, is_correct}]
  correct_answer    TEXT NOT NULL,
  solution          TEXT NOT NULL,          -- LaTeX string
  solution_video_url TEXT,
  irt_difficulty    FLOAT,
  irt_discrimination FLOAT,
  irt_guessing      FLOAT,
  published         BOOLEAN DEFAULT FALSE,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_subject ON questions(subject);
CREATE INDEX idx_questions_chapter ON questions(chapter);
CREATE INDEX idx_questions_topic ON questions(topic);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_source ON questions(source_type);
CREATE INDEX idx_questions_pyq_year ON questions(pyq_year);
CREATE INDEX idx_questions_published ON questions(published);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read published questions" ON questions
  FOR SELECT USING (published = true);

-- ── SESSIONS ─────────────────────────────────────────────────────────
CREATE TABLE sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  config          JSONB NOT NULL,             -- full session setup config snapshot
  status          TEXT CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  target_type     TEXT CHECK (target_type IN ('question_count', 'time')),
  target_value    INTEGER,                    -- count or minutes
  questions_answered INTEGER DEFAULT 0,
  correct_count   INTEGER DEFAULT 0,
  total_xp_earned INTEGER DEFAULT 0,
  duration_seconds INTEGER,                   -- actual time spent
  completion_tag  TEXT CHECK (completion_tag IN ('on_target', 'incomplete', 'overachiever')),
  adaptive_mode   BOOLEAN DEFAULT FALSE,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  ended_at        TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_started ON sessions(started_at);

-- ── ANSWER EVENTS ────────────────────────────────────────────────────
CREATE TABLE answer_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id),
  is_correct      BOOLEAN NOT NULL,
  time_taken_ms   INTEGER NOT NULL,
  xp_earned       INTEGER DEFAULT 0,
  answered_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_answer_events_user ON answer_events(user_id);
CREATE INDEX idx_answer_events_session ON answer_events(session_id);
CREATE INDEX idx_answer_events_answered ON answer_events(answered_at);

-- ── XP LEDGER ────────────────────────────────────────────────────────
CREATE TABLE xp_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount          INTEGER NOT NULL,
  reason          TEXT NOT NULL,            -- 'correct_easy', 'streak_bonus', 'challenge_win' etc.
  reference_id    UUID,                     -- session_id or challenge_id
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_xp_events_user ON xp_events(user_id);
CREATE INDEX idx_xp_events_created ON xp_events(created_at);

-- ── CPS SCORES ───────────────────────────────────────────────────────
CREATE TABLE cps_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score           INTEGER NOT NULL CHECK (score BETWEEN 0 AND 1000),
  air_rank        INTEGER,
  cohort_rank     INTEGER,
  air_delta       INTEGER,                  -- +/- vs previous day
  factor_accuracy FLOAT,
  factor_speed    FLOAT,
  factor_volume   FLOAT,
  factor_difficulty FLOAT,
  factor_consistency FLOAT,
  factor_focus    FLOAT,
  factor_target   FLOAT,
  computed_at     TIMESTAMPTZ DEFAULT NOW(),
  valid_for_date  DATE NOT NULL             -- the date this score is for
);

CREATE UNIQUE INDEX idx_cps_user_date ON cps_scores(user_id, valid_for_date);
CREATE INDEX idx_cps_score ON cps_scores(score DESC);
CREATE INDEX idx_cps_air ON cps_scores(air_rank);

-- ── FRIENDSHIPS ──────────────────────────────────────────────────────
CREATE TABLE friendships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status          TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id),
  CHECK (requester_id != recipient_id)
);

CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_recipient ON friendships(recipient_id);

-- ── BADGES ───────────────────────────────────────────────────────────
CREATE TABLE badges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,     -- e.g. 'streak_7_day', 'physics_mechanics_master'
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL,            -- 'streak', 'accuracy', 'volume', 'subject', 'social', 'rank', 'consistency'
  subject         TEXT,                     -- NULL if not subject-specific
  colour          TEXT,                     -- hex colour for badge display
  icon_url        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint to profiles now that badges table exists
ALTER TABLE profiles ADD CONSTRAINT fk_active_badge FOREIGN KEY (active_badge_id) REFERENCES badges(id);

CREATE TABLE user_badges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id        UUID NOT NULL REFERENCES badges(id),
  earned_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);

-- ── CHALLENGES ───────────────────────────────────────────────────────
CREATE TABLE challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'solved_correct', 'solved_wrong', 'expired')),
  recipient_answer TEXT,
  reply_message   TEXT,
  sender_reaction TEXT,                     -- emoji reaction from sender
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  solved_at       TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX idx_challenges_recipient ON challenges(recipient_id);
CREATE INDEX idx_challenges_sender ON challenges(sender_id);
CREATE INDEX idx_challenges_status ON challenges(status);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Challenge access" ON challenges
  FOR ALL USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

-- ── APP OPEN EVENTS (for dynamic notification timing) ─────────────────
CREATE TABLE app_open_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opened_at       TIMESTAMPTZ DEFAULT NOW(),
  hour_of_day     INTEGER GENERATED ALWAYS AS (EXTRACT(HOUR FROM opened_at)::INTEGER) STORED
);

CREATE INDEX idx_app_open_user ON app_open_events(user_id);
CREATE INDEX idx_app_open_hour ON app_open_events(user_id, hour_of_day);

-- ── NOTIFICATION SCHEDULE ────────────────────────────────────────────
CREATE TABLE notification_schedule (
  user_id         UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  fcm_token       TEXT,
  scheduled_hour  INTEGER,                  -- computed median open hour
  scheduled_minute INTEGER DEFAULT 0,
  manual_override BOOLEAN DEFAULT FALSE,
  manual_hour     INTEGER,
  manual_minute   INTEGER,
  last_sent_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── PG_CRON SCHEDULED JOBS ───────────────────────────────────────────

-- 1. CPS computation — 4:45 AM IST = 11:15 PM UTC
SELECT cron.schedule(
  'cps-daily-job',
  '15 23 * * *',
  $$SELECT net.http_post(
    url := 'https://hudjee-engine.railway.app/internal/compute-cps',
    headers := '{"Authorization": "Bearer YOUR_INTERNAL_SECRET"}'::jsonb,
    body := '{}'::jsonb
  )$$
);

-- 2. Notification scheduling — 3:00 AM IST = 9:30 PM UTC
SELECT cron.schedule(
  'notification-schedule-job',
  '30 21 * * *',
  $$SELECT net.http_post(
    url := 'https://hudjee-edge.workers.dev/internal/schedule-notifications',
    headers := '{"Authorization": "Bearer YOUR_INTERNAL_SECRET"}'::jsonb,
    body := '{}'::jsonb
  )$$
);

-- 3. Expire old challenges — midnight IST = 6:30 PM UTC
SELECT cron.schedule(
  'expire-challenges',
  '30 18 * * *',
  $$UPDATE challenges SET status = 'expired'
    WHERE status = 'pending' AND expires_at < NOW()$$
);

-- 4. Purge app_open_events older than 30 days — 2:00 AM IST
SELECT cron.schedule(
  'purge-app-open-events',
  '30 20 * * *',
  $$DELETE FROM app_open_events WHERE opened_at < NOW() - INTERVAL '30 days'$$
);


-- ── CHAPTERS ──────────────────────────────────────────────────────────
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL CHECK (subject IN ('physics', 'chemistry', 'maths')),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chapters_subject ON chapters(subject);

-- ── TOPICS (CONCEPTS) ───────────────────────────────────────────────
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_topics_chapter ON topics(chapter_id);

-- ── UPDATE QUESTIONS ────────────────────────────────────────────────
ALTER TABLE questions ADD COLUMN chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE;
ALTER TABLE questions ADD COLUMN concept_id UUID REFERENCES topics(id) ON DELETE CASCADE;

-- Drop old text columns
ALTER TABLE questions DROP COLUMN chapter;
ALTER TABLE questions DROP COLUMN topic;

-- Add indexes for new foreign keys
CREATE INDEX idx_questions_chapter_id ON questions(chapter_id);
CREATE INDEX idx_questions_concept_id ON questions(concept_id);


-- ── SEED DATA ────────────────────────────────────────────────────────
DELETE FROM questions;
DELETE FROM topics;
DELETE FROM chapters;

-- Insert Chapters
INSERT INTO chapters (id, subject, name, sort_order, total_questions) VALUES
('c1000000-0000-0000-0000-000000000001', 'physics', 'Newton''s Laws of Motion', 1, 10),
('c1000000-0000-0000-0000-000000000002', 'physics', 'Work, Power & Energy', 2, 0),
('c1000000-0000-0000-0000-000000000003', 'physics', 'Rotational Dynamics', 3, 5),
('c1000000-0000-0000-0000-000000000004', 'chemistry', 'Chemical Bonding', 1, 12);

-- Insert Topics (Concepts)
INSERT INTO topics (id, chapter_id, name, sort_order, total_questions) VALUES
('t1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Motion in 1D', 1, 5),
('t1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Motion in 2D & 3D', 2, 5),
('t1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'Moment of Inertia', 1, 5);

-- Insert Questions
INSERT INTO questions (id, format, subject, chapter_id, concept_id, difficulty, source_type, question_body, options, correct_answer, solution, published) VALUES
('q1000000-0000-0000-0000-000000000001', 'mcq_single', 'physics', 'c1000000-0000-0000-0000-000000000003', 't1000000-0000-0000-0000-000000000003', 'medium', 'non_pyq', 'A ballet dancer spins with her arms outstretched. When she pulls her arms in, her angular velocity increases because:', '[{"id": "0", "text": "Her moment of inertia decreases"}, {"id": "1", "text": "Her angular momentum increases"}, {"id": "2", "text": "Her moment of inertia increases"}, {"id": "3", "text": "Torque is applied by her arms"}]'::jsonb, '0', 'By the law of conservation of angular momentum (L = Iω), if no external torque acts on the system, L remains constant. Pulling arms in decreases the moment of inertia (I), so angular velocity (ω) must increase to keep L constant.', true),
('q1000000-0000-0000-0000-000000000002', 'mcq_single', 'physics', 'c1000000-0000-0000-0000-000000000003', 't1000000-0000-0000-0000-000000000003', 'hard', 'non_pyq', 'A solid disk of mass $M$ and radius $R$ is spinning with angular velocity $\omega$. A piece of clay of mass $m$ is dropped on the edge. What is the new angular velocity?', '[{"id": "0", "text": "$\omega \\frac{M}{M + 2m}$"}, {"id": "1", "text": "$\omega \\frac{M}{M + m}$"}, {"id": "2", "text": "$\omega \\frac{M + 2m}{M}$"}, {"id": "3", "text": "$\omega$"}]'::jsonb, '0', 'Initial L = I_disk * ω = (1/2 M R^2) * ω. Final I = I_disk + I_clay = (1/2 M R^2) + (m R^2). Final L = Final I * ω_new. Equating them gives ω_new = ω * (M / (M + 2m)).', true);
