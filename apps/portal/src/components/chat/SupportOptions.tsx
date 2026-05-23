import { LifeBuoy } from 'lucide-react'
import type { SupportOptionsData } from '../../lib/chat-types'
import { ActionButton } from './ActionButton'

interface SupportOptionsProps {
	data: SupportOptionsData
}

export function SupportOptions({ data }: SupportOptionsProps) {
	return (
		<section className="mt-3 w-full max-w-[660px] border border-[var(--p-rule)] bg-[var(--p-surface-subtle)] px-3 py-3">
			<div className="flex items-start gap-3 border-b border-[var(--p-rule)] pb-3">
				<span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--p-border)] bg-[var(--p-card)] text-[var(--p-text)]">
					<LifeBuoy size={15} strokeWidth={1.8} />
				</span>
				<div className="min-w-0">
					<h3 className="text-[14px] font-semibold text-[var(--p-text)]">
						{data.title}
					</h3>
					<p className="mt-1 text-[12px] leading-5 text-[var(--p-text-muted)]">
						{data.description}
					</p>
				</div>
			</div>

			<div className="mt-3 grid gap-1.5">
				{data.options.map((option) => (
					<div
						key={option.title}
						className="grid min-w-0 grid-cols-1 gap-2 border border-[var(--p-rule)] bg-[var(--p-card)] px-2.5 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
					>
						<div className="min-w-0">
							<p className="text-[12px] font-semibold text-[var(--p-text)]">
								{option.title}
							</p>
							<p className="mt-1 text-[12px] leading-4 text-[var(--p-text-muted)]">
								{option.description}
							</p>
						</div>
						<ActionButton data={option.action} />
					</div>
				))}
			</div>
		</section>
	)
}
