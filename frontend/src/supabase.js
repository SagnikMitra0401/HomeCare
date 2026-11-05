import { createClient } from '@supabase/supabase-js';
// Only the public URL and anon/publishable key are used in the browser.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'
);
