import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { db } from '../lib/powersync'
import { SupabaseConnector } from '../lib/connector'

type PowerSyncState = {
  db: typeof db
  isReady: boolean
  error: string | null
}

const PowerSyncContext = createContext<PowerSyncState | null>(null)

export function PowerSyncProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    try {
      setError(null)
      const connector = new SupabaseConnector()
      await db.connect(connector)
      setIsReady(true)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to connect to database'

      // If not authenticated, allow offline-only mode with local data
      if (message === 'Not authenticated') {
        setIsReady(true)
        return
      }

      setError(message)
    }
  }, [])

  useEffect(() => {
    connect()

    return () => {
      db.disconnect()
    }
  }, [connect])

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100dvh',
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#ef4444', fontSize: '16px' }}>
          {error}
        </p>
        <button
          type="button"
          onClick={connect}
          style={{
            padding: '12px 24px',
            backgroundColor: '#2563EB',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            minHeight: '56px',
            minWidth: '120px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!isReady) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100dvh',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '3px solid #e5e7eb',
            borderTopColor: '#2563EB',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: '#6b7280', fontSize: '16px' }}>Syncing...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <PowerSyncContext value={{ db, isReady, error }}>
      {children}
    </PowerSyncContext>
  )
}

export function usePowerSync() {
  const ctx = useContext(PowerSyncContext)
  if (!ctx) {
    throw new Error('usePowerSync must be used within a PowerSyncProvider')
  }
  return ctx.db
}
