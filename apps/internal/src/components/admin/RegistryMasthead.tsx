import { BookMarked, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { VolumeDefinition } from '../../types/admin'
import { EmployeeStatusPill } from '../shared/EmployeeControls'

interface RegistryMastheadProps {
	volume: VolumeDefinition
	entryCount: number
}

/**
 * Shared masthead for every admin volume. It keeps counts and volume state
 * visible without taking over the working screen on smaller devices.
 */
export function RegistryMasthead({
	volume,
	entryCount,
}: RegistryMastheadProps) {
	const { t } = useTranslation('admin')

	return (
		<header className="border-b border-black/[0.06] px-4 pb-5 pt-20 dark:border-white/[0.08] sm:px-6 sm:pb-6 lg:px-12 lg:pb-7 lg:pt-8">
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
	)
}
