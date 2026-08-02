import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get('subject');
  const chapter_id = searchParams.get('chapter_id');
  const difficulty = searchParams.get('difficulty');
  const search = searchParams.get('search');

  let query = supabase.from('questions').select('*, chapters(name), topics(name)').order('created_at', { ascending: false });

  if (subject) query = query.eq('subject', subject);
  if (chapter_id) query = query.eq('chapter_id', chapter_id);
  if (difficulty) query = query.eq('difficulty', difficulty);
  if (search) query = query.ilike('question_body', `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { error, data } = await supabase.from('questions').insert(body).select().single();
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
