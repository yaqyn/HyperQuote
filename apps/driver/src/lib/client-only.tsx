/**
 * Mounts children only after first paint — required for MapLibre and any
 * other browser-only API. Vite SPA so SSR isn't a concern, but Capacitor
 * still benefits from a guard against React 19 hydration races.
 */

import { type ReactNode, useEffect, useState } from 'react'

interface ClientOnlyProps {
	children: ReactNode
	fallback?: ReactNode
}

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])
	if (!mounted) return fallback
	return children
}
