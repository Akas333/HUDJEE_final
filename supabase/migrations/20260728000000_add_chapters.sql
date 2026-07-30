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
