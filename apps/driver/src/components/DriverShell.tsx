import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ParseKeys } from 'i18next'
import {
	ArrowLeft,
	ClipboardList,
	Languages,
	ListChecks,
	LogOut,
	MapPinned,
	MessageCircle,
	Moon,
	Navigation,
	PanelLeftOpen,
	Phone,
	Radio,
	Send,
	Sun,
	Truck,
	UsersRound,
	Warehouse,
} from 'lucide-react'
import { cubicBezier, motion, useReducedMotion } from 'motion/react'
import type { Key, ReactNode } from 'react'
import { lazy, Suspense, useMemo, useState } from 'react'
import {
	Button,
	Input,
	Label,
	Tab,
	TabList,
	TabPanel,
	Tabs,
	TextField,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { DriverAuthSession } from '../lib/auth'
import type {
	DeliveryStatus,
	DriverDelivery,
	DriverLanguage,
	DriverProfile,
	TeamMessage,
} from '../lib/driver-repository'
import { formatClock, formatNumber, localize } from '../lib/format'
import { locationProvider } from '../lib/location-provider'
import { driverRepository } from '../lib/mock-driver-repository'
import { useAuthStore } from '../stores/auth'
import { usePreferencesStore } from '../stores/preferences'
import { DriverOptionsMenu } from './DriverOptionsMenu'
import { SignaturePad } from './SignaturePad'

const DeliveryMap = lazy(() =>
	import('./DeliveryMap').then((module) => ({
		default: module.DeliveryMap,
	})),
)

type ShellPanel = 'fleet' | 'info' | null
type FleetTab = 'deliveries' | 'drivers' | 'chat'

const STATUS_KEYS: Record<DeliveryStatus, ParseKeys<'driver'>> = {
	accepted: 'status.accepted',
	arrived: 'status.arrived',
	available: 'status.available',
	completed: 'status.completed',
	in_transit: 'status.inTransit',
}

interface DriverShellProps {
	session: DriverAuthSession
}

export function DriverShell({ session }: DriverShellProps) {
	const { t } = useTranslation('driver')
	const queryClient = useQueryClient()
	const signOut = useAuthStore((state) => state.signOut)
	const language = usePreferencesStore((state) => state.language)
	const theme = usePreferencesStore((state) => state.theme)
	const toggleLanguage = usePreferencesStore((state) => state.toggleLanguage)
	const toggleTheme = usePreferencesStore((state) => state.toggleTheme)
	const [openPanel, setOpenPanel] = useState<ShellPanel>(null)
	const [fleetTab, setFleetTab] = useState<FleetTab>('deliveries')

	const dashboard = useQuery({
		queryKey: ['driver', 'dashboard', session.driverId],
		queryFn: () => driverRepository.getDashboard(session.driverId),
	})
	const deliveries = useQuery({
		queryKey: ['driver', 'deliveries'],
		queryFn: () => driverRepository.listDeliveries(),
	})
	const drivers = useQuery({
		queryKey: ['driver', 'drivers'],
		queryFn: () => driverRepository.listActiveDrivers(),
	})
	const messages = useQuery({
		queryKey: ['driver', 'messages'],
		queryFn: () => driverRepository.listTeamMessages(),
	})

	const invalidateDriverQueries = () => {
		queryClient.invalidateQueries({ queryKey: ['driver'] })
	}

	const acceptDelivery = useMutation({
		mutationFn: (deliveryId: string) =>
			driverRepository.acceptDelivery(deliveryId, session.driverId),
		onSuccess: invalidateDriverQueries,
	})
	const startDelivery = useMutation({
		mutationFn: (deliveryId: string) =>
			driverRepository.startDelivery(deliveryId, session.driverId),
		onSuccess: invalidateDriverQueries,
	})
	const recordArrival = useMutation({
		mutationFn: (deliveryId: string) =>
			driverRepository.recordArrival(deliveryId, session.driverId),
		onSuccess: invalidateDriverQueries,
	})
	const completeDelivery = useMutation({
		mutationFn: async ({
			deliveryId,
			signatureDataUrl,
			signerName,
		}: {
			deliveryId: string
			signatureDataUrl: string
			signerName: string
		}) => {
			const location = await locationProvider.getCurrentPosition()
			return driverRepository.completeDelivery(deliveryId, session.driverId, {
				capturedAt: new Date().toISOString(),
				location,
				signatureDataUrl,
				signerName,
			})
		},
		onSuccess: invalidateDriverQueries,
	})
	const sendMessage = useMutation({
		mutationFn: (body: string) =>
			driverRepository.sendTeamMessage(session.driverId, body),
		onSuccess: invalidateDriverQueries,
	})
	const refreshLocation = useMutation({
		mutationFn: async () => {
			const location = await locationProvider.getCurrentPosition()
			return driverRepository.updateLocation(session.driverId, location)
		},
		onSuccess: invalidateDriverQueries,
	})

	const currentDriver = dashboard.data?.currentDriver
	const activeDelivery = dashboard.data?.activeDelivery ?? null
	const nextDelivery = dashboard.data?.nextDelivery ?? null
	const mapDelivery = activeDelivery ?? nextDelivery
	const currentLocation = currentDriver?.location

	const assignedDriverById = useMemo(() => {
		const map = new Map<string, DriverProfile>()
		for (const driver of drivers.data ?? []) map.set(driver.id, driver)
		return map
	}, [drivers.data])

	if (dashboard.isPending || !currentDriver || !currentLocation) {
		return (
			<main className="grid min-h-dvh place-items-center bg-[var(--color-surface)] text-[var(--color-text)]">
				<div className="driver-loading-mark" role="status">
					<span className="sr-only">{t('state.loading')}</span>
				</div>
			</main>
		)
	}

	return (
		<main className="relative h-dvh overflow-hidden bg-[var(--color-map)] text-[var(--color-text)]">
			<Suspense
				fallback={<div className="driver-map-loading" aria-hidden="true" />}
			>
				<DeliveryMap currentLocation={currentLocation} delivery={mapDelivery} />
			</Suspense>

			<header
				className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5"
				dir="ltr"
			>
				<div className="pointer-events-auto min-w-0 border border-[var(--color-border)] bg-[var(--color-panel)]/94 px-3 py-2 shadow-[0_12px_40px_rgba(17,17,17,0.12)] backdrop-blur">
					<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-primary)]">
						{t('shell.driver')}
					</p>
					<p className="truncate font-[family-name:var(--font-archivo)] text-sm font-semibold">
						{localize(currentDriver.name, language)}
					</p>
					<p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
						{localize(currentDriver.vehicle, language)}
					</p>
				</div>
				<div className="pointer-events-auto">
					<DriverOptionsMenu
						label={t('controls.options')}
						options={[
							{
								icon: <MapPinned aria-hidden="true" size={16} />,
								isDisabled: refreshLocation.isPending,
								label: t('controls.refreshLocation'),
								onPress: () => refreshLocation.mutate(),
							},
							{
								icon: <Languages aria-hidden="true" size={16} />,
								label: t('controls.language'),
								onPress: toggleLanguage,
							},
							{
								icon:
									theme === 'light' ? (
										<Moon aria-hidden="true" size={16} />
									) : (
										<Sun aria-hidden="true" size={16} />
									),
								label: t('controls.theme'),
								onPress: toggleTheme,
							},
							{
								icon: <LogOut aria-hidden="true" size={16} />,
								label: t('controls.signOut'),
								onPress: signOut,
							},
						]}
					/>
				</div>
			</header>

			<section className="pointer-events-none absolute inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 px-3 sm:px-5">
				<div className="pointer-events-auto mx-auto w-full max-w-xl">
					<ActiveDeliveryFlow
						activeDelivery={activeDelivery}
						completeDelivery={(deliveryId, signerName, signatureDataUrl) =>
							completeDelivery.mutate({
								deliveryId,
								signatureDataUrl,
								signerName,
							})
						}
						isCompleting={completeDelivery.isPending}
						isMutating={
							acceptDelivery.isPending ||
							startDelivery.isPending ||
							recordArrival.isPending
						}
						language={language}
						nextDelivery={nextDelivery}
						onAccept={(deliveryId) => acceptDelivery.mutate(deliveryId)}
						onArrival={(deliveryId) => recordArrival.mutate(deliveryId)}
						onStart={(deliveryId) => startDelivery.mutate(deliveryId)}
					/>
				</div>
			</section>

			<CommandRail
				activePanel={openPanel}
				isHidden={openPanel === 'fleet' && fleetTab === 'chat'}
				onFleet={() => setOpenPanel(openPanel === 'fleet' ? null : 'fleet')}
				onInfo={() => setOpenPanel(openPanel === 'info' ? null : 'info')}
				onPrimary={() => setOpenPanel(null)}
			/>

			{openPanel === 'fleet' && (
				<FleetPanel
					assignedDriverById={assignedDriverById}
					currentDriverId={session.driverId}
					deliveries={deliveries.data ?? []}
					drivers={drivers.data ?? []}
					language={language}
					messages={messages.data ?? []}
					onSelectedTabChange={setFleetTab}
					onSendMessage={(body) => sendMessage.mutate(body)}
					selectedTab={fleetTab}
					sendMessagePending={sendMessage.isPending}
				/>
			)}

			{openPanel === 'info' && (
				<DeliveryInfoPanel delivery={activeDelivery} language={language} />
			)}
		</main>
	)
}

