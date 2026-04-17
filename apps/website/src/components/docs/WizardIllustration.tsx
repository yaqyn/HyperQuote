interface WizardIllustrationProps {
	type: string
	className?: string
}

/**
 * Placeholder illustrations for wizard steps.
 * Each type renders a minimal line-art SVG in primary blue.
 * Replace with real illustrations later — the interface stays the same.
 */
export function WizardIllustration({
	type,
	className = '',
}: WizardIllustrationProps) {
	return (
		<div
			className={`flex items-center justify-center bg-[var(--color-primary)]/[0.04] border border-[var(--color-primary)]/[0.08] rounded-lg ${className}`}
		>
			<svg
				aria-hidden="true"
				viewBox="0 0 120 120"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				className="w-16 h-16 text-[var(--color-primary)] opacity-40"
			>
				{getIllustrationPath(type)}
			</svg>
		</div>
	)
}

function getIllustrationPath(type: string) {
	switch (type) {
		case 'signup':
			return (
				<>
					<rect
						x="35"
						y="25"
						width="50"
						height="60"
						rx="6"
						stroke="currentColor"
						strokeWidth="2"
					/>
					<circle
						cx="60"
						cy="48"
						r="10"
						stroke="currentColor"
						strokeWidth="2"
					/>
					<path
						d="M45 72 a15 15 0 0 1 30 0"
						stroke="currentColor"
						strokeWidth="2"
					/>
				</>
			)
		case 'verify':
			return (
				<>
					<rect
						x="38"
						y="20"
						width="44"
						height="80"
						rx="8"
						stroke="currentColor"
						strokeWidth="2"
					/>
					<circle
						cx="60"
						cy="60"
						r="15"
						stroke="currentColor"
						strokeWidth="2"
					/>
					<path
						d="M52 60 l5 5 l11-11"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</>
			)
		case 'browse':
			return (
				<>
					<rect
						x="20"
						y="30"
						width="35"
						height="45"
						rx="3"
						stroke="currentColor"
						strokeWidth="2"
					/>
					<rect
						x="65"
						y="30"
						width="35"
						height="45"
						rx="3"
						stroke="currentColor"
						strokeWidth="2"
					/>
					<rect
						x="20"
						y="80"
						width="35"
						height="10"
						rx="2"
						stroke="currentColor"
						strokeWidth="1.5"
					/>
					<rect
						x="65"
						y="80"
						width="35"
						height="10"
						rx="2"
						stroke="currentColor"
						strokeWidth="1.5"
					/>
				</>
			)
		case 'search':
			return (
				<>
					<circle
						cx="52"
						cy="52"
						r="22"
						stroke="currentColor"
						strokeWidth="2"
					/>
					<path
						d="M68 68 l18 18"
						stroke="currentColor"
						strokeWidth="3"
						strokeLinecap="round"
					/>
				</>
			)
		case 'quote':
			return (
				<>
					<rect
						x="28"
						y="22"
						width="64"
						height="76"
						rx="4"
						stroke="currentColor"
						strokeWidth="2"
					/>
					<line
						x1="40"
						y1="42"
						x2="80"
						y2="42"
						stroke="currentColor"
						strokeWidth="1.5"
					/>
					<line
						x1="40"
						y1="55"
						x2="72"
						y2="55"
						stroke="currentColor"
						strokeWidth="1.5"
					/>
					<line
						x1="40"
						y1="68"
						x2="76"
						y2="68"
						stroke="currentColor"
						strokeWidth="1.5"
					/>
					<circle cx="34" cy="42" r="2" fill="currentColor" />
					<circle cx="34" cy="55" r="2" fill="currentColor" />
					<circle cx="34" cy="68" r="2" fill="currentColor" />
				</>
			)
		case 'submit':
			return (
				<>
					<path
						d="M25 60 l35-30 l35 30"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinejoin="round"
					/>
					<rect
						x="30"
						y="55"
						width="60"
						height="35"
						rx="3"
						stroke="currentColor"
						strokeWidth="2"
					/>
					<path
						d="M30 58 l30 22 l30-22"
						stroke="currentColor"
						strokeWidth="1.5"
					/>
				</>
			)
		case 'track':
			return (
				<>
					<circle cx="30" cy="60" r="8" stroke="currentColor" strokeWidth="2" />
					<circle cx="60" cy="60" r="8" stroke="currentColor" strokeWidth="2" />
					<circle cx="90" cy="60" r="8" stroke="currentColor" strokeWidth="2" />
					<line
						x1="38"
						y1="60"
						x2="52"
						y2="60"
						stroke="currentColor"
						strokeWidth="2"
					/>
					<line
						x1="68"
						y1="60"
						x2="82"
						y2="60"
						stroke="currentColor"
						strokeWidth="2"
					/>
					<circle cx="30" cy="60" r="3" fill="currentColor" />
					<circle cx="60" cy="60" r="3" fill="currentColor" />
				</>
			)
		case 'support':
			return (
				<>
					<rect
						x="25"
						y="30"
						width="70"
						height="50"
						rx="8"
						stroke="currentColor"
						strokeWidth="2"
					/>
					<path
						d="M38 55 l10-10 l10 10"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<line
						x1="68"
						y1="50"
						x2="78"
						y2="50"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
					<line
						x1="68"
						y1="58"
						x2="75"
						y2="58"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
					<circle cx="60" cy="85" r="3" fill="currentColor" />
				</>
			)
		default:
			return (
				<rect
					x="30"
					y="30"
					width="60"
					height="60"
					rx="8"
					stroke="currentColor"
					strokeWidth="2"
				/>
			)
	}
}
