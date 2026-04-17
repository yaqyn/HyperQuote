import { cn } from '../utils/cn'

interface LionMarkProps {
	className?: string
	opacity?: number
}

/**
 * SVG lion watermark placeholder.
 * Auto-switches color based on theme via currentColor.
 * Renders at barely-perceptible opacity (default 0.03-0.05).
 */
export function LionMark({ className, opacity = 0.04 }: LionMarkProps) {
	return (
		<svg
			viewBox="0 0 200 200"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={cn('text-[var(--color-text)]', className)}
			style={{ opacity }}
			aria-hidden="true"
		>
			{/* Simplified geometric lion silhouette */}
			<path
				d="M100 20
           C80 20, 60 35, 55 55
           C45 50, 35 55, 30 65
           C25 75, 30 85, 35 90
           L35 120
           C35 140, 45 155, 60 165
           L60 180
           L80 180
           L80 165
           C85 170, 95 172, 100 172
           C105 172, 115 170, 120 165
           L120 180
           L140 180
           L140 165
           C155 155, 165 140, 165 120
           L165 90
           C170 85, 175 75, 170 65
           C165 55, 155 50, 145 55
           C140 35, 120 20, 100 20Z"
				fill="currentColor"
			/>
			{/* Mane detail */}
			<path
				d="M70 45
           C65 30, 80 15, 100 15
           C120 15, 135 30, 130 45
           C140 40, 150 50, 148 60
           C155 55, 160 65, 155 75
           C150 70, 140 68, 135 70
           C125 50, 100 42, 75 50
           C60 55, 50 65, 45 75
           C40 65, 45 55, 52 50
           C55 42, 65 38, 70 45Z"
				fill="currentColor"
				fillOpacity="0.5"
			/>
		</svg>
	)
}