function ActiveDeliveryFlow({
	activeDelivery,
	completeDelivery,
	isCompleting,
	isMutating,
	language,
	nextDelivery,
	onAccept,
	onArrival,
	onStart,
}: {
	activeDelivery: DriverDelivery | null
	completeDelivery: (
		deliveryId: string,
		signerName: string,
		signatureDataUrl: string,
	) => void
	isCompleting: boolean
	isMutating: boolean
	language: DriverLanguage
	nextDelivery: DriverDelivery | null
	onAccept: (deliveryId: string) => void
	onArrival: (deliveryId: string) => void
	onStart: (deliveryId: string) => void
}) {
	const { t } = useTranslation('driver')
	const delivery = activeDelivery ?? nextDelivery

	if (!delivery) {
		return (
			<div className="border border-[var(--color-border)] bg-[var(--color-panel)]/96 p-4 shadow-[0_18px_60px_rgba(17,17,17,0.14)] backdrop-blur">
				<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-subtle)]">
					{t('active.noneEyebrow')}
				</p>
				<p className="mt-1 font-[family-name:var(--font-archivo)] text-lg font-semibold">
					{t('active.noneTitle')}
				</p>
			</div>
		)
	}

	return (
		<div className="border border-[var(--color-border)] bg-[var(--color-panel)]/96 p-4 shadow-[0_18px_60px_rgba(17,17,17,0.14)] backdrop-blur">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-primary)]">
						{activeDelivery ? t('active.current') : t('active.next')}
					</p>
					<h1 className="mt-1 truncate font-[family-name:var(--font-archivo)] text-xl font-bold">
						{localize(delivery.orderName, language)}
					</h1>
					<p className="mt-1 truncate text-sm text-[var(--color-text-muted)]">
						{localize(delivery.customer.name, language)}
					</p>
				</div>
				<StatusPill status={delivery.status} />
			</div>

			<div className="mt-4 grid grid-cols-2 gap-2 border-y border-[var(--color-border)] py-3">
				<Metric
					label={t('active.eta')}
					value={t('units.minutes', { count: delivery.etaMinutes })}
				/>
				<Metric
					label={t('active.window')}
					value={localize(delivery.scheduledWindow, language)}
				/>
			</div>

			{delivery.status === 'available' && (
				<ActionButton
					icon={<ListChecks aria-hidden="true" size={18} />}
					isDisabled={isMutating}
					label={t('active.accept')}
					onPress={() => onAccept(delivery.id)}
				/>
			)}
			{delivery.status === 'accepted' && (
				<ActionButton
					icon={<Navigation aria-hidden="true" size={18} />}
					isDisabled={isMutating}
					label={t('active.start')}
					onPress={() => onStart(delivery.id)}
				/>
			)}
			{delivery.status === 'in_transit' && (
				<ActionButton
					icon={<MapPinned aria-hidden="true" size={18} />}
					isDisabled={isMutating}
					label={t('active.arrival')}
					onPress={() => onArrival(delivery.id)}
				/>
			)}
			{delivery.status === 'arrived' && (
				<VerificationForm
					deliveryId={delivery.id}
					isCompleting={isCompleting}
					onComplete={completeDelivery}
				/>
			)}
			{delivery.status === 'completed' && (
				<p className="mt-4 border border-[#047857]/25 bg-[#047857]/10 px-3 py-2 text-sm font-semibold text-[#047857]">
					{t('active.completed')}
				</p>
			)}
		</div>
	)
}

