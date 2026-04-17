import { createRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LoadPlan } from '@/components/loading/LoadPlan'
import { LoadSignOff } from '@/components/loading/LoadSignOff'
import { WeightEntry } from '@/components/loading/WeightEntry'
import { DriverButton } from '@/components/shared/DriverButton'
import { DriverCard } from '@/components/shared/DriverCard'
import { capturePhoto } from '@/lib/camera'
import { db } from '@/lib/powersync'
import { useAuthStore } from '@/stores/auth'
import { type LoadItem, useLoadingStore } from '@/stores/loading'
import { Route as rootRoute } from './__root'

function LoadingPage() {
	const { t } = useTranslation('driver')
	const navigate = useNavigate()

	const initLoading = useLoadingStore((s) => s.initLoading)
	const items = useLoadingStore((s) => s.items)
	const totalExpected = useLoadingStore((s) => s.totalExpected)
	const totalScanned = useLoadingStore((s) => s.totalScanned)
	const truckPhotoUri = useLoadingStore((s) => s.truckPhotoUri)
	const cargoPhotoUri = useLoadingStore((s) => s.cargoPhotoUri)
	const setTruckPhoto = useLoadingStore((s) => s.setTruckPhoto)
	const setCargoPhoto = useLoadingStore((s) => s.setCargoPhoto)
	const weightActual = useLoadingStore((s) => s.weightActual)
	const signatureUrl = useLoadingStore((s) => s.signatureUrl)

	const driverProfile = useAuthStore((s) => s.driverProfile)
	const [isLoading, setIsLoading] = useState(true)
	const [isTruckPhotoLoading, setIsTruckPhotoLoading] = useState(false)
	const [isCargoPhotoLoading, setIsCargoPhotoLoading] = useState(false)

	// Load route items from PowerSync
	useEffect(() => {
		const driverId = driverProfile?.id
		if (!driverId) return
		let cancelled = false

		async function loadItems() {
			try {
				const today = new Date().toISOString().split('T')[0]
				const routes = await db.getAll<{ id: string }>(
					"SELECT id FROM routes WHERE driver_id = ? AND date = ? AND status != 'completed' LIMIT 1",
					[driverId, today],
				)
				if (cancelled || routes.length === 0) {
					setIsLoading(false)
					return
				}

				const routeId = routes[0].id
				const routeItems = await db.getAll<{
					id: string
					product_name: string
					barcode: string | null
					quantity: number
					stop_name: string
					stop_order: number
					unit: string
				}>(
					`SELECT di.id, di.product_name, di.barcode, di.quantity, d.customer_name as stop_name, d.stop_order, di.unit
           FROM delivery_items di
           JOIN deliveries d ON d.id = di.delivery_id
           WHERE d.route_id = ?
           ORDER BY d.stop_order DESC, di.product_name ASC`,
					[routeId],
				)

				if (cancelled) return

				const loadItems: LoadItem[] = routeItems.map((ri) => ({
					id: ri.id,
					productName: ri.product_name,
					barcode: ri.barcode,
					quantityExpected: ri.quantity,
					checked: false,
				}))

				initLoading(routeId, loadItems)
			} catch {
				// Offline or no data yet
			} finally {
				if (!cancelled) setIsLoading(false)
			}
		}

		loadItems()
		return () => {
			cancelled = true
		}
	}, [driverProfile?.id, initLoading])

	async function handleTruckPhoto() {
		setIsTruckPhotoLoading(true)
		try {
			const uri = await capturePhoto()
			if (uri) setTruckPhoto(uri)
		} catch {
			// Camera error
		} finally {
			setIsTruckPhotoLoading(false)
		}
	}

	async function handleCargoPhoto() {
		setIsCargoPhotoLoading(true)
		try {
			const uri = await capturePhoto()
			if (uri) setCargoPhoto(uri)
		} catch {
			// Camera error
		} finally {
			setIsCargoPhotoLoading(false)
		}
	}

	// Progress indicators
	const photosComplete = (truckPhotoUri ? 1 : 0) + (cargoPhotoUri ? 1 : 0)
	const weightDone = weightActual !== null
	const signatureDone = !!signatureUrl

	if (isLoading) {
		return (
			<div className="flex min-h-dvh items-center justify-center">
				<span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-blue)] border-t-transparent" />
			</div>
		)
	}

	return (
		<div className="flex min-h-dvh flex-col bg-[var(--bg-primary)]">
			{/* Header */}
			<div className="flex items-center justify-between px-4 pt-[var(--safe-top)] pb-2">
				<button
					type="button"
					onClick={() => navigate({ to: '/home' })}
					className="text-sm text-[var(--color-blue)] font-medium"
				>
					{t('common.back', 'Back')}
				</button>
				<h1 className="text-lg font-bold">
					{t('loading.title', 'Loading Verification')}
				</h1>
				<div className="w-12" /> {/* Spacer for centering */}
			</div>

			{/* Progress indicator */}
			<div className="mx-4 mb-4 rounded-xl bg-[var(--color-blue)]/5 p-3">
				<div className="grid grid-cols-4 gap-2 text-center">
					<ProgressItem
						label={t('loading.items', 'Items')}
						value={`${totalScanned}/${totalExpected}`}
						done={totalExpected > 0 && totalScanned === totalExpected}
					/>
					<ProgressItem
						label={t('loading.photos', 'Photos')}
						value={`${photosComplete}/2`}
						done={photosComplete === 2}
					/>
					<ProgressItem
						label={t('loading.weight', 'Weight')}
						value={weightDone ? '1/1' : '0/1'}
						done={weightDone}
					/>
					<ProgressItem
						label={t('loading.sig', 'Sig')}
						value={signatureDone ? '1/1' : '0/1'}
						done={signatureDone}
					/>
				</div>
			</div>

			{/* Scrollable content */}
			<div className="flex-1 overflow-y-auto px-4 pb-[var(--safe-bottom)] space-y-4">
				{/* Section A: Load Plan */}
				<LoadPlan items={items.map((item) => ({ ...item }))} />

				{/* Section B: Photos */}
				<DriverCard
					header={
						<span className="font-medium">{t('loading.photos', 'Photos')}</span>
					}
				>
					<div className="space-y-3">
						{/* Truck photo */}
						<div>
							<span className="text-sm font-medium">
								{t('loading.truckPhoto', 'Loaded truck (wide shot)')}
								<span className="text-[var(--color-danger)]"> *</span>
							</span>
							{truckPhotoUri ? (
								<div className="mt-2 relative">
									<img
										src={truckPhotoUri}
										alt={t('loading.truckPhoto', 'Loaded truck')}
										className="w-full h-48 rounded-xl object-cover"
									/>
									<button
										type="button"
										onClick={handleTruckPhoto}
										className="absolute bottom-2 end-2 rounded-lg bg-black/50 px-3 py-1 text-xs text-white"
									>
										{t('shift.inspection.retakePhoto', 'Retake')}
									</button>
								</div>
							) : (
								<DriverButton
									variant="secondary"
									onPress={handleTruckPhoto}
									isLoading={isTruckPhotoLoading}
									className="mt-2"
								>
									{t('loading.takePhoto', 'Take Photo')}
								</DriverButton>
							)}
							{!truckPhotoUri && (
								<p className="mt-1 text-xs text-[var(--color-danger)]">
									{t('loading.photoRequired', 'Required')}
								</p>
							)}
						</div>

						{/* Cargo securement photo */}
						<div>
							<span className="text-sm font-medium">
								{t('loading.cargoPhoto', 'Cargo securement (straps/chains)')}
								<span className="text-[var(--color-danger)]"> *</span>
							</span>
							{cargoPhotoUri ? (
								<div className="mt-2 relative">
									<img
										src={cargoPhotoUri}
										alt={t('loading.cargoPhoto', 'Cargo securement')}
										className="w-full h-48 rounded-xl object-cover"
									/>
									<button
										type="button"
										onClick={handleCargoPhoto}
										className="absolute bottom-2 end-2 rounded-lg bg-black/50 px-3 py-1 text-xs text-white"
									>
										{t('shift.inspection.retakePhoto', 'Retake')}
									</button>
								</div>
							) : (
								<DriverButton
									variant="secondary"
									onPress={handleCargoPhoto}
									isLoading={isCargoPhotoLoading}
									className="mt-2"
								>
									{t('loading.takePhoto', 'Take Photo')}
								</DriverButton>
							)}
							{!cargoPhotoUri && (
								<p className="mt-1 text-xs text-[var(--color-danger)]">
									{t('loading.photoRequired', 'Required')}
								</p>
							)}
						</div>
					</div>
				</DriverCard>

				{/* Section C: Weight Entry */}
				<WeightEntry />

				{/* Section D: Sign Off */}
				<LoadSignOff />
			</div>
		</div>
	)
}

// --- ProgressItem ---

function ProgressItem({
	label,
	value,
	done,
}: {
	label: string
	value: string
	done: boolean
}) {
	return (
		<div>
			<span
				className={`font-mono text-sm font-bold ${done ? 'text-green-600' : 'text-[var(--text-primary)]'}`}
			>
				{value}
			</span>
			<p className="text-[10px] text-[var(--text-secondary)]">{label}</p>
		</div>
	)
}

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: '/loading',
	component: LoadingPage,
})
