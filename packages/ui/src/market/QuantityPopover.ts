import { type RefObject, useEffect } from 'react'

export function useQuantityPopoverDismiss({
	anchorRef,
	onClose,
	popoverRef,
}: {
	anchorRef: RefObject<HTMLElement | null>
	onClose: () => void
	popoverRef: RefObject<HTMLElement | null>
}) {
	useEffect(() => {
		function handleClick(event: MouseEvent) {
			const target = event.target
			if (!(target instanceof Node)) return
			if (
				popoverRef.current &&
				!popoverRef.current.contains(target) &&
				anchorRef.current &&
				!anchorRef.current.contains(target)
			) {
				onClose()
			}
		}

		document.addEventListener('mousedown', handleClick)
		return () => document.removeEventListener('mousedown', handleClick)
	}, [anchorRef, onClose, popoverRef])
}