function VerificationForm({
	deliveryId,
	isCompleting,
	onComplete,
}: {
	deliveryId: string
	isCompleting: boolean
	onComplete: (
		deliveryId: string,
		signerName: string,
		signatureDataUrl: string,
	) => void
}) {
	const { t } = useTranslation('driver')
	const [signerName, setSignerName] = useState('')
	const [signatureDataUrl, setSignatureDataUrl] = useState('')
	const [strokeCount, setStrokeCount] = useState(0)
	const canComplete = signerName.trim().length >= 2 && strokeCount > 0

	return (
		<div className="mt-4 space-y-3">
			<TextField>
				<Label className="mb-2 block font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-muted)]">
					{t('verification.signerName')}
				</Label>
				<Input
					value={signerName}
					onChange={(event) => setSignerName(event.target.value)}
					className="h-12 w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
				/>
			</TextField>
			<SignaturePad
				onSignatureChange={(nextSignature, nextStrokeCount) => {
					setSignatureDataUrl(nextSignature)
					setStrokeCount(nextStrokeCount)
				}}
			/>
			<Button
				isDisabled={!canComplete || isCompleting}
				onPress={() =>
					onComplete(deliveryId, signerName.trim(), signatureDataUrl)
				}
				className="driver-action-button flex h-12 w-full items-center justify-between border px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<span>{t('verification.complete')}</span>
				<ClipboardList aria-hidden="true" size={17} />
			</Button>
		</div>
	)
}

