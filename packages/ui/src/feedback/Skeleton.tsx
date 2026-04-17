import { cn } from '../utils/cn'

interface SkeletonProps {
	className?: string
}

export function Skeleton({ className }: SkeletonProps) {
	return (
		<div
			className={cn(
				'animate-pulse rounded-md bg-[var(--color-surface)]',
				className,
			)}
		/>
	)
}
