-- Create question_reports table
CREATE TABLE question_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE question_reports ENABLE ROW LEVEL SECURITY;

-- Authors/Service Role can do everything
CREATE POLICY "Service role can do all" ON question_reports FOR ALL USING (true);

-- Authenticated users can insert their own reports (engine uses service key anyway, but good practice)
CREATE POLICY "Users can insert reports" ON question_reports FOR INSERT WITH CHECK (
  auth.uid() = user_id OR user_id IS NULL
);

-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON question_reports FOR SELECT USING (
  auth.uid() = user_id
);

-- Trigger for auto-suspending questions with >= 3 pending reports
CREATE OR REPLACE FUNCTION check_and_suspend_question()
RETURNS TRIGGER AS $$
DECLARE
  pending_count INTEGER;
BEGIN
  -- Count how many pending reports exist for this question
  SELECT COUNT(*) INTO pending_count
  FROM question_reports
  WHERE question_id = NEW.question_id AND status = 'pending';

  -- If 3 or more, unpublish the question
  IF pending_count >= 3 THEN
    UPDATE questions
    SET published = false
    WHERE id = NEW.question_id AND published = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_suspend_highly_reported_questions
AFTER INSERT OR UPDATE ON question_reports
FOR EACH ROW
EXECUTE FUNCTION check_and_suspend_question();
