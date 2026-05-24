import { createClient } from '@supabase/supabase-js';

// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are the Vite-exposed versions
// of Vercel's native SUPABASE_URL / SUPABASE_ANON_KEY env vars.
// Set them in .env.local for local dev and in Vercel Project Settings for production.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);
