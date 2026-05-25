import jsQR from 'jsqr'
import {
	ArrowLeft,
	ClipboardList,
	Navigation,
	OctagonX,
	QrCode,
	ScanLine,
} from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { Input } from 'react-aria-components/Input'
import { Label } from 'react-aria-components/Label'
import { TextField } from 'react-aria-components/TextField'
import { useTranslation } from 'react-i18next'
import {
	extractDeliverySecretCode,
	isDeliverySecretCodeReady,
} from '../lib/delivery-secret'
import type { DriverDelivery, DriverLanguage } from '../lib/driver-repository'
import { localize } from '../lib/format'
import { ActionButton, StatusPill } from './DriverShellPrimitives'

interface ActiveDeliveryFlowProps {
	activeDelivery: DriverDelivery | null
	actionError?: string | null
	completeDelivery: (deliveryId: string, secretCode: string) => void
	completeError?: string | null
	completionStage: 'idle' | 'verifying' | 'location' | 'completing'
	isCompleting: boolean
	isMutating: boolean
	isRejecting: boolean
	language: DriverLanguage
	nextDelivery: DriverDelivery | null
	onAccept: (deliveryId: string) => void
	onReject: (deliveryId: string, reason: string, evidenceText: string) => void
	onStart: (deliveryId: string) => void
	rejectError?: string | null
}

export function ActiveDeliveryFlow({
	activeDelivery,
	actionError,
	completeDelivery,
	completeError,
	completionStage,
	isCompleting,
	isMutating,
	isRejecting,
	language,
	nextDelivery,
	onAccept,
	onReject,
	onStart,
	rejectError,
}: ActiveDeliveryFlowProps) {
	const { t } = useTranslation('driver')
	const delivery = activeDelivery ?? nextDelivery

	if (!delivery) {
		return (
			<div className="border border-[var(--color-border)] bg-[var(--color-panel)]/96 p-3 shadow-[0_14px_44px_rgba(17,17,17,0.14)] backdrop-blur sm:p-4">
				<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-subtle)]">
					{t('active.noneEyebrow')}
				</p>
				<p className="mt-1 font-[family-name:var(--font-archivo)] text-base font-semibold leading-snug sm:text-lg">
					{t('active.noneTitle')}
				</p>
			</div>
		)
	}

	return (
		<div className="max-h-[min(50dvh,24rem)] overflow-auto border border-[var(--color-border)] bg-[var(--color-panel)]/96 p-2.5 shadow-[0_14px_44px_rgba(17,17,17,0.14)] backdrop-blur sm:p-3">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-primary)]">
						{activeDelivery ? t('active.current') : t('active.next')}
					</p>
					<h1 className="mt-0.5 truncate font-[family-name:var(--font-archivo)] text-base font-bold leading-tight sm:text-lg">
						{localize(delivery.orderName, language)}
					</h1>
					<p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)] sm:text-sm">
						{localize(delivery.customer.name, language)}
					</p>
				</div>
				<StatusPill status={delivery.status} />
			</div>

			{delivery.status === 'available' && (
				<ActionButton
					icon={<Navigation aria-hidden="true" size={18} />}
					isDisabled={isMutating}
					label={t('active.start')}
					onPress={() => onAccept(delivery.id)}
				/>
			)}
			{(delivery.status === 'assigned' || delivery.status === 'accepted') && (
				<ActionButton
					icon={<Navigation aria-hidden="true" size={18} />}
					isDisabled={isMutating}
					label={t('active.start')}
					onPress={() => onStart(delivery.id)}
				/>
			)}
			{actionError && (
				<p
					role="alert"
					className="mt-2 text-xs font-semibold text-[#B91C1C] sm:text-sm"
				>
					{actionError}
				</p>
			)}
			{(delivery.status === 'in_transit' || delivery.status === 'arrived') && (
				<CompletionVerificationForm
					allowReject={delivery.status === 'in_transit'}
					deliveryId={delivery.id}
					errorMessage={completeError}
					completionStage={completionStage}
					isCompleting={isCompleting}
					isMutating={isMutating}
					isRejecting={isRejecting}
					key={delivery.id}
					onComplete={completeDelivery}
					onReject={onReject}
					rejectError={rejectError}
				/>
			)}
			{['assigned', 'accepted'].includes(delivery.status) && (
				<RejectionForm
					deliveryId={delivery.id}
					errorMessage={rejectError}
					isRejecting={isRejecting}
					onReject={onReject}
				/>
			)}
			{delivery.status === 'completed' && (
				<p className="mt-3 border border-[#047857]/25 bg-[#047857]/10 px-3 py-2 text-sm font-semibold text-[#047857]">
					{t('active.completed')}
				</p>
			)}
			{delivery.status === 'rejected' && (
				<p className="mt-3 border border-[#B91C1C]/25 bg-[#B91C1C]/10 px-3 py-2 text-sm font-semibold text-[#B91C1C]">
					{t('active.rejected')}
				</p>
			)}
		</div>
	)
}

