import { SearchMenu } from './SearchMenu'

interface SupplierRecord {
	id: string
	name: string
	tier: string
	score: number
	categories: string[]
}

interface SourceSearchMenuProps {
	isOpen: boolean
	onClose: () => void
	itemName: string
	stockAvailable: number
	currentSourceId: string
	searchSuppliers: (query: string, itemName?: string) => SupplierRecord[]
	onSelect: (sourceId: string) => void
}

const TIER_COLORS: Record<string, string> = {
	Preferred: 'text-green-600 dark:text-green-400',
	Approved: 'text-[var(--color-text-subtle)]',
	Conditional: 'text-amber-600 dark:text-amber-400',
	New: 'text-black/30 dark:text-white/30',
}

export function SourceSearchMenu({
	isOpen,
	onClose,
	itemName,
	stockAvailable,
	currentSourceId,
	searchSuppliers,
	onSelect,
}: SourceSearchMenuProps) {
	return (
		<SearchMenu
			isOpen={isOpen}
			onClose={onClose}
			placeholder="Search suppliers..."
		>
			{(search) => {
				const results = searchSuppliers(search, itemName)

				return (
					<div className="flex flex-col py-1">
						{/* Warehouse option */}
						{stockAvailable > 0 && !search && (
							<button
								type="button"
								data-searchmenu-row="true"
								onClick={() => {
									onSelect('warehouse')
									onClose()
								}}
								className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left outline-none transition-colors data-[active=true]:bg-[var(--color-primary)]/[0.06] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] lg:items-center ${currentSourceId === 'warehouse' ? 'bg-[var(--color-primary)]/[0.04]' : ''}`}
							>
								<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
									<svg
										aria-hidden="true"
										width="12"
										height="12"
										viewBox="0 0 14 14"
										fill="none"
									>
										<path
											d="M2 6l5-3.5L12 6v5.5a1 1 0 01-1 1H3a1 1 0 01-1-1V6z"
											stroke="var(--color-primary)"
											strokeWidth="1.2"
											strokeLinejoin="round"
										/>
									</svg>
								</span>
								<div className="flex-1 min-w-0">
									<span className="text-[13px] font-medium text-[var(--color-text)]">
										Warehouse
									</span>
									<p className="text-[10px] text-[var(--color-text-subtle)] mt-0.5">
										In-stock · fastest delivery
									</p>
								</div>
								<span className="shrink-0 font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-green-600 dark:text-green-400">
									{stockAvailable} avail
								</span>
							</button>
						)}

						{/* Divider if warehouse shown */}
						{stockAvailable > 0 && !search && results.length > 0 && (
							<div className="mx-4 my-1 border-t border-black/[0.04] dark:border-white/[0.04]" />
						)}

						{/* Suppliers */}
						{results.length === 0 ? (
							<div className="flex items-center justify-center py-12">
								<p className="text-[13px] text-[var(--color-text-subtle)]">
									{search ? 'No suppliers found' : 'No suppliers available'}
								</p>
							</div>
						) : (
							results.map((sup) => (
								<button
									key={sup.id}
									type="button"
									data-searchmenu-row="true"
									onClick={() => {
										onSelect(sup.id)
										onClose()
									}}
									className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left outline-none transition-colors data-[active=true]:bg-[var(--color-primary)]/[0.06] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] lg:items-center ${currentSourceId === sup.id ? 'bg-[var(--color-primary)]/[0.04]' : ''}`}
								>
									<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
										<span className="text-[10px] font-semibold text-[var(--color-text-subtle)]">
											{sup.name.charAt(0)}
										</span>
									</span>
									<div className="flex-1 min-w-0">
										<span className="block break-words text-[13px] font-medium text-[var(--color-text)] lg:truncate">
											{sup.name}
										</span>
										<p
											className={`text-[10px] mt-0.5 ${TIER_COLORS[sup.tier] ?? 'text-[var(--color-text-subtle)]'}`}
										>
											{sup.tier}
										</p>
									</div>
									<span className="shrink-0 font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-[var(--color-text-muted)]">
										{sup.score}
									</span>
								</button>
							))
						)}
					</div>
				)
			}}
		</SearchMenu>
	)
}