function FleetPanel({
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

function DeliveryInfoPanel({
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

function CommandRail({
	activePanel,
	isHidden,
	onFleet,
	onInfo,
	onPrimary,
}: {
	activePanel: ShellPanel
	isHidden: boolean
	onFleet: () => void
	onInfo: () => void
	onPrimary: () => void
}) {
	const { t } = useTranslation('driver')

	if (isHidden) return null

	return (
		<nav className="absolute inset-x-0 bottom-0 z-30 px-3 pb-[max(0.4rem,env(safe-area-inset-bottom))] sm:px-5">
			<div className="mx-auto grid h-12 max-w-[17rem] grid-cols-[1fr_1.2fr_1fr] items-center border border-[var(--color-border)] bg-[var(--color-panel)]/96 shadow-[0_18px_70px_rgba(17,17,17,0.18)] backdrop-blur">
				<RailButton
					icon={<PanelLeftOpen aria-hidden="true" size={19} />}
					isActive={activePanel === 'fleet'}
					label={t('rail.fleet')}
					onPress={onFleet}
				/>
				<RailButton
					icon={<Navigation aria-hidden="true" size={23} />}
					isActive={!activePanel}
					label={t('rail.active')}
					onPress={onPrimary}
					primary
				/>
				<RailButton
					icon={<ClipboardList aria-hidden="true" size={19} />}
					isActive={activePanel === 'info'}
					label={t('rail.info')}
					onPress={onInfo}
				/>
			</div>
		</nav>
	)
}

function PanelShell({
	children,
	reserveRail = true,
	title,
}: {
	children: ReactNode
	reserveRail?: boolean
	title: string
}) {
	const reduceMotion = useReducedMotion()
	const transition = reduceMotion
		? { duration: 0 }
		: { duration: 0.22, ease: cubicBezier(0.22, 1, 0.36, 1) }

	return (
		<motion.section
			className="driver-panel-shell absolute inset-0 z-20 flex flex-col bg-[var(--color-panel)] text-[var(--color-text)]"
			initial={{ opacity: 0, y: 18 }}
			animate={{ opacity: 1, y: 0 }}
			transition={transition}
		>
			<header className="driver-panel-header flex h-16 shrink-0 items-center justify-center border-b border-[var(--color-border)] px-4 pt-[env(safe-area-inset-top)] text-center">
				<h2 className="min-w-0 truncate font-[family-name:var(--font-archivo)] text-lg font-bold">
					{title}
				</h2>
			</header>
			<div
				className={`driver-panel-body min-h-0 flex-1 overflow-auto ${
					reserveRail
						? 'pb-[calc(4.25rem+env(safe-area-inset-bottom))]'
						: 'pb-[env(safe-area-inset-bottom)]'
				}`}
			>
				{children}
			</div>
		</motion.section>
	)
}

function DeliveryListRow({
	assignedDriver,
	delivery,
	isSelected,
	language,
	onView,
}: {
	assignedDriver: DriverProfile | null
	delivery: DriverDelivery
	isSelected: boolean
	language: DriverLanguage
	onView: (deliveryId: string) => void
}) {
	const { t } = useTranslation('driver')

	return (
		<article
			className={`driver-delivery-row border border-[var(--color-border)] bg-[var(--color-panel)] p-3 ${
				isSelected ? 'is-selected' : ''
			}`}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-subtle)]">
						{delivery.deliveryNumber}
					</p>
					<h3 className="mt-1 truncate text-base font-semibold">
						{localize(delivery.orderName, language)}
					</h3>
					<p className="mt-1 truncate text-sm text-[var(--color-text-muted)]">
						{localize(delivery.customer.name, language)}
					</p>
				</div>
				<StatusPill status={delivery.status} />
			</div>
			<div className="mt-4 flex items-center justify-between gap-3">
				<div className="min-w-0">
					<p className="font-[family-name:var(--font-plex-mono)] text-[9px] uppercase text-[var(--color-text-subtle)]">
						{t('fleet.assigned')}
					</p>
					<p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
						{assignedDriver
							? localize(assignedDriver.name, language)
							: t('fleet.unassigned')}
					</p>
				</div>
				<Button
					onPress={() => onView(delivery.id)}
					className="driver-secondary-button h-10 shrink-0 border px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
				>
					{t('fleet.view')}
				</Button>
			</div>
		</article>
	)
}

function DeliveryPassport({
	assignedDriver,
	className,
	delivery,
	language,
	onBack,
}: {
	assignedDriver: DriverProfile | null
	className?: string
	delivery: DriverDelivery | null
	language: DriverLanguage
	onBack?: () => void
}) {
	const { t } = useTranslation('driver')

	if (!delivery) {
		return (
			<section
				className={`min-w-0 px-3 py-5 text-sm text-[var(--color-text-muted)] ${className ?? ''}`}
			>
				{t('info.empty')}
			</section>
		)
	}

	return (
		<section className={`driver-delivery-passport min-w-0 ${className ?? ''}`}>
			{onBack && (
				<Button
					className="driver-control-button mb-3 inline-flex h-10 items-center gap-2 border px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 lg:hidden"
					onPress={onBack}
				>
					<ArrowLeft aria-hidden="true" size={15} />
					<span>{t('fleet.backToDeliveries')}</span>
				</Button>
			)}
			<div className="driver-passport-hero border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-primary)]">
							{delivery.deliveryNumber}
						</p>
						<h2 className="mt-2 font-[family-name:var(--font-archivo)] text-2xl font-black leading-none">
							{localize(delivery.orderName, language)}
						</h2>
					</div>
					<StatusPill status={delivery.status} />
				</div>
				<p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
					{localize(delivery.address.address, language)}
				</p>
				<div className="mt-4 grid grid-cols-3 gap-2 border-y border-[var(--color-border)] py-3">
					<Metric
						label={t('active.eta')}
						value={t('units.minutes', { count: delivery.etaMinutes })}
					/>
					<Metric
						label={t('active.window')}
						value={localize(delivery.scheduledWindow, language)}
					/>
					<Metric
						label={t('active.items')}
						value={formatNumber(delivery.items.length, language)}
					/>
				</div>
			</div>

			<div className="driver-route-vector mt-3 border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
				<div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
					<div className="grid h-10 w-10 place-items-center border border-[var(--color-border)] bg-[var(--color-panel)]">
						<Warehouse aria-hidden="true" size={18} />
					</div>
					<div className="h-px bg-[var(--color-border)]" />
					<div className="grid h-10 w-10 place-items-center border border-[var(--color-border)] bg-[var(--color-panel)]">
						<MapPinned aria-hidden="true" size={18} />
					</div>
				</div>
				<div className="mt-3 grid gap-3 sm:grid-cols-2">
					<RouteStop
						label={t('fleet.pickup')}
						title={localize(delivery.origin.label, language)}
						value={localize(delivery.origin.address, language)}
					/>
					<RouteStop
						label={t('fleet.dropoff')}
						title={localize(delivery.address.label, language)}
						value={localize(delivery.address.address, language)}
					/>
				</div>
			</div>

			<div className="mt-3 grid gap-3 lg:grid-cols-2">
				<ContactBlock
					contact={delivery.customer}
					language={language}
					title={t('info.customer')}
				/>
				<ContactBlock
					contact={delivery.warehouseContact}
					language={language}
					title={t('info.warehouse')}
				/>
			</div>

			<div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)]">
				<section className="border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
					<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-subtle)]">
						{t('info.items')}
					</p>
					<div className="mt-3 space-y-2">
						{delivery.items.map((item) => (
							<div
								key={item.id}
								className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
							>
								<span className="min-w-0 truncate font-semibold">
									{localize(item.name, language)}
								</span>
								<span className="shrink-0 text-xs text-[var(--color-text-muted)]">
									{localize(item.quantity, language)}
								</span>
							</div>
						))}
					</div>
				</section>
				<section className="border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
					<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-subtle)]">
						{t('fleet.assigned')}
					</p>
					<p className="mt-2 text-sm font-semibold">
						{assignedDriver
							? localize(assignedDriver.name, language)
							: t('fleet.unassigned')}
					</p>
					<p className="mt-3 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-subtle)]">
						{t('info.notes')}
					</p>
					<p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
						{localize(delivery.notes, language)}
					</p>
				</section>
			</div>
		</section>
	)
}

