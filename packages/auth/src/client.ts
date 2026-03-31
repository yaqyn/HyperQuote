import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

/**
 * Create a Supabase client for browser-side use.
 * Singleton — safe because browser has one user per tab.
 */
export function createSupabaseBrowserClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
) {
  if (browserClient) return browserClient
  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return browserClient
}
