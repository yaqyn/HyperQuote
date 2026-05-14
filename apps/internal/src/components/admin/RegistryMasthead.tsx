import { BookMarked, BookOpen, CheckCircle2, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { VolumeDefinition } from '../../types/admin'
import { EmployeeStatusPill } from '../shared/EmployeeControls'

interface RegistryMastheadProps {
	volume: VolumeDefinition
	entryCount: number
	onOpenVolumes?: () => void
	onNewEntry?: (() => void) | null
}

/**
 * Shared masthead for every admin volume. It keeps counts and volume state
 * visible without taking over the working screen on smaller devices.
 */
export function RegistryMasthead({
	volume,
	entryCount,
	onOpenVolumes,
	onNewEntry,
}: RegistryMastheadProps) {
	const { t } = useTranslation('admin')

	return (
		<>
			<header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-black/[0.06] bg-[var(--color-surface)]/92 px-3 backdrop-blur-sm dark:border-white/[0.08] lg:hidden">
				<button
					type="button"
					onClick={onOpenVolumes}
					disabled={!onOpenVolumes}
					className="inline-flex min-w-0 items-center gap-2 rounded-md px-1.5 py-2 text-start outline-none transition-colors hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:cursor-default dark:hover:bg-white/[0.04]"
					aria-label={t('rail.title')}
				>
					<BookOpen
						aria-hidden="true"
						size={15}
						strokeWidth={2}
						className="shrink-0 text-[var(--color-text-muted)]"
					/>
					<span className="min-w-0 truncate font-[family-name:var(--font-archivo)] text-[14px] font-semibold text-[var(--color-text)]">
						{t(volume.labelKey)}
					</span>
				</button>
				{onNewEntry && !volume.readOnly && (
					<button
						type="button"
						onClick={onNewEntry}
						aria-label={t('actions.new')}
						className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)] text-white outline-none transition-colors hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
					>
						<Plus aria-hidden="true" size={15} strokeWidth={2.2} />
					</button>
				)}
			</header>

			<header className="hidden border-b border-black/[0.06] px-4 pb-5 pt-20 dark:border-white/[0.08] sm:px-6 sm:pb-6 lg:block lg:px-12 lg:pb-7 lg:pt-8">
				<div className="flex flex-wrap items-center gap-2">
					<EmployeeStatusPill
						tone="neutral"
						leading={<BookMarked size={13} strokeWidth={2.2} />}
					>
						{t('masthead.metaVolume')} {volume.roman}
					</EmployeeStatusPill>
					<EmployeeStatusPill tone="neutral">
						{t('masthead.metaEntries', { count: entryCount })}
					</EmployeeStatusPill>
					{volume.readOnly && (
						<EmployeeStatusPill
							tone="warning"
							leading={<CheckCircle2 size={13} strokeWidth={2.2} />}
						>
							{t('masthead.metaReadOnly')}
						</EmployeeStatusPill>
					)}
				</div>

				<h1 className="mt-4 break-words font-[family-name:var(--font-bricolage)] text-[32px] font-semibold leading-[1.05] text-[var(--color-text)] sm:text-[38px] lg:text-[44px]">
					{t(volume.labelKey)}
				</h1>

				<p className="mt-3 max-w-[62ch] font-[family-name:var(--font-archivo)] text-[14px] leading-relaxed text-[var(--color-text-muted)]">
					{t(volume.subtitleKey)}
				</p>
			</header>
		</>
	)
}
