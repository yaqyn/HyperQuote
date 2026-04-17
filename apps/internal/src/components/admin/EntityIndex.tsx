import { Plus, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAdminStore } from '../../stores/admin'
import type { AdminKey, VolumeId } from '../../types/admin'

/**
 * Column definition for the registry index. `width` follows CSS grid
 * track sizing (e.g. "1fr", "120px", "min-content"). `mono` switches the
 * cell typography to Geist Mono — used for IDs, codes, and quantities.
 */
export interface ColumnDef<T> {
	key: string
	/** i18n key under `admin.volumes.{volume}.columns.*` */
	labelKey: AdminKey
	render: (row: T) => React.ReactNode
	width: string
	align?: 'start' | 'end'
	mono?: boolean
}

interface EntityIndexProps<T> {
	volume: VolumeId
	rows: T[]
	columns: ColumnDef<T>[]
	rowKey: (row: T) => string
	/** Called when a row is pressed — typically opens view mode */
	onRowSelect: (row: T) => void
	/** If null, the "new entry" link is hidden (read-only volumes) */
	onNewEntry: (() => void) | null
	/** Free-text filter applied by the caller; this component renders the UI */
	filter: (row: T, query: string) => boolean
	/** Optional row-level decoration — used by the Products volume for the read-only note */
	topNote?: React.ReactNode
}

export function EntityIndex<T>({
	volume,
	rows,
	columns,
	rowKey,
	onRowSelect,
	onNewEntry,
	filter,
	topNote,
}: EntityIndexProps<T>) {
	const { t } = useTranslation('admin')
	const selectedId = useAdminStore((s) => s.selectedEntryId)
	const searchQuery = useAdminStore((s) => s.searchByVolume[volume])
	const setSearch = useAdminStore((s) => s.setSearch)

	const filtered = searchQuery
		? rows.filter((r) => filter(r, searchQuery.toLowerCase()))
		: rows

	// Grid template built from column widths + a leading "№" track
	const gridTemplate = `64px ${columns.map((c) => c.width).join(' ')}`

	return (
		<div className="flex-1 min-h-0 flex flex-col overflow-hidden">
			{/* Toolbar ────────────────────────────────────────── */}
			<div className="px-12 pt-6 pb-5 flex items-center gap-6 border-b border-black/[0.06] dark:border-white/[0.08]">
				<label className="flex-1 flex items-center gap-3 text-[13px]">
					<Search
						size={14}
						strokeWidth={1.5}
						className="text-[var(--color-text-subtle)] shrink-0"
					/>
					<input
						type="search"
						value={searchQuery}
						onChange={(e) => setSearch(volume, e.target.value)}
						placeholder={t('search.placeholder')}
						className="flex-1 bg-transparent outline-none placeholder:text-[var(--color-text-subtle)] font-[family-name:var(--font-inter)] text-[14px] text-[var(--color-text)]"
					/>
				</label>

				{onNewEntry && (
					<button
						type="button"
						onClick={onNewEntry}
						className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-primary)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/40 rounded-sm px-0.5"
					>
						<Plus size={14} strokeWidth={1.75} />
						<span className="border-b border-transparent group-hover:border-[var(--color-primary)] transition-colors">
							{t('actions.new')}
						</span>
					</button>
				)}
			</div>

			{topNote}

			{/* Column headers ─────────────────────────────────── */}
			<div
				className="px-12 py-3 grid items-center gap-4 border-b border-black/[0.06] dark:border-white/[0.08] font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-subtle)]"
				style={{ gridTemplateColumns: gridTemplate }}
			>
				<span className="tabular-nums">№</span>
				{columns.map((c) => (
					<span
						key={c.key}
						className={c.align === 'end' ? 'text-end' : 'text-start'}
					>
						{t(c.labelKey)}
					</span>
				))}
			</div>

			{/* Rows ───────────────────────────────────────────── */}
			<div className="flex-1 overflow-y-auto">
				{filtered.length === 0 ? (
					<EmptyIndex hasQuery={Boolean(searchQuery)} />
				) : (
					<ol className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
						{filtered.map((row, i) => {
							const id = rowKey(row)
							const isSelected = selectedId === id
							return (
								<li key={id}>
									<button
										type="button"
										onClick={() => onRowSelect(row)}
										className={`group relative w-full text-start px-12 py-4 grid items-center gap-4 outline-none transition-colors
                      ${
												isSelected
													? 'bg-[var(--color-primary)]/[0.04]'
													: 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
											}
                      focus-visible:bg-black/[0.03] dark:focus-visible:bg-white/[0.03]`}
										style={{ gridTemplateColumns: gridTemplate }}
									>
										{/* Blue left edge when selected */}
										{isSelected && (
											<span
												aria-hidden
												className="absolute inset-y-0 start-0 w-[2px] bg-[var(--color-primary)]"
											/>
										)}

										{/* Entry number — position-based, not the entity id */}
										<span
											className={`font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums transition-colors
                        ${
													isSelected
														? 'text-[var(--color-primary)]'
														: 'text-[var(--color-text-subtle)] group-hover:text-[var(--color-text-muted)]'
												}`}
										>
											№ {String(i + 1).padStart(3, '0')}
										</span>

										{columns.map((c) => (
											<span
												key={c.key}
												className={`text-[13px] truncate
                          ${c.mono ? 'font-[family-name:var(--font-geist-mono)] tabular-nums text-[12px]' : 'font-[family-name:var(--font-inter)]'}
                          ${c.align === 'end' ? 'text-end' : 'text-start'}
                          ${isSelected ? 'text-[var(--color-text)]' : 'text-[var(--color-text)]'}`}
											>
												{c.render(row)}
											</span>
										))}
									</button>
								</li>
							)
						})}
					</ol>
				)}
			</div>
		</div>
	)
}

function EmptyIndex({ hasQuery }: { hasQuery: boolean }) {
	const { t } = useTranslation('admin')
	return (
		<div className="flex flex-col items-center justify-center h-full gap-2 px-12 py-20 text-center select-none">
			<p
				className="font-[family-name:var(--font-fraunces)] italic text-[28px] text-[var(--color-text-muted)]"
				style={{ fontVariationSettings: '"opsz" 144, "wght" 400' }}
			>
				{t('empty.volume')}
			</p>
			<p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
				{hasQuery ? t('search.placeholder') : t('empty.volumeSub')}
			</p>
		</div>
	)
}