interface BarcodeDetectorResult {
	rawValue?: string
}

interface BarcodeDetectorInstance {
	detect(source: HTMLVideoElement): Promise<BarcodeDetectorResult[]>
}

interface BarcodeDetectorConstructor {
	new (options?: { formats?: string[] }): BarcodeDetectorInstance
}

const QR_SCAN_WIDTH = 640

function getBarcodeDetector(): BarcodeDetectorConstructor | null {
	const browserGlobal = globalThis as typeof globalThis & {
		BarcodeDetector?: BarcodeDetectorConstructor
	}
	return browserGlobal.BarcodeDetector ?? null
}

function canUseCameraScanner(): boolean {
	return (
		typeof navigator !== 'undefined' &&
		Boolean(navigator.mediaDevices?.getUserMedia)
	)
}

function decodeQrFromVideo(
	video: HTMLVideoElement,
	canvas: HTMLCanvasElement,
): string | null {
	if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null
	if (video.videoWidth <= 0 || video.videoHeight <= 0) return null

	const scale = Math.min(1, QR_SCAN_WIDTH / video.videoWidth)
	const width = Math.max(1, Math.round(video.videoWidth * scale))
	const height = Math.max(1, Math.round(video.videoHeight * scale))
	canvas.width = width
	canvas.height = height

	const context = canvas.getContext('2d', {
		willReadFrequently: true,
	})
	if (!context) return null

	context.drawImage(video, 0, 0, width, height)
	const image = context.getImageData(0, 0, width, height)
	const result = jsQR(image.data, image.width, image.height, {
		inversionAttempts: 'attemptBoth',
	})
	return result?.data ?? null
}

function QrSecretScanner({
	isDisabled,
	onSecretScanned,
}: {
	isDisabled: boolean
	onSecretScanned: (secretCode: string) => void
}) {
	const { t } = useTranslation('driver')
	const [scannerActive, setScannerActive] = useState(false)
	const [scannerError, setScannerError] = useState<string | null>(null)
	const streamRef = useRef<MediaStream | null>(null)
	const frameRef = useRef<number | null>(null)
	const videoRef = useRef<HTMLVideoElement | null>(null)
	const scannerSupported = canUseCameraScanner()

	useEffect(() => {
		if (!scannerActive) return
		if (!navigator.mediaDevices?.getUserMedia) {
			setScannerError(t('arrival.scannerUnavailable'))
			setScannerActive(false)
			return
		}

		let canceled = false
		const canvas = document.createElement('canvas')
		const Detector = getBarcodeDetector()
		const detector = Detector ? new Detector({ formats: ['qr_code'] }) : null

		const stopScanner = () => {
			if (frameRef.current !== null) {
				cancelAnimationFrame(frameRef.current)
				frameRef.current = null
			}
			for (const track of streamRef.current?.getTracks() ?? []) {
				track.stop()
			}
			streamRef.current = null
			if (videoRef.current) videoRef.current.srcObject = null
		}

		const commitScan = (rawValue: string): boolean => {
			const code = extractDeliverySecretCode(rawValue)
			if (!code) {
				setScannerError(t('arrival.scannerInvalid'))
				return false
			}
			onSecretScanned(code)
			setScannerError(null)
			setScannerActive(false)
			stopScanner()
			return true
		}

		const scanFrame = async () => {
			const video = videoRef.current
			if (canceled || !video) return
			if (detector) {
				try {
					const results = await detector.detect(video)
					const value = results.find((result) => result.rawValue)?.rawValue
					if (value && commitScan(value)) return
				} catch {
					// Some WebViews expose BarcodeDetector but fail at runtime.
					// Keep scanning through the canvas decoder below.
				}
			}

			try {
				const canvasValue = decodeQrFromVideo(video, canvas)
				if (canvasValue && commitScan(canvasValue)) return
			} catch {
				setScannerError(t('arrival.scannerError'))
			}
			frameRef.current = requestAnimationFrame(scanFrame)
		}

		const startScanner = async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: false,
					video: { facingMode: { ideal: 'environment' } },
				})
				if (canceled) {
					for (const track of stream.getTracks()) {
						track.stop()
					}
					return
				}
				streamRef.current = stream
				if (videoRef.current) {
					videoRef.current.srcObject = stream
					await videoRef.current.play()
					frameRef.current = requestAnimationFrame(scanFrame)
				}
			} catch {
				setScannerError(t('arrival.scannerError'))
				setScannerActive(false)
			}
		}

		void startScanner()

		return () => {
			canceled = true
			stopScanner()
		}
	}, [onSecretScanned, scannerActive, t])

	if (!scannerSupported) return null

	return (
		<>
			<Button
				type="button"
				isDisabled={isDisabled}
				onPress={() => {
					setScannerError(null)
					setScannerActive((active) => !active)
				}}
				className="flex h-10 w-full items-center justify-between border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11"
			>
				<span>
					{scannerActive ? t('arrival.stopScan') : t('arrival.scanQr')}
				</span>
				{scannerActive ? (
					<QrCode aria-hidden="true" size={17} />
				) : (
					<ScanLine aria-hidden="true" size={17} />
				)}
			</Button>

			{scannerActive && (
				<div className="overflow-hidden border border-[var(--color-border)] bg-black">
					<video
						ref={videoRef}
						muted
						playsInline
						className="aspect-video w-full object-cover"
					/>
					<p className="bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]">
						{t('arrival.scanning')}
					</p>
				</div>
			)}

			{scannerError && (
				<p className="text-xs font-semibold text-[#B91C1C] sm:text-sm">
					{scannerError}
				</p>
			)}
		</>
	)
}

