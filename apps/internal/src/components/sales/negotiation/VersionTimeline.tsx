import { useTranslation } from 'react-i18next'

interface VersionTimelineProps {
	quoteId: string
	selectedVersions: [string, string]
	onSelectVersion: (versionId: string) => void
}

export function VersionTimeline({
	quoteId: _quoteId,
	selectedVersions: _selectedVersions,
	onSelectVersion: _onSelectVersion,
}: VersionTimelineProps) {
	const { t } = useTranslation('internal')

	return (
		<div className="flex w-full flex-col py-4 ps-6 pe-4">
			<span className="mb-3 text-[11px] font-medium uppercase text-[var(--color-text-subtle)]">
				{t('sales.negotiation.versionTimeline', 'Version Timeline')}
			</span>
			<p className="text-[12px] text-[var(--color-text-muted)]">
				{t(
					'sales.negotiation.noVersionTimeline',
					'No quote versions are available for this quote.',
				)}
			</p>
		</div>
	)
}
