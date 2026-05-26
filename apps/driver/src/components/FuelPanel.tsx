import { Camera, CheckCircle2, RefreshCw, Upload } from 'lucide-react'
import {
	type ChangeEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import { Button } from 'react-aria-components/Button'
import { useTranslation } from 'react-i18next'
import type {
	DriverDelivery,
	FuelReceiptSubmission,
} from '../lib/driver-repository'
import { PanelShell } from './PanelShell'

const MAX_RECEIPT_BYTES = 1024 * 1024
const MAX_RECEIPT_DATA_URL_LENGTH = 1_500_000
const CAMERA_CAPTURE_MAX_EDGE = 1280

interface FuelPanelProps {
	activeDelivery: DriverDelivery | null
	isSubmitting: boolean
	onSubmit: (submission: FuelReceiptSubmission) => Promise<boolean>
	submitError: string | null
}

interface ReceiptPhoto {
	dataUrl: string
	fileName: string
	mimeType: string
	sizeBytes: number
}

export function FuelPanel({
	activeDelivery,
	isSubmitting,
	onSubmit,
	submitError,
}: FuelPanelProps) {
	const { t } = useTranslation('driver')
	const videoRef = useRef<HTMLVideoElement | null>(null)
	const streamRef = useRef<MediaStream | null>(null)
	const [amount, setAmount] = useState('')
	const [note, setNote] = useState('')
	const [photo, setPhoto] = useState<ReceiptPhoto | null>(null)
	const [cameraActive, setCameraActive] = useState(false)
	const [cameraStarting, setCameraStarting] = useState(false)
	const [localError, setLocalError] = useState<string | null>(null)
	const [submitted, setSubmitted] = useState(false)
	const cameraSupported = canUseCamera()
	const amountValue = positiveNumber(amount)

	const stopCamera = useCallback(() => {
		stopMediaStream(streamRef.current)
		streamRef.current = null
		setCameraActive(false)
		setCameraStarting(false)
	}, [])

	useEffect(() => {
		return () => {
			stopMediaStream(streamRef.current)
			streamRef.current = null
		}
	}, [])

	useEffect(() => {
		if (!cameraActive) return
		const video = videoRef.current
		const stream = streamRef.current
		if (!video || !stream) return
		video.srcObject = stream
		void video.play().catch(() => {
			setLocalError(t('fuel.cameraError'))
		})
		return () => {
			if (video.srcObject === stream) video.srcObject = null
		}
	}, [cameraActive, t])

	async function startCamera() {
		setSubmitted(false)
		setLocalError(null)
		if (!cameraSupported) {
			setLocalError(t('fuel.cameraError'))
			return
		}

		setCameraStarting(true)
		try {
			stopMediaStream(streamRef.current)
			streamRef.current = await navigator.mediaDevices.getUserMedia({
				audio: false,
				video: { facingMode: { ideal: 'environment' } },
			})
			setCameraActive(true)
		} catch {
			stopCamera()
			setLocalError(t('fuel.cameraError'))
		} finally {
			setCameraStarting(false)
		}
	}

	async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
		await handleFile(event.currentTarget.files?.[0])
		event.currentTarget.value = ''
	}

	async function handleFile(file: File | undefined) {
		setSubmitted(false)
		setLocalError(null)
		if (!file) return
		try {
			setPhoto(await receiptPhotoFromFile(file))
			stopCamera()
		} catch {
			setPhoto(null)
			setLocalError(t('fuel.photoError'))
		}
	}

	async function captureCameraPhoto() {
		setSubmitted(false)
		setLocalError(null)
		const video = videoRef.current
		if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
			setLocalError(t('fuel.cameraError'))
			return
		}

		const scale = Math.min(
			1,
			CAMERA_CAPTURE_MAX_EDGE / Math.max(video.videoWidth, video.videoHeight),
		)
		const canvas = document.createElement('canvas')
		canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
		canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
		const context = canvas.getContext('2d')
		if (!context) {
			setLocalError(t('fuel.cameraError'))
			return
		}

		context.drawImage(video, 0, 0, canvas.width, canvas.height)
		try {
			setPhoto(await receiptPhotoFromCanvas(canvas))
			stopCamera()
		} catch {
			setPhoto(null)
			setLocalError(t('fuel.photoError'))
		}
	}

	async function submitReceipt() {
		if (!photo || isSubmitting) return
		if (!amountValue) {
			setLocalError(t('fuel.amountError'))
			return
		}

		setLocalError(null)
		const ok = await onSubmit({
			amount: amountValue,
			deliveryId: activeDelivery?.id ?? null,
			note: note.trim() || undefined,
			receiptFileName: photo.fileName,
			receiptImageDataUrl: photo.dataUrl,
			receiptMimeType: photo.mimeType,
			receiptSizeBytes: photo.sizeBytes,
			truckId: activeDelivery?.truckId ?? null,
		})
		if (!ok) return
		setAmount('')
		setNote('')
		setPhoto(null)
		setSubmitted(true)
	}

	const errorText = localError ?? submitError

	return (
		<PanelShell title={t('fuel.title')}>
			<div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 sm:p-5">
				<section className="border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
					<p className="mb-2 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-subtle)]">
						{t('fuel.proof')}
					</p>
					<div className="grid min-h-48 place-items-center overflow-hidden border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] text-center">
						{cameraActive ? (
							<video
								ref={videoRef}
								muted
								playsInline
								autoPlay
								className="h-full max-h-72 w-full object-cover"
							/>
						) : photo ? (
							<img
								src={photo.dataUrl}
								alt=""
								className="max-h-72 w-full object-contain"
							/>
						) : (
							<span className="flex flex-col items-center gap-3 p-4">
								<Camera aria-hidden="true" size={34} />
								<span className="text-sm font-semibold">
									{t('fuel.capture')}
								</span>
							</span>
						)}
					</div>

					<div className="mt-3 grid gap-2 sm:grid-cols-2">
						{cameraActive ? (
							<>
								<Button
									type="button"
									onPress={captureCameraPhoto}
									className="driver-action-button flex h-11 items-center justify-between border px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
								>
									<span>{t('fuel.capturePhoto')}</span>
									<Camera aria-hidden="true" size={17} />
								</Button>
								<Button
									type="button"
									onPress={stopCamera}
									className="flex h-11 items-center justify-center border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
								>
									{t('fuel.cancelCamera')}
								</Button>
							</>
						) : (
							<>
								<Button
									type="button"
									isDisabled={!cameraSupported || cameraStarting}
									onPress={startCamera}
									className="driver-action-button flex h-11 items-center justify-between border px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:cursor-not-allowed disabled:opacity-50"
								>
									<span>
										{cameraStarting
											? t('fuel.cameraStarting')
											: t('fuel.startCamera')}
									</span>
									<Camera aria-hidden="true" size={17} />
								</Button>
								<label className="flex h-11 cursor-pointer items-center justify-between border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold outline-none focus-within:ring-2 focus-within:ring-[var(--color-primary)]/35">
									<input
										type="file"
										accept="image/*"
										capture="environment"
										className="sr-only"
										onChange={handleFileChange}
									/>
									<span>
										{photo ? t('fuel.retake') : t('fuel.uploadProof')}
									</span>
									{photo ? (
										<RefreshCw aria-hidden="true" size={16} />
									) : (
										<Upload aria-hidden="true" size={17} />
									)}
								</label>
							</>
						)}
					</div>
				</section>

				<input
					value={amount}
					onChange={(event) => setAmount(event.target.value)}
					inputMode="decimal"
					placeholder={t('fuel.amount')}
					className="h-12 border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-sm outline-none placeholder:text-[var(--color-text-subtle)] focus:ring-2 focus:ring-[var(--color-primary)]/35"
				/>
				<textarea
					value={note}
					onChange={(event) => setNote(event.target.value)}
					placeholder={t('fuel.note')}
					rows={3}
					className="min-h-24 resize-none border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-3 text-sm outline-none placeholder:text-[var(--color-text-subtle)] focus:ring-2 focus:ring-[var(--color-primary)]/35"
				/>

				<Button
					isDisabled={!photo || !amountValue || isSubmitting}
					onPress={submitReceipt}
					className="driver-action-button flex h-12 items-center justify-between border px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<span>{isSubmitting ? t('fuel.submitting') : t('fuel.submit')}</span>
					<Camera aria-hidden="true" size={18} />
				</Button>

				{errorText && (
					<p className="text-sm leading-6 text-red-600 dark:text-red-300">
						{errorText}
					</p>
				)}
				{submitted && (
					<p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
						<CheckCircle2 aria-hidden="true" size={16} />
						{t('fuel.submitted')}
					</p>
				)}
			</div>
		</PanelShell>
	)
}

