import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  if (id.startsWith('pending-')) {
    const realId = id.replace('pending-', '');
    const { data, error } = await supabase.from('content_versions').select('*').eq('id', realId).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ...data.after_state, id });
  }

  const { error, data } = await supabase.from('questions').select('*').eq('id', id).single();
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  
  if (id.startsWith('pending-')) {
    const realId = id.replace('pending-', '');
    
    if (body.published) {
      // If they decided to publish immediately, delete the pending version and insert to live
      await supabase.from('content_versions').delete().eq('id', realId);
      const { error, data } = await supabase.from('questions').insert(body).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    } else {
      // Just update the draft
      const { error, data } = await supabase.from('content_versions').update({ after_state: body }).eq('id', realId).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ...data.after_state, id });
    }
  }
  
  // Fetch existing state
  const { data: before_state, error: fetchError } = await supabase.from('questions').select('*').eq('id', id).single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  // If the user checked "Publish immediately", bypass the queue
  if (body.published) {
    const { error, data } = await supabase.from('questions').update(body).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const contentVersion = {
    content_type: 'question',
    content_id: id,
    change_type: 'update',
    before_state,
    after_state: body,
    status: 'pending_review',
    created_by_name: 'Admin',
  };

  const { error, data } = await supabase.from('content_versions').insert(contentVersion).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  return NextResponse.json({ ...data, is_pending_review: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  if (id.startsWith('pending-')) {
    const realId = id.replace('pending-', '');
    const { error } = await supabase.from('content_versions').delete().eq('id', realId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }
  
  // Fetch existing state
  const { data: before_state, error: fetchError } = await supabase.from('questions').select('*').eq('id', id).single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const contentVersion = {
    content_type: 'question',
    content_id: id,
    change_type: 'delete',
    before_state,
    after_state: {},
    status: 'pending_review',
    created_by_name: 'Admin',
  };

  const { error } = await supabase.from('content_versions').insert(contentVersion).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  return NextResponse.json({ success: true, is_pending_review: true });
}
