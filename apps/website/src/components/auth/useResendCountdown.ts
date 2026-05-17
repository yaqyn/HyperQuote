import { useEffect, useState } from 'react'

export function useResendCountdown(initialValue: number) {
	const [resendCountdown, setResendCountdown] = useState(initialValue)

	useEffect(() => {
		if (resendCountdown <= 0) return
		const timer = setInterval(
			() => setResendCountdown((countdown) => Math.max(0, countdown - 1)),
			1000,
		)
		return () => clearInterval(timer)
	}, [resendCountdown])

	return { resendCountdown, setResendCountdown }
}
