import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // Query profiles where role is student or null (legacy student)
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, cohort, target_year, level, total_xp, current_streak, longest_streak, created_at, role')
    .or('role.eq.student,role.is.null')
    .order('total_xp', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
