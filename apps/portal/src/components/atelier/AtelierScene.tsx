import type { CSSProperties, ReactNode } from 'react'

// ============================================================================
// AtelierScene — the room around the order book page
// ============================================================================
//
// Renders the pendant lamp, the tungsten cone that spills down into the
// viewport, a handful of drifting dust motes inside the cone, and the page
// slot (children). The whole assembly fades in with a lamp-click animation
// when `lit` is true.
//
// The page itself is passed as children — this component owns the room,
// not the document.

export function AtelierScene({
	lit,
	children,
}: {
	lit: boolean
	children: ReactNode
}) {
	return (
		<div className="relative flex h-full w-full items-center justify-center">
			{lit && (
				<div className={`absolute inset-0 atelier-lamp-on`} aria-hidden>
					<div className="atelier-pendant" />
					<div className="atelier-cone" />
					<DustMotes />
				</div>
			)}
			<div className="relative z-10 flex w-full items-center justify-center px-6">
				{children}
			</div>
		</div>
	)
}

// ============================================================================
// Dust motes — 5 particles drifting inside the lamp cone
// ============================================================================

interface Mote {
	x: number // left offset from center in px
	y: number // top offset in px
	mx: number // drift x distance
	my: number // drift y distance
	dur: number // seconds
	delay: number // seconds
}

const MOTES: Mote[] = [
	{ x: -140, y: 70, mx: 6, my: 200, dur: 19, delay: 0 },
	{ x: -60, y: 40, mx: -10, my: 240, dur: 24, delay: 3.2 },
	{ x: 30, y: 100, mx: 4, my: 180, dur: 20, delay: 5.1 },
	{ x: 120, y: 55, mx: -8, my: 220, dur: 22, delay: 1.4 },
	{ x: -20, y: 130, mx: 12, my: 160, dur: 16, delay: 7.8 },
]

function DustMotes() {
	return (
		<>
			{MOTES.map((m) => (
				<span
					key={`${m.x}-${m.y}`}
					className="atelier-mote"
					style={
						{
							left: `calc(50% + ${m.x}px)`,
							top: `${m.y}px`,
							'--mx': `${m.mx}px`,
							'--my': `${m.my}px`,
							'--mdur': `${m.dur}s`,
							'--mdelay': `${m.delay}s`,
						} as CSSProperties
					}
				/>
			))}
		</>
	)
}
