create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  content_type text not null, -- 'question', 'chapter', 'topic', etc.
  content_id uuid, -- Reference to the original item if it's an update, null if it's a create
  change_type text not null, -- 'create', 'update', 'delete'
  before_state jsonb,
  after_state jsonb not null,
  status text not null default 'pending_review', -- 'pending_review', 'approved', 'rejected'
  created_by_name text,
  review_notes text,
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  reviewed_at timestamp with time zone
);

alter table public.content_versions enable row level security;

-- Policies for content_versions
create policy "Allow read access to authenticated users" 
on public.content_versions for select to authenticated using (true);

create policy "Allow insert access to authenticated users" 
on public.content_versions for insert to authenticated with check (true);

create policy "Allow update access to authenticated users" 
on public.content_versions for update to authenticated using (true);
