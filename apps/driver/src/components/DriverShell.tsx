import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut, MapPinned, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { Button } from 'react-aria-components/Button'
import { useTranslation } from 'react-i18next'
import { type DriverAuthSession, signOutDriver } from '../lib/auth'
import {
	type DriverDelivery,
	type DriverProfile,
	DriverRepositoryError,
} from '../lib/driver-repository'
import { driverRepository } from '../lib/driver-repository-adapter'
import { locationProvider } from '../lib/location-provider'
import { useAuthStore } from '../stores/auth'
import { usePreferencesStore } from '../stores/preferences'
import { ActiveDeliveryFlow } from './ActiveDeliveryFlow'
import { CommandRail } from './CommandRail'
import { DeliveryInfoPanel } from './DeliveryInfoPanel'
import {
	DriverOptionsMenu,
	getDriverPreferenceOptions,
} from './DriverOptionsMenu'
import type { FleetTab, ShellPanel } from './driver-shell-types'
import { FleetPanel } from './FleetPanel'

const DeliveryMap = lazy(() =>
	import('./DeliveryMap').then((module) => ({
		default: module.DeliveryMap,
	})),
)

const DRIVER_LOCATION_SYNC_MS = 10_000
const DRIVER_QUERY_REFRESH_MS = 10_000

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
	const [isChromeCollapsed, setIsChromeCollapsed] = useState(false)
	const [recentOutcomeDelivery, setRecentOutcomeDelivery] =
		useState<DriverDelivery | null>(null)
	const autoOnlineAttemptedRef = useRef<string | null>(null)
	const locationSyncInFlightRef = useRef(false)

	const dashboard = useQuery({
		queryKey: ['driver', 'dashboard', session.driverId],
		queryFn: () => driverRepository.getDashboard(session.driverId),
		refetchInterval: DRIVER_QUERY_REFRESH_MS,
		refetchIntervalInBackground: true,
	})
	const deliveries = useQuery({
		queryKey: ['driver', 'deliveries'],
		queryFn: () => driverRepository.listDeliveries(),
		refetchInterval: DRIVER_QUERY_REFRESH_MS,
		refetchIntervalInBackground: true,
	})
	const drivers = useQuery({
		queryKey: ['driver', 'drivers'],
		queryFn: () => driverRepository.listActiveDrivers(),
		refetchInterval: DRIVER_QUERY_REFRESH_MS,
		refetchIntervalInBackground: true,
	})
	const messages = useQuery({
		queryKey: ['driver', 'messages'],
		queryFn: () => driverRepository.listTeamMessages(),
		refetchInterval: DRIVER_QUERY_REFRESH_MS,
		refetchIntervalInBackground: true,
	})

	const invalidateDriverQueries = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ['driver'] })
	}, [queryClient])

	async function handleSignOut() {
		await signOutDriver()
		signOut()
	}

	const acceptDelivery = useMutation({
		mutationFn: (deliveryId: string) =>
			driverRepository.acceptDelivery(deliveryId, session.driverId),
		onSuccess: () => {
			setRecentOutcomeDelivery(null)
			invalidateDriverQueries()
		},
	})
	const startDelivery = useMutation({
		mutationFn: (deliveryId: string) =>
			driverRepository.startDelivery(deliveryId, session.driverId),
		onSuccess: () => {
			setRecentOutcomeDelivery(null)
			invalidateDriverQueries()
		},
	})
	const confirmArrival = useMutation({
		mutationFn: ({
			deliveryId,
			secretCode,
		}: {
			deliveryId: string
			secretCode: string
		}) =>
			driverRepository.confirmArrival(deliveryId, session.driverId, secretCode),
		onSuccess: () => {
			setRecentOutcomeDelivery(null)
			invalidateDriverQueries()
		},
	})
	const reopenRoute = useMutation({
		mutationFn: (deliveryId: string) =>
			driverRepository.reopenRoute(deliveryId, session.driverId),
		onSuccess: () => {
			setRecentOutcomeDelivery(null)
			invalidateDriverQueries()
		},
	})
	const completeDelivery = useMutation({
		mutationFn: async ({
			deliveryId,
			secretCode,
		}: {
			deliveryId: string
			secretCode: string
		}) => {
			const location = await locationProvider.getCurrentPosition()
			return driverRepository.completeDelivery(deliveryId, session.driverId, {
				capturedAt: new Date().toISOString(),
				location,
				secretCode,
			})
		},
		onSuccess: (delivery) => {
			setRecentOutcomeDelivery(delivery)
			invalidateDriverQueries()
		},
	})
	const sendMessage = useMutation({
		mutationFn: (body: string) =>
			driverRepository.sendTeamMessage(session.driverId, body),
		onSuccess: invalidateDriverQueries,
	})
	const refreshLocation = useMutation({
		mutationFn: async () => {
			const location = await locationProvider.getCurrentPosition()
			const deliveryForLocation = activeDelivery ?? nextDelivery
			return driverRepository.updateLocation(
				session.driverId,
				location,
				deliveryForLocation?.id ?? null,
			)
		},
		onSuccess: invalidateDriverQueries,
	})
	const setOnline = useMutation({
		mutationFn: (online: boolean) =>
			driverRepository.setOnline(session.driverId, online),
		onSuccess: invalidateDriverQueries,
	})
	const rejectDelivery = useMutation({
		mutationFn: async ({
			deliveryId,
			evidenceText,
			reason,
		}: {
			deliveryId: string
			evidenceText: string
			reason: string
		}) => {
			const location = await locationProvider.getCurrentPosition()
			return driverRepository.rejectDelivery(
				deliveryId,
				session.driverId,
				reason,
				reason || evidenceText
					? {
							capturedAt: new Date().toISOString(),
							evidenceText,
							location,
							reason,
						}
					: null,
			)
		},
		onSuccess: (delivery) => {
			setRecentOutcomeDelivery(delivery)
			invalidateDriverQueries()
		},
	})

	const currentDriver = dashboard.data?.currentDriver
	const activeDelivery = dashboard.data?.activeDelivery ?? null
	const nextDelivery = dashboard.data?.nextDelivery ?? null
	const visibleActiveDelivery =
		activeDelivery ?? (nextDelivery ? null : recentOutcomeDelivery)
	const mapDelivery = activeDelivery ?? nextDelivery
	const currentLocation = currentDriver?.location ?? null
	const isOnline = currentDriver?.onlineStatus
		? currentDriver.onlineStatus === 'online'
		: currentDriver?.status !== 'offline'
	const currentDriverId = currentDriver?.id ?? null
	const activeDeliveryId = activeDelivery?.id ?? null
	const nextDeliveryId = nextDelivery?.id ?? null

	const assignedDriverById = useMemo(() => {
		const map = new Map<string, DriverProfile>()
		for (const driver of drivers.data ?? []) map.set(driver.id, driver)
		return map
	}, [drivers.data])

	const syncDriverLocation = useCallback(async () => {
		if (!currentDriverId || !isOnline || locationSyncInFlightRef.current) {
			return
		}

		locationSyncInFlightRef.current = true
		try {
			const location = await locationProvider.getCurrentPosition()
			await driverRepository.updateLocation(
				session.driverId,
				location,
				activeDeliveryId ?? nextDeliveryId,
			)
			invalidateDriverQueries()
		} catch {
			// Keep automatic GPS sync quiet; the manual refresh action still surfaces errors.
		} finally {
			locationSyncInFlightRef.current = false
		}
	}, [
		activeDeliveryId,
		currentDriverId,
		invalidateDriverQueries,
		isOnline,
		nextDeliveryId,
		session.driverId,
	])

	useEffect(() => {
		if (!recentOutcomeDelivery) return
		const activeIds = [activeDelivery?.id, nextDelivery?.id].filter(Boolean)
		if (activeIds.length > 0 && !activeIds.includes(recentOutcomeDelivery.id)) {
			setRecentOutcomeDelivery(null)
		}
	}, [activeDelivery, nextDelivery, recentOutcomeDelivery])

	useEffect(() => {
		if (!currentDriver || setOnline.isPending) return
		if (autoOnlineAttemptedRef.current === session.driverId) return
		autoOnlineAttemptedRef.current = session.driverId
		if (!isOnline) setOnline.mutate(true)
	}, [currentDriver, isOnline, session.driverId, setOnline])

	useEffect(() => {
		if (!currentDriverId || !isOnline) return

		void syncDriverLocation()
		const intervalId = window.setInterval(() => {
			void syncDriverLocation()
		}, DRIVER_LOCATION_SYNC_MS)

		return () => window.clearInterval(intervalId)
	}, [currentDriverId, isOnline, syncDriverLocation])

	const handleOnlineStatusPress = () => {
		if (isOnline) {
			refreshLocation.mutate()
			return
		}
		setOnline.mutate(true)
	}

	const handleToggleChrome = () => {
		if (openPanel || isChromeCollapsed) {
			setOpenPanel(null)
			setIsChromeCollapsed(false)
			return
		}

		setIsChromeCollapsed(true)
	}

	if (dashboard.isPending) {
		return (
			<main className="grid min-h-dvh place-items-center bg-[var(--color-surface)] text-[var(--color-text)]">
				<div className="driver-loading-mark" role="status">
					<span className="sr-only">{t('state.loading')}</span>
				</div>
			</main>
		)
	}

	if (dashboard.isError || !currentDriver) {
		return <DriverDashboardError onSignOut={() => void handleSignOut()} />
	}

	return (
		<main className="relative h-dvh overflow-hidden bg-[var(--color-map)] text-[var(--color-text)]">
			<Suspense
				fallback={<div className="driver-map-loading" aria-hidden="true" />}
			>
				<DeliveryMap currentLocation={currentLocation} delivery={mapDelivery} />
			</Suspense>

			<header
				className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-end gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5"
				dir="ltr"
			>
				<div className="pointer-events-auto ms-auto flex items-start gap-2">
					<Button
						aria-label={
							isOnline
								? t('controls.onlineRefresh')
								: t('controls.offlineRefresh')
						}
						isDisabled={refreshLocation.isPending || setOnline.isPending}
						onPress={handleOnlineStatusPress}
						className={[
							'group relative flex h-11 w-11 items-center justify-center border border-[var(--color-border)] bg-[var(--color-panel)]/94 text-[var(--color-text)] shadow-[0_12px_40px_rgba(17,17,17,0.12)] outline-none backdrop-blur transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:cursor-not-allowed disabled:opacity-60',
							isOnline
								? 'text-[#047857] hover:border-[#047857]/45'
								: 'text-[#B91C1C] hover:border-[#B91C1C]/45',
						].join(' ')}
					>
						{refreshLocation.isPending || setOnline.isPending ? (
							<RefreshCw
								aria-hidden="true"
								className="animate-spin"
								size={18}
							/>
						) : isOnline ? (
							<Wifi aria-hidden="true" size={18} />
						) : (
							<WifiOff aria-hidden="true" size={18} />
						)}
						<span
							aria-hidden="true"
							className={[
								'absolute end-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-[var(--color-panel)]',
								isOnline ? 'bg-[#047857]' : 'bg-[#B91C1C]',
							].join(' ')}
						/>
					</Button>
					<DriverOptionsMenu
						label={t('controls.options')}
						options={[
							{
								icon: <MapPinned aria-hidden="true" size={16} />,
								isDisabled: setOnline.isPending,
								label: isOnline
									? t('controls.goOffline')
									: t('controls.goOnline'),
								onPress: () => setOnline.mutate(!isOnline),
							},
							{
								icon: <MapPinned aria-hidden="true" size={16} />,
								isDisabled: refreshLocation.isPending || !isOnline,
								label: t('controls.refreshLocation'),
								onPress: () => refreshLocation.mutate(),
							},
							...getDriverPreferenceOptions({
								languageLabel: t('controls.language'),
								onToggleLanguage: toggleLanguage,
								onToggleTheme: toggleTheme,
								theme,
								themeLabel: t('controls.theme'),
							}),
							{
								icon: <LogOut aria-hidden="true" size={16} />,
								label: t('controls.signOut'),
								onPress: () => {
									void handleSignOut()
								},
							},
						]}
					/>
				</div>
			</header>

			{!isChromeCollapsed && (
				<section className="pointer-events-none absolute inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 px-3 sm:px-5">
					<div className="pointer-events-auto mx-auto w-full max-w-xl">
						<ActiveDeliveryFlow
							actionError={driverMutationError(
								acceptDelivery.error ??
									startDelivery.error ??
									confirmArrival.error ??
									reopenRoute.error ??
									refreshLocation.error ??
									setOnline.error,
							)}
							activeDelivery={visibleActiveDelivery}
							completeError={driverMutationError(completeDelivery.error)}
							completeDelivery={(deliveryId, secretCode) =>
								completeDelivery.mutate({ deliveryId, secretCode })
							}
							isCompleting={completeDelivery.isPending}
							isMutating={
								acceptDelivery.isPending ||
								startDelivery.isPending ||
								confirmArrival.isPending ||
								reopenRoute.isPending
							}
							isRejecting={rejectDelivery.isPending}
							language={language}
							nextDelivery={nextDelivery}
							onAccept={(deliveryId) => acceptDelivery.mutate(deliveryId)}
							onArrival={(deliveryId, secretCode) =>
								confirmArrival.mutate({ deliveryId, secretCode })
							}
							onBackToRoute={(deliveryId) => reopenRoute.mutate(deliveryId)}
							onReject={(deliveryId, reason, evidenceText) =>
								rejectDelivery.mutate({ deliveryId, evidenceText, reason })
							}
							onStart={(deliveryId) => startDelivery.mutate(deliveryId)}
							rejectError={driverMutationError(rejectDelivery.error)}
						/>
					</div>
				</section>
			)}

			<CommandRail
				activePanel={openPanel}
				isChromeCollapsed={isChromeCollapsed}
				isHidden={openPanel === 'fleet' && fleetTab === 'chat'}
				onFleet={() => {
					setIsChromeCollapsed(false)
					setOpenPanel(openPanel === 'fleet' ? null : 'fleet')
				}}
				onInfo={() => {
					setIsChromeCollapsed(false)
					setOpenPanel(openPanel === 'info' ? null : 'info')
				}}
				onToggleChrome={handleToggleChrome}
			/>

			{!isChromeCollapsed && openPanel === 'fleet' && (
				<FleetPanel
					assignedDriverById={assignedDriverById}
					currentDriverId={session.driverId}
					deliveries={deliveries.data ?? []}
					drivers={drivers.data ?? []}
					language={language}
					messages={messages.data ?? []}
					onSelectedTabChange={setFleetTab}
					onSendMessage={async (body) => {
						try {
							await sendMessage.mutateAsync(body)
							return true
						} catch {
							return false
						}
					}}
					selectedTab={fleetTab}
					sendMessageError={driverMutationError(sendMessage.error)}
					sendMessagePending={sendMessage.isPending}
				/>
			)}

			{!isChromeCollapsed && openPanel === 'info' && (
				<DeliveryInfoPanel delivery={mapDelivery} language={language} />
			)}
		</main>
	)
}

function DriverDashboardError({ onSignOut }: { onSignOut: () => void }) {
	const { t } = useTranslation('driver')

	return (
		<main className="grid min-h-dvh place-items-center bg-[var(--color-surface)] p-5 text-[var(--color-text)]">
			<section className="w-full max-w-sm border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[8px_8px_0_var(--color-auth-shadow)]">
				<p className="font-[family-name:var(--font-plex-mono)] text-[11px] uppercase text-[var(--color-primary)]">
					{t('state.dashboardErrorEyebrow')}
				</p>
				<h1 className="mt-3 font-[family-name:var(--font-archivo)] text-2xl font-black leading-tight">
					{t('state.dashboardErrorTitle')}
				</h1>
				<p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
					{t('state.dashboardErrorBody')}
				</p>
				<Button
					className="driver-action-button mt-5 flex h-11 w-full items-center justify-center border px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
					onPress={onSignOut}
				>
					{t('controls.signOut')}
				</Button>
			</section>
		</main>
	)
}

function driverMutationError(error: unknown): string | null {
	if (!error) return null
	if (error instanceof DriverRepositoryError) return error.message
	if (error instanceof Error) return error.message
	return 'Driver action could not be completed.'
}
