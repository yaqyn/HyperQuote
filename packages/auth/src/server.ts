import { createServerClient, parseCookieHeader } from '@supabase/ssr'

interface ServerClientOptions {
  request: Request
  supabaseUrl: string
  supabaseAnonKey: string
}

/**
 * Create a Supabase client for server-side use on Cloudflare Workers.
 * CRITICAL: Always call this INSIDE the request handler, never at module level.
 * Workers are long-lived isolates — module-level state leaks between requests.
 */
export function createSupabaseServerClient({
  request,
  supabaseUrl,
  supabaseAnonKey,
}: ServerClientOptions) {
  const responseCookies = new Map<string, string>()

  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const header = request.headers.get('cookie') ?? ''
        return parseCookieHeader(header)
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          responseCookies.set(name, value)
        }
      },
    },
  })

  return { client, responseCookies }
}
