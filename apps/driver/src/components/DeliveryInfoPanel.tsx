import { useTranslation } from 'react-i18next'
import type { DriverDelivery, DriverLanguage } from '../lib/driver-repository'
import { DeliveryPassport } from './DeliveryPassport'
import { PanelShell } from './PanelShell'

export function DeliveryInfoPanel({
	delivery,
	language,
}: {
	delivery: DriverDelivery | null
	language: DriverLanguage
}) {
	const { t } = useTranslation('driver')

	return (
		<PanelShell title={t('info.title')}>
			<DeliveryPassport
				assignedDriver={null}
				className="block p-3 sm:p-4"
				delivery={delivery}
				language={language}
			/>
		</PanelShell>
	)
}
