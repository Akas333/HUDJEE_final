import { NextResponse } from 'next/server';
import { admin, pickColumns, resolveAuthor, validateQuestionRow } from '@/lib/questionApi';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get('subject');
  const chapter_id = searchParams.get('chapter_id');
  const concept_id = searchParams.get('concept_id');
  const difficulty = searchParams.get('difficulty');
  const search = searchParams.get('search');
  const published = searchParams.get('published');

  let query = admin
    .from('questions')
    .select('*, chapters(name), topics(name)')
    .order('created_at', { ascending: false });

  if (subject) query = query.eq('subject', subject);
  if (chapter_id) query = query.eq('chapter_id', chapter_id);
  if (concept_id) query = query.eq('concept_id', concept_id);
  if (difficulty) query = query.eq('difficulty', difficulty);
  if (search) query = query.ilike('question_body', `%${search}%`);
  if (published !== null) query = query.eq('published', published === 'true');

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Pending creations live in `content_versions`, not `questions`, so without this
  // they would vanish from the list between submission and approval.
  let finalData = data || [];

  if (published !== 'true') {
    const { data: pendingVersions } = await admin
      .from('content_versions')
      .select('*')
      .eq('content_type', 'question')
      .eq('change_type', 'create')
      .eq('status', 'pending_review');

    if (pendingVersions && pendingVersions.length > 0) {
      const pendingQuestions = pendingVersions
        .map((v) => ({
          ...v.after_state,
          id: `pending-${v.id}`, // Temporary id the UI routes edits through.
          is_pending_review: true,
          published: false,
          created_at: v.submitted_at,
        }))
        // after_state is JSONB, so the filters have to be re-applied by hand.
        .filter((q) => {
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
  const author = await resolveAuthor(request);
  if (!author) {
    return NextResponse.json({ error: 'Sign in as CMS staff to save questions.' }, { status: 401 });
  }

  const body = await request.json();

  const problem = validateQuestionRow(body);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const row = pickColumns(body, author);

  // "Publish immediately" is the deliberate bypass of the review queue.
  if (row.published) {
    const { error, data } = await admin.from('questions').insert(row).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Otherwise it becomes a reviewable change. `created_by` rides along inside
  // after_state so the eventual insert still credits the author, not the reviewer.
  const { error, data } = await admin
    .from('content_versions')
    .insert({
      content_type: 'question',
      change_type: 'create',
      after_state: row,
      status: 'pending_review',
      created_by_name: author.name,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, is_pending_review: true });
}