function CompletionVerificationForm({
	allowReject,
	deliveryId,
	errorMessage,
	completionStage,
	isCompleting,
	isMutating,
	isRejecting,
	onComplete,
	onReject,
	rejectError,
}: {
	allowReject: boolean
	deliveryId: string
	errorMessage?: string | null
	completionStage: 'idle' | 'verifying' | 'location' | 'completing'
	isCompleting: boolean
	isMutating: boolean
	isRejecting: boolean
	onComplete: (deliveryId: string, secretCode: string) => void
	onReject: (deliveryId: string, reason: string, evidenceText: string) => void
	rejectError?: string | null
}) {
	const { t } = useTranslation('driver')
	const [mode, setMode] = useState<'secret' | 'reject'>('secret')
	const [secretCode, setSecretCode] = useState('')
	const [submitted, setSubmitted] = useState(false)
	const isSubmitting = (submitted || isCompleting) && !errorMessage
	const statusMessage =
		completionStage === 'verifying'
			? t('verification.verifying')
			: completionStage === 'location'
				? t('verification.location')
				: t('verification.completing')
	const canSubmit =
		isDeliverySecretCodeReady(secretCode) && !isSubmitting && !isMutating

	useEffect(() => {
		if (errorMessage) setSubmitted(false)
	}, [errorMessage])

	const submitSecret = useCallback(
		(value: string) => {
			if (isSubmitting || isMutating) return
			const code = extractDeliverySecretCode(value)
			if (!code) return
			setSubmitted(true)
			setMode('secret')
			onComplete(deliveryId, code)
		},
		[deliveryId, isMutating, isSubmitting, onComplete],
	)

	if (isSubmitting) {
		return (
			<div className="mt-3 border border-[#047857]/25 bg-[#047857]/10 px-3 py-2 text-sm font-semibold text-[#047857]">
				<p role="status">{statusMessage}</p>
			</div>
		)
	}

	if (allowReject && mode === 'reject') {
		return (
			<div className="mt-2">
				<RejectionFields
					deliveryId={deliveryId}
					errorMessage={rejectError}
					isRejecting={isRejecting}
					onCancel={() => setMode('secret')}
					onReject={onReject}
				/>
			</div>
		)
	}

	return (
		<form
			className="mt-2 space-y-2 sm:space-y-3"
			onSubmit={(event: FormEvent<HTMLFormElement>) => {
				event.preventDefault()
				submitSecret(secretCode)
			}}
		>
			<TextField>
				<Label className="mb-1.5 block font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-muted)]">
					{t('arrival.secretCode')}
				</Label>
				<Input
					value={secretCode}
					inputMode="text"
					autoComplete="one-time-code"
					autoCapitalize="characters"
					placeholder={t('arrival.secretPlaceholder')}
					onChange={(event) => setSecretCode(event.target.value.toUpperCase())}
					className="h-10 w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 sm:h-12 sm:text-base"
				/>
			</TextField>

			<QrSecretScanner
				isDisabled={isSubmitting || isMutating}
				onSecretScanned={submitSecret}
			/>

			<div
				className={[
					'grid gap-2',
					allowReject ? 'grid-cols-[minmax(0,1fr)_3rem]' : '',
				].join(' ')}
			>
				<Button
					type="submit"
					isDisabled={!canSubmit}
					className="driver-action-button flex h-10 w-full items-center justify-between border px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11"
				>
					<span>{t('verification.complete')}</span>
					<ClipboardList aria-hidden="true" size={17} />
				</Button>
				{allowReject && (
					<Button
						type="button"
						aria-label={t('rejection.submit')}
						isDisabled={isRejecting}
						onPress={() => setMode('reject')}
						className="grid h-10 w-12 place-items-center border border-[#B91C1C]/35 bg-[#B91C1C]/8 text-[#B91C1C] outline-none focus-visible:ring-2 focus-visible:ring-[#B91C1C]/30 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11"
					>
						<OctagonX aria-hidden="true" size={18} />
					</Button>
				)}
			</div>
			{errorMessage && (
				<p
					role="alert"
					className="text-xs font-semibold text-[#B91C1C] sm:text-sm"
				>
					{errorMessage}
				</p>
			)}
		</form>
	)
}

