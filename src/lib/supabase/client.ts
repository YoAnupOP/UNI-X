import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'

let supabaseBrowserClient: SupabaseClient | null = null

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Return a placeholder client if Supabase is not configured
  if (!supabaseUrl || supabaseUrl === 'your_supabase_url_here' || !supabaseKey) {
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    )
  }

  // Singleton pattern to prevent creating multiple instances
  if (!supabaseBrowserClient) {
    supabaseBrowserClient = createBrowserClient(supabaseUrl, supabaseKey)
  }

  return supabaseBrowserClient
}
