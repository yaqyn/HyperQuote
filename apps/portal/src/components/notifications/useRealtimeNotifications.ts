/**
 * Supabase Realtime hook for notifications.
 * Subscribes to postgres_changes on notifications table filtered by user_id.
 * Invalidates TanStack Query cache on new notifications.
 */
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

// Check if Supabase is configured (client-side)
function isSupabaseConfigured(): boolean {
  return !!(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_ANON_KEY !== 'placeholder'
  )
}

export function useRealtimeNotifications(userId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return
    if (!isSupabaseConfigured()) return

    let channel: ReturnType<
      Awaited<
        ReturnType<typeof import('@supabase/supabase-js')['createClient']>
      >['channel']
    >
    let supabaseClient: Awaited<
      ReturnType<typeof import('@supabase/supabase-js')['createClient']>
    >

    async function setup() {
      const { createClient } = await import('@supabase/supabase-js')
      supabaseClient = createClient(
        import.meta.env.VITE_SUPABASE_URL!,
        import.meta.env.VITE_SUPABASE_ANON_KEY!,
      )

      channel = supabaseClient
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
            queryClient.invalidateQueries({
              queryKey: ['notification-count'],
            })
          },
        )
        .subscribe()
    }

    setup()

    return () => {
      if (channel && supabaseClient) {
        supabaseClient.removeChannel(channel)
      }
    }
  }, [userId, queryClient])
}
