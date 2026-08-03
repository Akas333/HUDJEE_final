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
  const concept_id = searchParams.get('concept_id');
  const difficulty = searchParams.get('difficulty');
  const search = searchParams.get('search');
  const published = searchParams.get('published');

  let query = supabase.from('questions').select('*, chapters(name), topics(name)').order('created_at', { ascending: false });

  if (subject) query = query.eq('subject', subject);
  if (chapter_id) query = query.eq('chapter_id', chapter_id);
  if (concept_id) query = query.eq('concept_id', concept_id);
  if (difficulty) query = query.eq('difficulty', difficulty);
  if (search) query = query.ilike('question_body', `%${search}%`);
  if (published !== null) query = query.eq('published', published === 'true');

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  // Also fetch pending creations from content_versions so they show up in the list as drafts
  let finalData = data || [];
  
  if (published !== 'true') {
    const { data: pendingVersions } = await supabase
      .from('content_versions')
      .select('*')
      .eq('content_type', 'question')
      .eq('change_type', 'create')
      .eq('status', 'pending_review');
      
    if (pendingVersions && pendingVersions.length > 0) {
      // Filter pending versions manually to match the query params (since after_state is JSONB)
      const pendingQuestions = pendingVersions
        .map(v => ({
          ...v.after_state,
          id: `pending-${v.id}`, // Temporary ID for the UI
          is_pending_review: true,
          published: false,
          created_at: v.submitted_at
        }))
        .filter(q => {
          if (subject && q.subject !== subject) return false;
          if (chapter_id && q.chapter_id !== chapter_id) return false;
          if (concept_id && q.concept_id !== concept_id) return false;
          if (difficulty && q.difficulty !== difficulty) return false;
          if (search && !q.question_body?.toLowerCase().includes(search.toLowerCase())) return false;
          return true;
        });
        
      finalData = [...pendingQuestions, ...finalData];
    }
  }

  return NextResponse.json(finalData);
}

export async function POST(request: Request) {
  const body = await request.json();
  
  // If the user selected 'Publish immediately', bypass the review queue and insert directly
  if (body.published) {
    const { error, data } = await supabase.from('questions').insert(body).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
  
  // Otherwise, format as a content version for the Review Queue
  const contentVersion = {
    content_type: 'question',
    change_type: 'create',
    after_state: body,
    status: 'pending_review',
    created_by_name: 'Admin', // In a real app, this would come from auth session
  };

  const { error, data } = await supabase.from('content_versions').insert(contentVersion).select().single();
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  // Return the data wrapped so frontend knows it's pending review
  return NextResponse.json({ ...data, is_pending_review: true });
}
