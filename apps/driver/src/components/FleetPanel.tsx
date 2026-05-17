import { ClipboardList, MessageCircle, UsersRound } from 'lucide-react'
import type { Key } from 'react'
import { useState } from 'react'
import { TabList, TabPanel, Tabs } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type {
	DriverDelivery,
	DriverLanguage,
	DriverProfile,
	TeamMessage,
} from '../lib/driver-repository'
import { localize } from '../lib/format'
import { DeliveryListRow } from './DeliveryListRow'
import { DeliveryPassport } from './DeliveryPassport'
import { DriverCrewCard } from './DriverCrewCard'
import { DriverTab } from './DriverShellPrimitives'
import type { FleetTab } from './driver-shell-types'
import { PanelShell } from './PanelShell'
import { TeamChatPanel } from './TeamChatPanel'

export function FleetPanel({
	assignedDriverById,
	currentDriverId,
	deliveries,
	drivers,
	language,
	messages,
	onSelectedTabChange,
	onSendMessage,
	selectedTab,
	sendMessagePending,
}: {
	assignedDriverById: Map<string, DriverProfile>
	currentDriverId: string
	deliveries: DriverDelivery[]
	drivers: DriverProfile[]
	language: DriverLanguage
	messages: TeamMessage[]
	onSelectedTabChange: (tab: FleetTab) => void
	onSendMessage: (body: string) => void
	selectedTab: FleetTab
	sendMessagePending: boolean
}) {
	const { t } = useTranslation('driver')
	const [selectedDeliveryId, setSelectedDeliveryId] = useState('')
	const [showDeliveryDetail, setShowDeliveryDetail] = useState(false)
	const [focusedDriverId, setFocusedDriverId] = useState<string | null>(null)
	const [lastNonChatTab, setLastNonChatTab] =
		useState<Exclude<FleetTab, 'chat'>>('deliveries')
	const [draftMessage, setDraftMessage] = useState('')
	const selectedDelivery =
		deliveries.find((delivery) => delivery.id === selectedDeliveryId) ??
		deliveries[0] ??
		null
	const selectedDeliveryDriver = selectedDelivery?.driverId
		? (assignedDriverById.get(selectedDelivery.driverId) ?? null)
		: null
	const focusedDriver =
		drivers.find((driver) => driver.id === focusedDriverId) ?? null

	function mentionText(driver: DriverProfile) {
		return `@${localize(driver.name, language)} `
	}

	function handleMentionDriver(driver: DriverProfile) {
		const mention = mentionText(driver)
		setFocusedDriverId(driver.id)
		setDraftMessage((currentMessage) => {
			if (currentMessage.includes(mention.trim())) return currentMessage
			return `${mention}${currentMessage}`
		})
	}

	function handleTabChange(key: Key) {
		if (key === 'drivers') {
			setLastNonChatTab('drivers')
			onSelectedTabChange('drivers')
			return
		}
		if (key === 'chat') {
			onSelectedTabChange('chat')
			return
		}
		setLastNonChatTab('deliveries')
		onSelectedTabChange('deliveries')
	}

	function handleDeliveryView(deliveryId: string) {
		setSelectedDeliveryId(deliveryId)
		setShowDeliveryDetail(true)
	}

	function handleDriverChat(driver: DriverProfile) {
		handleMentionDriver(driver)
		setLastNonChatTab('drivers')
		onSelectedTabChange('chat')
	}

	function handleSendMessage() {
		const body = draftMessage.trim()
		if (!body) return
		onSendMessage(body)
		setDraftMessage('')
	}

	return (
		<PanelShell reserveRail={selectedTab !== 'chat'} title={t('fleet.title')}>
			<Tabs selectedKey={selectedTab} onSelectionChange={handleTabChange}>
				<TabList
					aria-label={t('fleet.tabsLabel')}
					className="driver-floor-tabs grid grid-cols-3 border-b border-[var(--color-border)]"
				>
					<DriverTab
						id="deliveries"
						icon={<ClipboardList aria-hidden="true" size={18} />}
						label={t('fleet.deliveries')}
					/>
					<DriverTab
						id="drivers"
						icon={<UsersRound aria-hidden="true" size={18} />}
						label={t('fleet.drivers')}
					/>
					<DriverTab
						id="chat"
						icon={<MessageCircle aria-hidden="true" size={18} />}
						label={t('fleet.chat')}
					/>
				</TabList>
				<TabPanel id="deliveries" className="outline-none">
					<div className="driver-floor-deliveries">
						<section
							className={`min-w-0 ${showDeliveryDetail ? 'hidden lg:block' : 'block'}`}
						>
							<div className="driver-floor-list">
								{deliveries.map((delivery) => (
									<DeliveryListRow
										assignedDriver={
											delivery.driverId
												? (assignedDriverById.get(delivery.driverId) ?? null)
												: null
										}
										delivery={delivery}
										isSelected={selectedDelivery?.id === delivery.id}
										key={delivery.id}
										language={language}
										onView={handleDeliveryView}
									/>
								))}
							</div>
						</section>
						<DeliveryPassport
							assignedDriver={selectedDeliveryDriver}
							className={showDeliveryDetail ? 'block' : 'hidden lg:block'}
							delivery={selectedDelivery}
							language={language}
							onBack={() => setShowDeliveryDetail(false)}
						/>
					</div>
				</TabPanel>
				<TabPanel id="drivers" className="outline-none">
					<div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
						{drivers.map((driver) => (
							<DriverCrewCard
								driver={driver}
								isCurrentDriver={driver.id === currentDriverId}
								key={driver.id}
								language={language}
								onChat={handleDriverChat}
							/>
						))}
					</div>
				</TabPanel>
				<TabPanel id="chat" className="outline-none">
					<TeamChatPanel
						currentDriverId={currentDriverId}
						drivers={drivers}
						draftMessage={draftMessage}
						focusedDriver={focusedDriver}
						language={language}
						messages={messages}
						onBack={() => onSelectedTabChange(lastNonChatTab)}
						onClearFocus={() => setFocusedDriverId(null)}
						onDraftChange={setDraftMessage}
						onMentionDriver={handleMentionDriver}
						onSendMessage={handleSendMessage}
						sendMessagePending={sendMessagePending}
					/>
				</TabPanel>
			</Tabs>
		</PanelShell>
	)
}
