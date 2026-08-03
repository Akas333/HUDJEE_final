-- Add role to profiles
ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'student' CHECK (role IN ('student', 'employee', 'admin', 'superadmin'));

-- Fix the auth trigger to handle NOT NULL username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, created_at)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Give some mock data if there is an admin (optional)
UPDATE public.profiles SET role = 'superadmin' WHERE username = 'admin';

-- Create a view for employee stats to make it easier to query from the CMS
CREATE OR REPLACE VIEW public.employee_stats AS
SELECT 
    p.id,
    p.username,
    p.role,
    p.created_at as joined_at,
    COUNT(q.id) as total_questions_added
FROM 
    public.profiles p
LEFT JOIN 
    public.questions q ON p.id = q.created_by
WHERE 
    p.role IN ('employee', 'admin', 'superadmin')
GROUP BY 
    p.id, p.username, p.role, p.created_at;

-- Grant permissions on the view
GRANT SELECT ON public.employee_stats TO authenticated;
GRANT SELECT ON public.employee_stats TO anon;
