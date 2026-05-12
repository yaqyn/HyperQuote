// ============================================================================
// WaxSeal — pressed wax impression showing a company's first initial
// ============================================================================
//
// Replaces the dotted-mask "•••••• •••••" masking for the claim-an-existing-
// account step. The seal is small, dense, slightly noisy, with a dark impressed
// letter. Ox-blood palette only — no reference to the portal's blue accent.

export function WaxSeal({ initial }: { initial: string }) {
	return (
		<svg
			viewBox="0 0 120 120"
			className="atelier-seal block h-24 w-24 sm:h-[120px] sm:w-[120px]"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label={`Seal of a company starting with ${initial}`}
		>
			<defs>
				<radialGradient id="seal-wax" cx="38%" cy="32%" r="72%">
					<stop offset="0%" stopColor="#d4d4d4" />
					<stop offset="35%" stopColor="#989898" />
					<stop offset="65%" stopColor="#5f5f5f" />
					<stop offset="100%" stopColor="#2a2a2a" />
				</radialGradient>
				<radialGradient id="seal-highlight" cx="42%" cy="30%" r="24%">
					<stop offset="0%" stopColor="rgba(255, 255, 255, 0.55)" />
					<stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
				</radialGradient>
				<filter id="seal-noise" x="0" y="0" width="100%" height="100%">
					<feTurbulence
						type="fractalNoise"
						baseFrequency="0.9"
						numOctaves="2"
						seed="4"
					/>
					<feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" />
					<feComposite in2="SourceGraphic" operator="in" />
				</filter>
				<filter id="seal-press" x="-10%" y="-10%" width="120%" height="120%">
					<feGaussianBlur stdDeviation="0.8" />
				</filter>
				<clipPath id="seal-clip">
					<path d="M 60 6 C 86 6 108 24 112 50 C 116 72 104 96 82 108 C 64 118 44 114 28 102 C 10 88 6 64 12 46 C 18 24 36 6 60 6 Z" />
				</clipPath>
			</defs>

			{/* soft shadow below the seal */}
			<ellipse cx="60" cy="110" rx="42" ry="4" fill="rgba(0,0,0,0.45)" />

			<g clipPath="url(#seal-clip)">
				{/* wax base */}
				<rect width="120" height="120" fill="url(#seal-wax)" />
				{/* subtle highlight where light catches the dome */}
				<rect width="120" height="120" fill="url(#seal-highlight)" />
				{/* noise texture for wax imperfections */}
				<rect
					width="120"
					height="120"
					fill="#000"
					filter="url(#seal-noise)"
					opacity="0.5"
				/>
			</g>

			{/* outer rim — slight raise */}
			<path
				d="M 60 6 C 86 6 108 24 112 50 C 116 72 104 96 82 108 C 64 118 44 114 28 102 C 10 88 6 64 12 46 C 18 24 36 6 60 6 Z"
				fill="none"
				stroke="rgba(255,200,190,0.08)"
				strokeWidth="1"
			/>

			{/* impressed inner ring */}
			<circle
				cx="60"
				cy="60"
				r="40"
				fill="none"
				stroke="rgba(28,6,5,0.5)"
				strokeWidth="0.8"
			/>
			<circle
				cx="60"
				cy="60"
				r="38"
				fill="none"
				stroke="rgba(208,84,72,0.15)"
				strokeWidth="0.4"
			/>

			{/* impressed initial */}
			<text
				x="60"
				y="78"
				fontFamily="Instrument Serif, Georgia, serif"
				fontSize="46"
				fontStyle="italic"
				textAnchor="middle"
				fill="#1E0404"
				filter="url(#seal-press)"
			>
				{initial}
			</text>
			<text
				x="60"
				y="78"
				fontFamily="Instrument Serif, Georgia, serif"
				fontSize="46"
				fontStyle="italic"
				textAnchor="middle"
				fill="rgba(232,110,96,0.15)"
			>
				{initial}
			</text>
		</svg>
	)
}
