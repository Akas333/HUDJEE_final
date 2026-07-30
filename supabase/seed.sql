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
