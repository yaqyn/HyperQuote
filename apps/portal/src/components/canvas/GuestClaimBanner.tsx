import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { animate } from 'motion'
import { useRef, useState, useEffect, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { claimCustomerAccount } from '../../lib/server/guest-claiming'

const DISMISSED_KEY = 'hq-guest-claim-dismissed'

interface GuestClaimBannerProps {
  maskedHint: string
  unclaimedCustomerId: string
}

export function GuestClaimBanner({ maskedHint, unclaimedCustomerId }: GuestClaimBannerProps) {
  const { t } = useTranslation('portal')
  const bannerRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const [visible, setVisible] = useState(true)

  // Check if already dismissed this session
  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) {
      setVisible(false)
    }
  }, [])

  // Slide-in animation on mount
  useEffect(() => {
    if (visible && bannerRef.current) {
      animate(
        bannerRef.current,
        { transform: ['translateY(-100%)', 'translateY(0)'], opacity: [0, 1] },
        { duration: 0.2, easing: 'ease-out' }
      )
    }
  }, [visible])

  const claimMutation = useMutation({
    mutationFn: () => claimCustomerAccount({ data: { customerId: unclaimedCustomerId } }),
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate all order queries to show claimed order history
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        queryClient.invalidateQueries({ queryKey: ['quotes'] })
        // Toast handled by the imperative toast store
        const { useToastStore } = require('../../stores/portal')
        useToastStore.getState().success(t('guestClaim.successToast'))
      }
      dismissBanner()
    },
  })

  const dismissBanner = useCallback(() => {
    if (bannerRef.current) {
      animate(
        bannerRef.current,
        { transform: 'translateY(-100%)', opacity: 0 },
        { duration: 0.2, easing: 'ease-in' }
      ).then(() => {
        localStorage.setItem(DISMISSED_KEY, '1')
        setVisible(false)
      })
    } else {
      localStorage.setItem(DISMISSED_KEY, '1')
      setVisible(false)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      ref={bannerRef}
      className="w-full rounded-xl p-4 backdrop-blur-xl bg-white/80 dark:bg-black/80 border border-black/10 dark:border-white/10 mb-4"
    >
      <p className="text-sm text-black/80 dark:text-white/80 mb-3">
        {t('guestClaim.banner', { maskedHint })}
      </p>
      <div className="flex gap-3">
        <Button
          onPress={() => claimMutation.mutate()}
          isDisabled={claimMutation.isPending}
          className="h-9 px-4 rounded-lg bg-[var(--color-blue)] text-white text-sm font-medium pressed:opacity-80 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue)]"
        >
          {t('guestClaim.yesClaim')}
        </Button>
        <Button
          onPress={dismissBanner}
          className="h-9 px-4 rounded-lg border border-black/20 dark:border-white/20 text-sm font-medium text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 pressed:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue)]"
        >
          {t('guestClaim.noNewAccount')}
        </Button>
      </div>
    </div>
  )
}
