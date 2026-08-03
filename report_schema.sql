-- Question Reports Table Migration
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS question_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE question_reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone (or authenticated users) to insert reports
CREATE POLICY "Users can insert reports" 
    ON question_reports 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Only admins can view reports (assuming your profiles table has a 'role' column)
-- If you don't have roles yet, you can modify this policy
CREATE POLICY "Admins can view reports" 
    ON question_reports 
    FOR SELECT 
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allow anonymous sessions and answer events
ALTER TABLE sessions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE answer_events ALTER COLUMN user_id DROP NOT NULL;
