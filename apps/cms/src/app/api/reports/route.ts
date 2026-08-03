import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pending';

  const { data, error } = await supabase
    .from('question_reports')
    .select(`
      id,
      reason,
      details,
      status,
      created_at,
      question_id,
      user_id,
      questions (
        id,
        content,
        published
      )
    `)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
