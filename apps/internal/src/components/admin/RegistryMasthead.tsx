import { useTranslation } from 'react-i18next'
import type { VolumeDefinition } from '../../types/admin'

interface RegistryMastheadProps {
	volume: VolumeDefinition
	entryCount: number
}

/**
 * The masthead of every volume. A typographic hierarchy: mono eyebrow
 * with volume numeral and live count, then a large Fraunces title, then
 * a small italic subtitle, then a hairline rule that terminates the
 * block. The subtitle is the one place each volume gets to speak in
 * its own voice.
 */
export function RegistryMasthead({
	volume,
	entryCount,
}: RegistryMastheadProps) {
	const { t } = useTranslation('admin')

	return (
		<header className="px-12 pt-12 pb-7 border-b border-black/[0.06] dark:border-white/[0.08]">
			{/* Eyebrow — mono, tracked, tabular metadata */}
			<p className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-subtle)] flex items-center gap-3">
				<span>
					{t('masthead.metaVolume')} {volume.roman}
				</span>
				<span aria-hidden className="text-[var(--color-border)]">
					‖
				</span>
				<span className="tabular-nums">
					{t('masthead.metaEntries', { count: entryCount })}
				</span>
				{volume.readOnly && (
					<>
						<span aria-hidden className="text-[var(--color-border)]">
							‖
						</span>
						<span className="text-[var(--color-primary)]">
							{t('masthead.metaReadOnly')}
						</span>
					</>
				)}
			</p>

			{/* Volume title — big Fraunces display */}
			<h1
				className="mt-4 font-[family-name:var(--font-fraunces)] text-[56px] leading-[1.02] tracking-[-0.02em] text-[var(--color-text)]"
				style={{
					fontFeatureSettings: '"ss01" on, "liga" on',
					fontVariationSettings: '"opsz" 144, "wght" 430, "SOFT" 40',
				}}
			>
				{t(volume.labelKey)}
			</h1>

			{/* Subtitle — serif italic, softer */}
			<p
				className="mt-3 font-[family-name:var(--font-fraunces)] italic text-[15px] leading-snug text-[var(--color-text-muted)] max-w-[52ch]"
				style={{ fontVariationSettings: '"opsz" 14, "wght" 400' }}
			>
				{t(volume.subtitleKey)}
			</p>
		</header>
	)
}
