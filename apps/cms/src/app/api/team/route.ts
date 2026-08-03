import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // Query the employee_stats view
  const { data, error } = await supabase
    .from('employee_stats')
    .select('*')
    .order('total_questions_added', { ascending: false });

  if (error) {
    console.error('Error fetching employee stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, username, role } = body;

  if (!email || !password || !username || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // 1. Create the user in Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username: username
    }
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  // 2. Update their profile with the assigned role
  // The trigger handles inserting the row, we just need to update the role
  const userId = authData.user.id;
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role, username }) // Ensure username is updated in case trigger missed it
    .eq('id', userId);

  if (profileError) {
    // Note: User is created in auth but profile update failed
    return NextResponse.json({ error: `User created but failed to assign role: ${profileError.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true, user: authData.user });
}
