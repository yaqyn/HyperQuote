import { useCallback, useEffect, useState } from 'react'
import { checkWebsiteAccount } from '../lib/auth'

export interface WebsiteAccountState {
	authenticated: boolean
	companyName: string | null
}

const SIGNED_OUT_ACCOUNT: WebsiteAccountState = {
	authenticated: false,
	companyName: null,
}

export function useWebsiteAccountState() {
	const [accountState, setAccountState] =
		useState<WebsiteAccountState>(SIGNED_OUT_ACCOUNT)

	const refreshAccountState = useCallback(async () => {
		try {
			const result = await checkWebsiteAccount()
			setAccountState({
				authenticated: result.authenticated,
				companyName: result.companyName ?? null,
			})
		} catch {
			setAccountState(SIGNED_OUT_ACCOUNT)
		}
	}, [])

	useEffect(() => {
		let active = true

		function refreshIfActive() {
			refreshAccountState().catch(() => {
				if (active) setAccountState(SIGNED_OUT_ACCOUNT)
			})
		}

		refreshIfActive()
		window.addEventListener('focus', refreshIfActive)
		window.addEventListener('hyperquote-account-updated', refreshIfActive)
		return () => {
			active = false
			window.removeEventListener('focus', refreshIfActive)
			window.removeEventListener('hyperquote-account-updated', refreshIfActive)
		}
	}, [refreshAccountState])

	return { accountState, refreshAccountState }
}