function canUseCamera(): boolean {
	return (
		typeof navigator !== 'undefined' &&
		Boolean(navigator.mediaDevices?.getUserMedia)
	)
}

function stopMediaStream(stream: MediaStream | null) {
	stream?.getTracks().forEach((track) => {
		track.stop()
	})
}

function positiveNumber(value: string): number | undefined {
	const parsed = Number(value)
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

async function receiptPhotoFromFile(file: File): Promise<ReceiptPhoto> {
	if (!file.type.startsWith('image/')) throw new Error('invalid_receipt_type')
	const original = await readFileAsDataUrl(file)
	if (
		file.size <= MAX_RECEIPT_BYTES &&
		original.length <= MAX_RECEIPT_DATA_URL_LENGTH
	) {
		return {
			dataUrl: original,
			fileName: file.name || 'fuel-receipt.jpg',
			mimeType: file.type,
			sizeBytes: file.size,
		}
	}
	return compressImageReceipt(file)
}

function receiptPhotoFromCanvas(
	canvas: HTMLCanvasElement,
): Promise<ReceiptPhoto> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			async (blob) => {
				if (!blob) {
					reject(new Error('receipt_capture_failed'))
					return
				}
				try {
					const file = new File([blob], `fuel-receipt-${Date.now()}.jpg`, {
						type: 'image/jpeg',
					})
					resolve(await receiptPhotoFromFile(file))
				} catch (error) {
					reject(error)
				}
			},
			'image/jpeg',
			0.82,
		)
	})
}

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onerror = () => reject(new Error('receipt_read_failed'))
		reader.onload = () => {
			if (typeof reader.result === 'string') resolve(reader.result)
			else reject(new Error('receipt_read_failed'))
		}
		reader.readAsDataURL(file)
	})
}

