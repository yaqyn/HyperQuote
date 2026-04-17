/**
 * ClientOnly — Renders children only on the client (after hydration).
 * Replaces the removed @tanstack/react-start ClientOnly.
 */
import { type ReactNode, useEffect, useState } from 'react'

interface ClientOnlyProps {
	children: ReactNode
	fallback?: ReactNode
}

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
	const [mounted, setMounted] = useState(false)
	useEffect(() => {
		setMounted(true)
	}, [])
	return mounted ? children : fallback
}