function RouteStop({
	label,
	title,
	value,
}: {
	label: string
	title: string
	value: string
}) {
	return (
		<div className="min-w-0">
			<p className="font-[family-name:var(--font-plex-mono)] text-[9px] uppercase text-[var(--color-text-subtle)]">
				{label}
			</p>
			<p className="mt-1 truncate text-sm font-semibold">{title}</p>
			<p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-text-muted)]">
				{value}
			</p>
		</div>
	)
}

function ContactBlock({
	contact,
	language,
	title,
}: {
	contact: DriverDelivery['customer']
	language: DriverLanguage
	title: string
}) {
	const { t } = useTranslation('driver')

	return (
		<section className="border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
			<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-subtle)]">
				{title}
			</p>
			<div className="mt-3 flex items-center justify-between gap-3">
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold">
						{localize(contact.name, language)}
					</p>
					<p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
						{localize(contact.role, language)}
					</p>
				</div>
				<a
					href={`tel:${contact.phone}`}
					className="driver-secondary-button grid h-10 w-10 shrink-0 place-items-center border outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
					aria-label={t('info.call')}
				>
					<Phone aria-hidden="true" size={17} />
				</a>
			</div>
		</section>
	)
}

function DriverCrewCard({
	driver,
	isCurrentDriver,
	language,
	onChat,
}: {
	driver: DriverProfile
	isCurrentDriver: boolean
	language: DriverLanguage
	onChat: (driver: DriverProfile) => void
}) {
	const { t } = useTranslation('driver')

	return (
		<article className="driver-crew-card border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-primary)]">
						{isCurrentDriver ? t('fleet.you') : t('fleet.driver')}
					</p>
					<h3 className="mt-2 truncate text-base font-bold">
						{localize(driver.name, language)}
					</h3>
					<p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
						{localize(driver.vehicle, language)}
					</p>
				</div>
				<DriverStatus status={driver.status} />
			</div>
			<div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-y border-[var(--color-border)] py-3">
				<div className="grid h-9 w-9 place-items-center border border-[var(--color-border)] bg-[var(--color-surface)]">
					<Truck aria-hidden="true" size={17} />
				</div>
				<div className="min-w-0">
					<p className="font-[family-name:var(--font-plex-mono)] text-[9px] uppercase text-[var(--color-text-subtle)]">
						{t('fleet.lastPing')}
					</p>
					<p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
						{formatClock(driver.location.recordedAt, language)}
					</p>
				</div>
			</div>
			<div className="mt-3 grid grid-cols-2 gap-2">
				<a
					href={`tel:${driver.phone}`}
					className="driver-secondary-button inline-flex h-10 items-center justify-center gap-2 border px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
				>
					<Phone aria-hidden="true" size={15} />
					<span>{t('info.call')}</span>
				</a>
				<Button
					isDisabled={isCurrentDriver}
					onPress={() => onChat(driver)}
					className="driver-secondary-button inline-flex h-10 items-center justify-center gap-2 border px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:cursor-not-allowed disabled:opacity-45"
				>
					<MessageCircle aria-hidden="true" size={15} />
					<span>
						{isCurrentDriver ? t('fleet.you') : t('fleet.chatDriver')}
					</span>
				</Button>
			</div>
		</article>
	)
}