function compressImageReceipt(file: File): Promise<ReceiptPhoto> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file)
		const image = new Image()
		image.onerror = () => {
			URL.revokeObjectURL(url)
			reject(new Error('receipt_compress_failed'))
		}
		image.onload = () => {
			const scale = Math.min(1, 1280 / Math.max(image.width, image.height))
			const canvas = document.createElement('canvas')
			canvas.width = Math.max(1, Math.round(image.width * scale))
			canvas.height = Math.max(1, Math.round(image.height * scale))
			const context = canvas.getContext('2d')
			if (!context) {
				URL.revokeObjectURL(url)
				reject(new Error('receipt_compress_failed'))
				return
			}
			context.drawImage(image, 0, 0, canvas.width, canvas.height)
			canvas.toBlob(
				(blob) => {
					URL.revokeObjectURL(url)
					if (!blob || blob.size > MAX_RECEIPT_BYTES) {
						reject(new Error('receipt_too_large'))
						return
					}
					const reader = new FileReader()
					reader.onerror = () => reject(new Error('receipt_compress_failed'))
					reader.onload = () => {
						if (
							typeof reader.result !== 'string' ||
							reader.result.length > MAX_RECEIPT_DATA_URL_LENGTH
						) {
							reject(new Error('receipt_too_large'))
							return
						}
						resolve({
							dataUrl: reader.result,
							fileName: file.name || 'fuel-receipt.jpg',
							mimeType: 'image/jpeg',
							sizeBytes: blob.size,
						})
					}
					reader.readAsDataURL(blob)
				},
				'image/jpeg',
				0.72,
			)
		}
		image.src = url
	})
}
