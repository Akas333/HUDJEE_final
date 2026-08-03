import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action, notes } = await request.json(); // action: 'approve' or 'reject'

  // Fetch the version
  const { data: version, error: fetchError } = await supabase
    .from('content_versions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !version) return NextResponse.json({ error: fetchError?.message || 'Not found' }, { status: 404 });

  if (action === 'approve') {
    // Apply changes based on content_type and change_type
    let applyError = null;

    if (version.content_type === 'question') {
      if (version.change_type === 'create') {
        const { error } = await supabase.from('questions').insert(version.after_state);
        applyError = error;
      } else if (version.change_type === 'update') {
        const { error } = await supabase.from('questions').update(version.after_state).eq('id', version.content_id);
        applyError = error;
      } else if (version.change_type === 'delete') {
        const { error } = await supabase.from('questions').delete().eq('id', version.content_id);
        applyError = error;
      }
    }

    if (applyError) {
      return NextResponse.json({ error: applyError.message }, { status: 500 });
    }

    // Mark version as approved
    const { error: updateError } = await supabase
      .from('content_versions')
      .update({ status: 'approved', reviewed_at: new Date().toISOString(), review_notes: notes })
      .eq('id', id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ success: true, status: 'approved' });
  } else if (action === 'reject') {
    // Mark version as rejected
    const { error: updateError } = await supabase
      .from('content_versions')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), review_notes: notes })
      .eq('id', id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ success: true, status: 'rejected' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
