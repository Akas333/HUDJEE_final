import { NextRequest, NextResponse } from 'next/server';
import { admin, pickColumns, resolveAuthor, validateQuestionRow } from '@/lib/questionApi';

/** The list gives pending drafts a `pending-<version id>` id so they stay editable. */
function pendingVersionId(id: string): string | null {
  return id.startsWith('pending-') ? id.slice('pending-'.length) : null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const versionId = pendingVersionId(id);
  if (versionId) {
    const { data, error } = await admin
      .from('content_versions')
      .select('*')
      .eq('id', versionId)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ...data.after_state, id });
  }

  const { error, data } = await admin.from('questions').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const author = await resolveAuthor(request);
  if (!author) {
    return NextResponse.json({ error: 'Sign in as CMS staff to save questions.' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const problem = validateQuestionRow(body);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const row = pickColumns(body, author);
  const versionId = pendingVersionId(id);

  // Editing something that has not been approved yet — it is still just a draft.
  if (versionId) {
    if (row.published) {
      // Publishing it outright retires the pending version and writes the real row.
      await admin.from('content_versions').delete().eq('id', versionId);
      const { error, data } = await admin.from('questions').insert(row).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    const { error, data } = await admin
      .from('content_versions')
      .update({ after_state: row, created_by_name: author.name })
      .eq('id', versionId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ...data.after_state, id, is_pending_review: true });
  }

  const { data: before_state, error: fetchError } = await admin
    .from('questions')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  if (row.published) {
    // An update must not reassign authorship to whoever edited it last.
    const { created_by, ...updates } = row;
    const { error, data } = await admin
      .from('questions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { created_by, ...afterState } = row;
  const { error, data } = await admin
    .from('content_versions')
    .insert({
      content_type: 'question',
      content_id: id,
      change_type: 'update',
      before_state,
      after_state: afterState,
      status: 'pending_review',
      created_by_name: author.name,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, is_pending_review: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const author = await resolveAuthor(request);
  if (!author) {
    return NextResponse.json({ error: 'Sign in as CMS staff to delete questions.' }, { status: 401 });
  }

  const { id } = await params;

  // A draft that was never approved can just go; nothing downstream has seen it.
  const versionId = pendingVersionId(id);
  if (versionId) {
    const { error } = await admin.from('content_versions').delete().eq('id', versionId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { data: before_state, error: fetchError } = await admin
    .from('questions')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  // Deleting a live question is itself a reviewable change, not an immediate drop.
  const { error } = await admin.from('content_versions').insert({
    content_type: 'question',
    content_id: id,
    change_type: 'delete',
    before_state,
    after_state: {},
    status: 'pending_review',
    created_by_name: author.name,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, is_pending_review: true });
}
