import { StatusBadge } from '@hyperquote/ui'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getCEOAttentionItems } from '../../lib/server/attention'
import type { AttentionItem } from '../../types/attention'

export const Route = createFileRoute('/_ceo/attention')({
	loader: () => getCEOAttentionItems(),
	component: AttentionItemsPage,
})

function severityToStatus(severity: AttentionItem['severity']) {
	return severity === 'critical' ? 'error' : 'warning'
}

function severityLabel(severity: AttentionItem['severity']) {
	return severity === 'critical' ? 'Critical' : 'Warning'
}

function formatAmount(amount: number): string {
	return new Intl.NumberFormat('en-EG', {
		style: 'currency',
		currency: 'EGP',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount)
}

function AttentionItemsPage() {
	const { items } = Route.useLoaderData()
	const navigate = useNavigate()

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
				<button
					type="button"
					onClick={() => navigate({ to: '/' })}
					className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
					aria-label="Go back"
				>
					&larr;
				</button>
				<h1 className="text-xl font-semibold text-[var(--color-text)]">
					Attention Items
				</h1>
			</div>

			{/* Items list */}
			<div className="flex-1 overflow-y-auto">
				{items.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-20">
						<svg
							aria-hidden="true"
							className="mb-3 h-10 w-10 text-[var(--color-text-subtle)]"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={1.5}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<p className="text-sm text-[var(--color-text-muted)]">
							No items need attention
						</p>
					</div>
				) : (
					<ul className="divide-y divide-[var(--color-border)]">
						{items.map((item) => (
							<li key={item.id}>
								<button
									type="button"
									onClick={() =>
										navigate({
											to: '/entity/$type/$id',
											params: {
												type: item.entityType,
												id: item.entityId,
											},
										})
									}
									className="flex w-full items-start gap-3 px-4 py-4 text-start transition-colors hover:bg-[var(--color-surface)]"
								>
									<div className="shrink-0 pt-0.5">
										<StatusBadge status={severityToStatus(item.severity)}>
											{severityLabel(item.severity)}
										</StatusBadge>
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium text-[var(--color-text)]">
											{item.entityName}
										</p>
										<p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
											{item.description}
										</p>
									</div>
									{item.amount != null && (
										<span className="shrink-0 font-mono text-sm font-medium text-[var(--color-text)]">
											{formatAmount(item.amount)}
										</span>
									)}
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	)
}
