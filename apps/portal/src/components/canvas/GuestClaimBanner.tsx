import { useMutation, useQueryClient } from '@tanstack/react-query'
import { animate } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { claimCustomerAccount } from '../../lib/server/guest-claiming'
import { toast } from '../../lib/toast'

const DISMISSED_KEY = 'hq-guest-claim-dismissed'

interface GuestClaimBannerProps {
	maskedHint: string
	unclaimedCustomerId: string
}

export function GuestClaimBanner({
	maskedHint,
	unclaimedCustomerId,
}: GuestClaimBannerProps) {
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
		const el: Element | null = bannerRef.current
		if (visible && el) {
			animate(
				el,
				{ transform: ['translateY(-100%)', 'translateY(0)'], opacity: [0, 1] },
				{ duration: 0.2, ease: 'easeOut' },
			)
		}
	}, [visible])

	const claimMutation = useMutation({
		mutationFn: () =>
			claimCustomerAccount({ data: { customerId: unclaimedCustomerId } }),
		onSuccess: (result) => {
			if (result.success) {
				// Invalidate all order queries to show claimed order history
				queryClient.invalidateQueries({ queryKey: ['orders'] })
				queryClient.invalidateQueries({ queryKey: ['quotes'] })
				toast.success(t('guestClaim.successToast'))
			}
			dismissBanner()
		},
	})

	const dismissBanner = useCallback(() => {
		const el: Element | null = bannerRef.current
		if (el) {
			animate(
				el,
				{ transform: 'translateY(-100%)', opacity: 0 },
				{ duration: 0.2, ease: 'easeIn' },
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
			className="w-full py-4 border-b border-[var(--color-text)]/8"
		>
			<p className="text-sm text-[var(--color-text-muted)] mb-3">
				{t('guestClaim.banner', { maskedHint })}
			</p>
			<div className="flex gap-3">
				<Button
					onPress={() => claimMutation.mutate()}
					isDisabled={claimMutation.isPending}
					className="h-8 px-4 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-contrast)] text-sm font-medium pressed:opacity-80 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
				>
					{t('guestClaim.yesClaim')}
				</Button>
				<Button
					onPress={dismissBanner}
					className="h-8 px-4 rounded-full text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] pressed:opacity-80 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
				>
					{t('guestClaim.noNewAccount')}
				</Button>
			</div>
		</div>
	)
}