function TeamChatPanel({
	currentDriverId,
	drivers,
	draftMessage,
	focusedDriver,
	language,
	messages,
	onBack,
	onClearFocus,
	onDraftChange,
	onMentionDriver,
	onSendMessage,
	sendMessagePending,
}: {
	currentDriverId: string
	drivers: DriverProfile[]
	draftMessage: string
	focusedDriver: DriverProfile | null
	language: DriverLanguage
	messages: TeamMessage[]
	onBack: () => void
	onClearFocus: () => void
	onDraftChange: (message: string) => void
	onMentionDriver: (driver: DriverProfile) => void
	onSendMessage: () => void
	sendMessagePending: boolean
}) {
	const { t } = useTranslation('driver')
	const mentionableDrivers = drivers.filter(
		(driver) => driver.id !== currentDriverId,
	)

	return (
		<div className="driver-chat-panel flex h-[calc(100dvh-8rem)] min-h-0 flex-col">
			<section className="driver-chat-header border-b border-[var(--color-border)] p-3 sm:p-4">
				<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
					<div className="min-w-0">
						<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-primary)]">
							{focusedDriver ? t('fleet.chatFocus') : t('fleet.chatLive')}
						</p>
						<h3 className="mt-1 truncate font-[family-name:var(--font-archivo)] text-xl font-black">
							{focusedDriver
								? localize(focusedDriver.name, language)
								: t('fleet.chatRoom')}
						</h3>
						<p className="mt-1 truncate text-sm text-[var(--color-text-muted)]">
							{focusedDriver
								? localize(focusedDriver.vehicle, language)
								: t('fleet.chatRoomNote')}
						</p>
					</div>
					<div className="driver-chat-vector" aria-hidden="true">
						<Radio size={17} />
						<span />
						<MessageCircle size={17} />
					</div>
				</div>
				{focusedDriver && (
					<div className="mt-3 flex items-center justify-between gap-3 border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
						<p className="min-w-0 truncate text-xs font-semibold text-[var(--color-text-muted)]">
							{t('fleet.directLane', {
								name: localize(focusedDriver.name, language),
							})}
						</p>
						<Button
							className="driver-secondary-button h-8 shrink-0 border px-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
							onPress={onClearFocus}
						>
							{t('fleet.clearFocus')}
						</Button>
					</div>
				)}
				<div className="mt-3 flex items-center gap-2 overflow-x-auto">
					<span className="shrink-0 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-subtle)]">
						{t('fleet.mentionPeople')}
					</span>
					{mentionableDrivers.map((driver) => (
						<Button
							key={driver.id}
							onPress={() => onMentionDriver(driver)}
							className="driver-secondary-button h-8 shrink-0 border px-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
						>
							@{localize(driver.name, language)}
						</Button>
					))}
				</div>
			</section>

			<div className="driver-chat-stream min-h-0 flex-1 space-y-3 overflow-auto p-3 sm:p-4">
				{messages.map((message) => {
					const isMine = message.authorDriverId === currentDriverId
					return (
						<article
							key={message.id}
							className={`driver-chat-message ${isMine ? 'is-mine' : ''}`}
						>
							<div className="max-w-[min(34rem,84%)] border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2">
								<div className="flex items-baseline justify-between gap-3">
									<p className="truncate text-xs font-bold">
										{localize(message.authorName, language)}
									</p>
									<time className="shrink-0 font-[family-name:var(--font-plex-mono)] text-[9px] text-[var(--color-text-subtle)]">
										{formatClock(message.createdAt, language)}
									</time>
								</div>
								<p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
									{localize(message.body, language)}
								</p>
							</div>
						</article>
					)
				})}
			</div>

			<div className="border-t border-[var(--color-border)] bg-[var(--color-panel)] p-2">
				<div className="grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2">
					<Button
						aria-label={t('fleet.backFromChat')}
						onPress={onBack}
						className="driver-control-button grid h-12 w-12 place-items-center border outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
					>
						<ArrowLeft aria-hidden="true" size={17} />
					</Button>
					<TextField>
						<Label className="sr-only">{t('fleet.messageLabel')}</Label>
						<Input
							value={draftMessage}
							onChange={(event) => onDraftChange(event.target.value)}
							onKeyDown={(event) => {
								if (
									event.key === 'Enter' &&
									!event.shiftKey &&
									!event.nativeEvent.isComposing
								) {
									event.preventDefault()
									onSendMessage()
								}
							}}
							placeholder={t('fleet.messagePlaceholder')}
							className="h-12 w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
						/>
					</TextField>
					<Button
						aria-label={t('fleet.send')}
						isDisabled={!draftMessage.trim() || sendMessagePending}
						onPress={onSendMessage}
						className="driver-action-button grid h-12 w-12 place-items-center border outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<Send aria-hidden="true" size={17} />
					</Button>
				</div>
			</div>
		</div>
	)
}

