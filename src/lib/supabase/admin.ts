import { createClient } from '@supabase/supabase-js';

// SERVER-ONLY: import this exclusively from route handlers / server components,
// never from a client component (it reads a secret key).

// Server-only client that uses the Supabase secret/service-role key so we can
// call the Admin API (change a user's password, sync their role into auth).
// This bypasses RLS on purpose — only ever used behind a verified super_admin check.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.');
  }
  if (!serviceKey) {
    throw new Error(
      'Missing SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY). Add it to .env.local to enable admin actions.'
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
