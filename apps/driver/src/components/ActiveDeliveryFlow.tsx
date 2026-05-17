import { ClipboardList, ListChecks, MapPinned, Navigation } from 'lucide-react'
import { useState } from 'react'
import { Button, Input, Label, TextField } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { DriverDelivery, DriverLanguage } from '../lib/driver-repository'
import { localize } from '../lib/format'
import { ActionButton, Metric, StatusPill } from './DriverShellPrimitives'
import { SignaturePad } from './SignaturePad'

interface ActiveDeliveryFlowProps {
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
}

export function ActiveDeliveryFlow({
	activeDelivery,
	completeDelivery,
	isCompleting,
	isMutating,
	language,
	nextDelivery,
	onAccept,
	onArrival,
	onStart,
}: ActiveDeliveryFlowProps) {
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
