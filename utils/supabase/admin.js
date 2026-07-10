import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase admin client using the service role key.
 * This bypasses Row Level Security (RLS) and should only be used
 * in server-side code for operations that need unrestricted access.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
