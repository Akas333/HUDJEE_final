-- Enable pg_cron if not already enabled (might require superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Create user_concept_state table
CREATE TABLE user_concept_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  theta FLOAT NOT NULL DEFAULT 0.0,
  current_bucket TEXT NOT NULL DEFAULT 'medium',
  streak_correct INTEGER NOT NULL DEFAULT 0,
  streak_incorrect INTEGER NOT NULL DEFAULT 0,
  last_promotion_at TIMESTAMPTZ,
  last_demotion_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, concept_id)
);

-- RLS for user_concept_state
ALTER TABLE user_concept_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own concept state" ON user_concept_state FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can update concept state" ON user_concept_state FOR ALL USING (true);

-- 2. Modify questions table
ALTER TABLE questions 
  ADD COLUMN IF NOT EXISTS author_difficulty_bucket TEXT,
  ADD COLUMN IF NOT EXISTS author_prior_b NUMERIC,
  ADD COLUMN IF NOT EXISTS live_b NUMERIC,
  ADD COLUMN IF NOT EXISTS response_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calibration_confidence TEXT DEFAULT 'provisional',
  ADD COLUMN IF NOT EXISTS last_calibrated_at TIMESTAMPTZ;

-- Migrate existing questions
UPDATE questions 
SET 
  author_difficulty_bucket = 'medium',
  author_prior_b = COALESCE(irt_difficulty, -0.5),
  live_b = COALESCE(irt_difficulty, -0.5),
  response_count = 0,
  calibration_confidence = 'provisional'
WHERE author_difficulty_bucket IS NULL;

-- 3. Modify answer_events table
ALTER TABLE answer_events
  ADD COLUMN IF NOT EXISTS theta_at_time NUMERIC,
  ADD COLUMN IF NOT EXISTS live_b_at_time NUMERIC;

-- 4. Setup nightly cron job for calibration
-- Ensure we can reach the engine from the DB. 
-- For production, replace 'http://engine:8000' with actual engine internal URL.
SELECT cron.schedule(
  'nightly-recalibrate-items',
  '0 2 * * *', -- Every day at 2:00 AM
  $$
  SELECT net.http_post(
      url:='http://engine:8000/internal/recalibrate-items',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer internal_cron_secret"}'::jsonb
  )
  $$
);