function RejectionFields({
	deliveryId,
	errorMessage,
	isRejecting,
	onCancel,
	onReject,
}: {
	deliveryId: string
	errorMessage?: string | null
	isRejecting: boolean
	onCancel?: () => void
	onReject: (deliveryId: string, reason: string, evidenceText: string) => void
}) {
	const { t } = useTranslation('driver')
	const [reason, setReason] = useState('')
	const [evidenceText, setEvidenceText] = useState('')
	const canReject = reason.trim().length >= 3 && evidenceText.trim().length >= 3

	return (
		<>
			<div className="grid gap-2 sm:grid-cols-2">
				<TextField>
					<Label className="mb-1.5 block font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-muted)]">
						{t('rejection.reason')}
					</Label>
					<Input
						value={reason}
						onChange={(event) => setReason(event.target.value)}
						className="h-10 w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 sm:h-11"
					/>
				</TextField>
				<TextField>
					<Label className="mb-1.5 block font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-muted)]">
						{t('rejection.evidence')}
					</Label>
					<Input
						value={evidenceText}
						onChange={(event) => setEvidenceText(event.target.value)}
						className="h-10 w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 sm:h-11"
					/>
				</TextField>
			</div>
			<div
				className={[
					'mt-2 grid gap-2 sm:mt-3',
					onCancel ? 'grid-cols-[3rem_minmax(0,1fr)]' : '',
				].join(' ')}
			>
				{onCancel && (
					<Button
						type="button"
						aria-label={t('arrival.backToRoute')}
						isDisabled={isRejecting}
						onPress={onCancel}
						className="grid h-10 w-12 place-items-center border border-[var(--color-border)] bg-[var(--color-surface)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11"
					>
						<ArrowLeft aria-hidden="true" size={17} />
					</Button>
				)}
				<Button
					type="button"
					isDisabled={!canReject || isRejecting}
					onPress={() =>
						onReject(deliveryId, reason.trim(), evidenceText.trim())
					}
					className="flex h-10 w-full items-center justify-between border border-[#B91C1C]/35 bg-[#B91C1C]/8 px-3 text-sm font-semibold text-[#B91C1C] outline-none focus-visible:ring-2 focus-visible:ring-[#B91C1C]/30 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11"
				>
					<span>{t('rejection.submit')}</span>
					<OctagonX aria-hidden="true" size={17} />
				</Button>
			</div>
			{errorMessage && (
				<p
					role="alert"
					className="mt-2 text-xs font-semibold text-[#B91C1C] sm:text-sm"
				>
					{errorMessage}
				</p>
			)}
		</>
	)
}

function RejectionForm({
	deliveryId,
	errorMessage,
	isRejecting,
	onReject,
}: {
	deliveryId: string
	errorMessage?: string | null
	isRejecting: boolean
	onReject: (deliveryId: string, reason: string, evidenceText: string) => void
}) {
	const { t } = useTranslation('driver')
	const [isOpen, setIsOpen] = useState(false)

	if (!isOpen && !errorMessage) {
		return (
			<Button
				type="button"
				isDisabled={isRejecting}
				onPress={() => setIsOpen(true)}
				className="mt-3 flex h-9 w-full items-center justify-between border border-[#B91C1C]/25 bg-[#B91C1C]/8 px-3 text-xs font-semibold text-[#B91C1C] outline-none focus-visible:ring-2 focus-visible:ring-[#B91C1C]/30 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:text-sm"
			>
				<span>{t('rejection.submit')}</span>
				<OctagonX aria-hidden="true" size={16} />
			</Button>
		)
	}

	return (
		<div className="mt-3 border-t border-[var(--color-border)] pt-3">
			<RejectionFields
				deliveryId={deliveryId}
				errorMessage={errorMessage}
				isRejecting={isRejecting}
				onReject={onReject}
			/>
		</div>
	)
}
