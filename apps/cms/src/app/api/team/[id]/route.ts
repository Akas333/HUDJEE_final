import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  // Delete user from auth (this will cascade delete the profile if foreign keys are set up correctly, 
  // but just in case, we will delete profile first, or let cascading handle it)
  
  // Actually, auth.users -> profiles has ON DELETE CASCADE in the schema.
  // We just need to delete from auth.users.
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
