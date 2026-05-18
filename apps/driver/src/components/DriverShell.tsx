import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut, MapPinned } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type DriverAuthSession, signOutDriver } from '../lib/auth'
import type { DriverProfile } from '../lib/driver-repository'
import { localize } from '../lib/format'
import { locationProvider } from '../lib/location-provider'
import { driverRepository } from '../lib/mock-driver-repository'
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

	async function handleSignOut() {
		await signOutDriver()
		signOut()
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
