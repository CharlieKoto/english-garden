import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase credentials. Copy .env.example to .env, fill in VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_ANON_KEY from your Supabase project (Settings → API), then restart the dev server.'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const WORD_IMAGES_BUCKET = 'word-images';

/**
 * Accounts are username-only, so each username maps to a stable fake email
 * that Supabase Auth can use as the login identifier.
 */
export function syntheticEmail(username: string): string {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return `${clean}@users.englishgarden.local`;
}
