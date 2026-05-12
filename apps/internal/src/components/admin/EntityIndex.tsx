import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useAdminStore } from '../../stores/admin'
import type { AdminKey, VolumeId } from '../../types/admin'
import {
	EmployeeActionButton,
	EmployeeSearchField,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'

/**
 * Column definition for the registry index. `width` follows desktop table
 * track sizing (e.g. "1fr", "120px", "min-content"). `mono` switches the
 * cell typography to Geist Mono — used for IDs, codes, and quantities.
 */
export interface ColumnDef<T> {
	key: string
	/** i18n key under `admin.volumes.{volume}.columns.*` */
	labelKey: AdminKey
	render: (row: T) => ReactNode
	width: string
	align?: 'start' | 'end'
	mono?: boolean
	mobileRole?: 'media' | 'primary' | 'detail' | 'hidden'
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
	isLoading?: boolean
	isError?: boolean
	/** Optional row-level decoration — used by the Products volume for the read-only note */
	topNote?: ReactNode
}

export function EntityIndex<T>({
	volume,
	rows,
	columns,
	rowKey,
	onRowSelect,
	onNewEntry,
	filter,
	isLoading = false,
	isError = false,
	topNote,
}: EntityIndexProps<T>) {
	const { t } = useTranslation('admin')
	const selectedId = useAdminStore((s) => s.selectedEntryId)
	const searchQuery = useAdminStore((s) => s.searchByVolume[volume])
	const setSearch = useAdminStore((s) => s.setSearch)

	const filtered = searchQuery
		? rows.filter((r) => filter(r, searchQuery.toLowerCase()))
		: rows
	const resultLabel = searchQuery
		? t('search.filtered', {
				shown: filtered.length.toLocaleString(),
				total: rows.length.toLocaleString(),
			})
		: t('search.records', { count: rows.length.toLocaleString() })
	const mobileColumns = columns.filter((c) => c.mobileRole !== 'hidden')
	const mediaColumns = mobileColumns.filter((c) => c.mobileRole === 'media')
	const primaryColumn =
		mobileColumns.find((c) => c.mobileRole === 'primary') ??
		mobileColumns.find((c) => t(c.labelKey).trim().length > 0) ??
		mobileColumns[0]
	const mobileDetailColumns = mobileColumns.filter(
		(c) => c !== primaryColumn && c.mobileRole !== 'media',
	)

	// Desktop table template built from column widths + a leading "№" track
	const gridTemplate = `64px ${columns.map((c) => c.width).join(' ')}`

	return (
		<div className="flex-1 min-h-0 flex flex-col overflow-hidden">
			{/* Toolbar ────────────────────────────────────────── */}
			<div className="flex flex-col gap-3 border-b border-black/[0.06] px-4 pb-4 pt-5 dark:border-white/[0.08] sm:px-6 lg:flex-row lg:items-center lg:gap-4 lg:px-12 lg:pb-5 lg:pt-6">
				<EmployeeSearchField
					value={searchQuery}
					onChange={(value) => setSearch(volume, value)}
					placeholder={t('search.placeholder')}
					label={t('search.placeholder')}
					className="lg:flex-1"
				/>

				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
					<EmployeeStatusPill className="w-full justify-center sm:w-auto">
						{resultLabel}
					</EmployeeStatusPill>

					{onNewEntry && (
						<EmployeeActionButton
							onClick={onNewEntry}
							tone="primary"
							size="sm"
							leading={<Plus size={14} strokeWidth={2.2} />}
							fullWidthOnMobile
						>
							{t('actions.new')}
						</EmployeeActionButton>
					)}
				</div>
			</div>

			{topNote}

			{/* Column headers ─────────────────────────────────── */}
			<div
				className="hidden border-b border-black/[0.06] px-12 py-3 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-subtle)] dark:border-white/[0.08] lg:grid lg:items-center lg:gap-4"
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
				{isError ? (
					<IndexState
						title={t('empty.error')}
						detail={t('empty.errorSub')}
						tone="danger"
					/>
				) : isLoading && rows.length === 0 ? (
					<IndexState
						title={t('empty.loading')}
						detail={t('empty.loadingSub')}
					/>
				) : filtered.length === 0 ? (
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
										className={`group relative flex w-full flex-col gap-3 px-4 py-4 text-start outline-none transition-colors sm:px-6 lg:grid lg:items-center lg:gap-4 lg:px-12
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

										<div className="flex min-w-0 items-start gap-3 lg:hidden">
											{mediaColumns.map((c) => (
												<div key={c.key} className="shrink-0">
													{c.render(row)}
												</div>
											))}
											<div className="min-w-0 flex-1">
												<div className="flex items-start justify-between gap-3">
													<div className="min-w-0 break-words font-[family-name:var(--font-archivo)] text-[15px] font-semibold leading-snug text-[var(--color-text)]">
														{primaryColumn?.render(row)}
													</div>
													<span
														className={`shrink-0 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums transition-colors
                              ${
																isSelected
																	? 'text-[var(--color-primary)]'
																	: 'text-[var(--color-text-subtle)] group-hover:text-[var(--color-text-muted)]'
															}`}
													>
														№ {String(i + 1).padStart(3, '0')}
													</span>
												</div>

												{mobileDetailColumns.length > 0 && (
													<div className="mt-3 flex flex-wrap gap-2">
														{mobileDetailColumns.map((c) => {
															const label = t(c.labelKey).trim()
															if (!label) return null
															return (
																<div
																	key={c.key}
																	className={`inline-flex max-w-full items-center gap-2 rounded-md border border-black/[0.06] bg-black/[0.02] px-2.5 py-1.5 text-[12px] dark:border-white/[0.08] dark:bg-white/[0.04] ${
																		c.mono
																			? 'font-[family-name:var(--font-geist-mono)] tabular-nums'
																			: 'font-[family-name:var(--font-archivo)]'
																	}`}
																>
																	<span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
																		{label}
																	</span>
																	<div className="min-w-0 break-words leading-snug text-[var(--color-text)]">
																		{c.render(row)}
																	</div>
																</div>
															)
														})}
													</div>
												)}
											</div>
										</div>

										<span
											className={`hidden font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums transition-colors lg:block
                        ${
													isSelected
														? 'text-[var(--color-primary)]'
														: 'text-[var(--color-text-subtle)] group-hover:text-[var(--color-text-muted)]'
												}`}
										>
											№ {String(i + 1).padStart(3, '0')}
										</span>

										{columns.map((c) => (
											<div
												key={c.key}
												className={`hidden min-w-0 text-start text-[13px] lg:block
                          ${c.mono ? 'font-[family-name:var(--font-geist-mono)] tabular-nums text-[12px]' : 'font-[family-name:var(--font-archivo)]'}
                          ${c.align === 'end' ? 'lg:text-end' : 'lg:text-start'}
                          ${isSelected ? 'text-[var(--color-text)]' : 'text-[var(--color-text)]'}`}
											>
												<div className="min-w-0 break-words leading-snug">
													{c.render(row)}
												</div>
											</div>
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

function IndexState({
	title,
	detail,
	tone = 'neutral',
}: {
	title: string
	detail: string
	tone?: 'neutral' | 'danger'
}) {
	return (
		<div className="flex h-full select-none flex-col items-center justify-center gap-3 px-4 py-20 text-center sm:px-6 lg:px-12">
			<p className="max-w-sm font-[family-name:var(--font-bricolage)] text-[24px] font-semibold leading-tight text-[var(--color-text)]">
				{title}
			</p>
			<EmployeeStatusPill tone={tone}>{detail}</EmployeeStatusPill>
		</div>
	)
}

function EmptyIndex({ hasQuery }: { hasQuery: boolean }) {
	const { t } = useTranslation('admin')
	return (
		<div className="flex h-full select-none flex-col items-center justify-center gap-3 px-4 py-20 text-center sm:px-6 lg:px-12">
			<p className="max-w-sm font-[family-name:var(--font-bricolage)] text-[24px] font-semibold leading-tight text-[var(--color-text)]">
				{t('empty.volume')}
			</p>
			<EmployeeStatusPill>
				{hasQuery ? t('empty.noMatches') : t('empty.volumeSub')}
			</EmployeeStatusPill>
		</div>
	)
}
