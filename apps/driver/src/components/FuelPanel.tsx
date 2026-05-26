import { Camera, CheckCircle2, Fuel } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { useTranslation } from 'react-i18next'
import type {
	DriverDelivery,
	FuelReceiptSubmission,
} from '../lib/driver-repository'
import { PanelShell } from './PanelShell'

const MAX_RECEIPT_BYTES = 1024 * 1024
const MAX_RECEIPT_DATA_URL_LENGTH = 1_500_000

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
	const [amount, setAmount] = useState('')
	const [fuelLiters, setFuelLiters] = useState('')
	const [odometerKm, setOdometerKm] = useState('')
	const [note, setNote] = useState('')
	const [photo, setPhoto] = useState<ReceiptPhoto | null>(null)
	const [localError, setLocalError] = useState<string | null>(null)
	const [submitted, setSubmitted] = useState(false)

	async function handleFile(file: File | undefined) {
		setSubmitted(false)
		setLocalError(null)
		if (!file) return
		try {
			setPhoto(await receiptPhotoFromFile(file))
		} catch {
			setPhoto(null)
			setLocalError(t('fuel.photoError'))
		}
	}

	async function submitReceipt() {
		if (!photo || isSubmitting) return
		setLocalError(null)
		const ok = await onSubmit({
			amount: optionalPositiveNumber(amount),
			deliveryId: activeDelivery?.id ?? null,
			expenseDate: new Date().toISOString().slice(0, 10),
			fuelLiters: optionalPositiveNumber(fuelLiters),
			note: note.trim() || undefined,
			odometerKm: optionalPositiveNumber(odometerKm),
			receiptFileName: photo.fileName,
			receiptImageDataUrl: photo.dataUrl,
			receiptMimeType: photo.mimeType,
			receiptSizeBytes: photo.sizeBytes,
			truckId: activeDelivery?.truckId ?? null,
		})
		if (!ok) return
		setAmount('')
		setFuelLiters('')
		setOdometerKm('')
		setNote('')
		setPhoto(null)
		setSubmitted(true)
	}

	const errorText = localError ?? submitError

	return (
		<PanelShell title={t('fuel.title')}>
			<div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 sm:p-5">
				<div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
					<div className="flex items-center justify-between gap-3">
						<div className="min-w-0">
							<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-subtle)]">
								{t('fuel.truck')}
							</p>
							<p className="mt-1 truncate text-sm font-semibold">
								{activeDelivery?.truckPlate ?? t('fuel.autoTruck')}
							</p>
						</div>
						<Fuel aria-hidden="true" className="shrink-0" size={22} />
					</div>
				</div>

				<label className="grid min-h-40 cursor-pointer place-items-center border border-dashed border-[var(--color-border-strong)] bg-[var(--color-panel)] p-4 text-center outline-none focus-within:ring-2 focus-within:ring-[var(--color-primary)]/35">
					<input
						type="file"
						accept="image/*"
						capture="environment"
						className="sr-only"
						onChange={(event) => handleFile(event.currentTarget.files?.[0])}
					/>
					{photo ? (
						<img
							src={photo.dataUrl}
							alt=""
							className="max-h-48 w-full object-contain"
						/>
					) : (
						<span className="flex flex-col items-center gap-3">
							<Camera aria-hidden="true" size={34} />
							<span className="text-sm font-semibold">{t('fuel.capture')}</span>
						</span>
					)}
				</label>

				<div className="grid gap-3 sm:grid-cols-3">
					<input
						value={amount}
						onChange={(event) => setAmount(event.target.value)}
						inputMode="decimal"
						placeholder={t('fuel.amount')}
						className="h-12 border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-sm outline-none placeholder:text-[var(--color-text-subtle)] focus:ring-2 focus:ring-[var(--color-primary)]/35"
					/>
					<input
						value={fuelLiters}
						onChange={(event) => setFuelLiters(event.target.value)}
						inputMode="decimal"
						placeholder={t('fuel.liters')}
						className="h-12 border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-sm outline-none placeholder:text-[var(--color-text-subtle)] focus:ring-2 focus:ring-[var(--color-primary)]/35"
					/>
					<input
						value={odometerKm}
						onChange={(event) => setOdometerKm(event.target.value)}
						inputMode="decimal"
						placeholder={t('fuel.odometer')}
						className="h-12 border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-sm outline-none placeholder:text-[var(--color-text-subtle)] focus:ring-2 focus:ring-[var(--color-primary)]/35"
					/>
				</div>
				<input
					value={note}
					onChange={(event) => setNote(event.target.value)}
					placeholder={t('fuel.note')}
					className="h-12 border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-sm outline-none placeholder:text-[var(--color-text-subtle)] focus:ring-2 focus:ring-[var(--color-primary)]/35"
				/>

				<Button
					isDisabled={!photo || isSubmitting}
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

function optionalPositiveNumber(value: string): number | undefined {
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
