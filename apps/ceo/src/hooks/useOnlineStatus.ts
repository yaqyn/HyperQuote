import { useEffect } from 'react'
import { useCEOStore } from '../stores/ceo'

/**
 * Listens to navigator.onLine and online/offline events.
 * Syncs status to the Zustand store.
 */
export function useOnlineStatus() {
  const isOnline = useCEOStore((s) => s.isOnline)
  const setOnline = useCEOStore((s) => s.setOnline)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    // Sync initial state
    setOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline])

  return { isOnline }
}
