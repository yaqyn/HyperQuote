import { useEffect, useRef } from 'react'

interface InfiniteScrollSentinelProps {
	onIntersect: () => void
	isLoading: boolean
	hasNextPage: boolean
}

export function InfiniteScrollSentinel({
	onIntersect,
	isLoading,
	hasNextPage,
}: InfiniteScrollSentinelProps) {
	const sentinelRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const el = sentinelRef.current
		if (!el) return

		const observer = new IntersectionObserver(
			(entries) => {
				const [entry] = entries
				if (entry.isIntersecting && hasNextPage && !isLoading) {
					onIntersect()
				}
			},
			{ rootMargin: '200px' },
		)

		observer.observe(el)
		return () => {
			observer.disconnect()
		}
	}, [onIntersect, isLoading, hasNextPage])

	if (!hasNextPage && !isLoading) return null

	return (
		<div ref={sentinelRef} className="py-4">
			{isLoading && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{/* 2 skeleton cards */}
					<SkeletonCard />
					<SkeletonCard />
				</div>
			)}
		</div>
	)
}

function SkeletonCard() {
	return (
		<div className="flex flex-col rounded-2xl overflow-hidden border border-[var(--p-border)] bg-[var(--p-card)]">
			{/* Image skeleton */}
			<div className="aspect-[4/3] bg-[var(--p-surface)] animate-pulse" />
			{/* Content skeleton */}
			<div className="flex flex-col gap-2 p-4">
				<div className="h-4 w-3/4 rounded bg-[var(--p-surface)] animate-pulse" />
				<div className="h-4 w-1/2 rounded bg-[var(--p-surface)] animate-pulse" />
				<div className="h-3 w-1/4 rounded bg-[var(--p-surface)] animate-pulse" />
			</div>
		</div>
	)
}
