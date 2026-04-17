import { useEffect, useState } from 'react'

/**
 * Returns true when the page is scrolled past the given threshold (in pixels).
 * Uses a passive scroll listener for performance.
 */
export function useScrolled(threshold = 8): boolean {
	const [scrolled, setScrolled] = useState(false)

	useEffect(() => {
		function onScroll() {
			setScrolled(window.scrollY > threshold)
		}
		// Check initial state
		onScroll()
		window.addEventListener('scroll', onScroll, { passive: true })
		return () => window.removeEventListener('scroll', onScroll)
	}, [threshold])

	return scrolled
}