function StatusPill({ status }: { status: DeliveryStatus }) {
	const { t } = useTranslation('driver')
	return (
		<span className="shrink-0 border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-muted)]">
			{t(STATUS_KEYS[status])}
		</span>
	)
}

function DriverStatus({ status }: { status: DriverProfile['status'] }) {
	const { t } = useTranslation('driver')
	const key: ParseKeys<'driver'> =
		status === 'on_delivery'
			? 'drivers.onDelivery'
			: status === 'offline'
				? 'drivers.offline'
				: 'drivers.available'

	return (
		<span className="shrink-0 border border-[var(--color-border)] px-2 py-1 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-muted)]">
			{t(key)}
		</span>
	)
}

function Metric({ label, value }: { label: string; value: string }) {
	return (
		<div className="min-w-0">
			<p className="truncate font-[family-name:var(--font-plex-mono)] text-[9px] uppercase text-[var(--color-text-subtle)]">
				{label}
			</p>
			<p className="mt-1 truncate text-sm font-semibold">{value}</p>
		</div>
	)
}

function ActionButton({
	icon,
	isDisabled,
	label,
	onPress,
}: {
	icon: ReactNode
	isDisabled: boolean
	label: string
	onPress: () => void
}) {
	return (
		<Button
			isDisabled={isDisabled}
			onPress={onPress}
			className="driver-action-button mt-4 flex h-12 w-full items-center justify-between border px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:cursor-not-allowed disabled:opacity-50"
		>
			<span>{label}</span>
			{icon}
		</Button>
	)
}

