import { useState, useEffect, useCallback } from 'react'

type PermissionState = NotificationPermission | 'unsupported'

export function usePushPermission() {
  const [permission, setPermission] = useState<PermissionState>('default')
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false)

  useEffect(() => {
    if (!('Notification' in window)) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission)
  }, [])

  /**
   * Trigger the push permission prompt UI.
   * Called on first notification-worthy action, NOT on page load.
   */
  const triggerPrompt = useCallback(() => {
    if (permission === 'default') {
      setShouldShowPrompt(true)
    }
  }, [permission])

  /**
   * Actually request browser permission and subscribe to push.
   */
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window) || Notification.permission !== 'default') {
      setShouldShowPrompt(false)
      return
    }

    const result = await Notification.requestPermission()
    setPermission(result)
    setShouldShowPrompt(false)

    if (result === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready
        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

        if (vapidKey) {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidKey,
          })

          // Store subscription -- in dev, use localStorage; in prod, send to Supabase
          if (import.meta.env.DEV) {
            localStorage.setItem(
              'hq-push-subscription',
              JSON.stringify(subscription.toJSON())
            )
          }
          // TODO: In production, POST subscription to Supabase push_subscriptions table
        }
      } catch (err) {
        console.error('[PWA] Failed to subscribe to push:', err)
      }
    }
  }, [])

  const dismissPrompt = useCallback(() => {
    setShouldShowPrompt(false)
  }, [])

  return {
    permission,
    shouldShowPrompt,
    triggerPrompt,
    requestPermission,
    dismissPrompt,
  }
}
