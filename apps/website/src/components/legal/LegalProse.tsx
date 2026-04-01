import type { ReactNode } from 'react'

interface LegalProseProps {
	title: string
	lastUpdated: string
	children: ReactNode
}

export function LegalProse({ title, lastUpdated, children }: LegalProseProps) {
	return (
		<article className="mx-auto max-w-[800px] px-6 py-12">
			<h1 className="text-3xl font-bold">{title}</h1>
			<p className="mt-2 font-[family-name:var(--font-geist-mono)] text-xs text-[var(--color-text-muted)]">
				{lastUpdated}
			</p>
			<div className="mt-8 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-base [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:text-base [&_p]:leading-[1.75] [&_p]:mb-4">
				{children}
			</div>
		</article>
	)
}