function RailButton({
	icon,
	isActive,
	label,
	onPress,
	primary = false,
}: {
	icon: ReactNode
	isActive: boolean
	label: string
	onPress: () => void
	primary?: boolean
}) {
	return (
		<Button
			onPress={onPress}
			className={`flex h-full flex-col items-center justify-center gap-0 border-inline-end border-[var(--color-border)] text-[11px] font-semibold outline-none last:border-inline-end-0 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${
				isActive
					? 'driver-control-button'
					: 'bg-[var(--color-panel)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'
			} ${primary ? 'text-xs' : ''}`}
			aria-label={label}
		>
			{icon}
			<span className="sr-only">{label}</span>
		</Button>
	)
}

function DriverTab({
	icon,
	id,
	label,
}: {
	icon: ReactNode
	id: FleetTab
	label: string
}) {
	return (
		<Tab
			id={id}
			className="group relative flex h-16 cursor-pointer flex-col items-center justify-center gap-1 border-inline-end border-[var(--color-border)] bg-[var(--color-panel)] text-center text-xs font-semibold text-[var(--color-text-muted)] outline-none last:border-inline-end-0 hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] selected:bg-[var(--color-action-bg)] selected:text-[var(--color-action-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 sm:h-14 sm:text-sm"
		>
			<span className="grid h-6 w-6 place-items-center">{icon}</span>
			<span className="max-w-full truncate">{label}</span>
		</Tab>
	)
}
