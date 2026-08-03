-- Drop the old constraint
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_created_by_fkey;

-- Re-add with ON DELETE SET NULL to preserve questions when users are removed
ALTER TABLE public.questions ADD CONSTRAINT questions_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
