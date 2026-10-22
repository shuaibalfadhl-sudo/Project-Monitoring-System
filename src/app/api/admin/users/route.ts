import { NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/auth-utils';
import { createServiceClient } from '@/lib/supabase/admin';
import { ASSIGNABLE_ROLE_VALUES, UserRole } from '@/types/user';

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
  // Verify the caller is an authenticated super admin (server-side, not just a client redirect).
  const profile = await getUserProfile();
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  if (profile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden: super admin only.' }, { status: 403 });
  }

  let body: { action?: string; userId?: string; role?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { action, userId } = body;
  if (!action || !userId) {
    return NextResponse.json({ error: 'Missing action or userId.' }, { status: 400 });
  }

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Admin client unavailable.' }, { status: 500 });
  }

  if (action === 'role') {
    const role = body.role as UserRole | undefined;
    if (!role || !ASSIGNABLE_ROLE_VALUES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }

    const { error: profileErr } = await service
      .from('profiles')
      .update({ role })
      .eq('id', userId);
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    // Keep the auth JWT claims in sync so any policy/claim that reads app_metadata.role updates too.
    const { error: authErr } = await service.auth.admin.updateUserById(userId, {
      app_metadata: { role },
    });
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, role });
  }

  if (action === 'password') {
    const password = body.password ?? '';
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
        { status: 400 }
      );
    }

    const { error } = await service.auth.admin.updateUserById(userId, {
      password,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
