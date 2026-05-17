/**
 * Full PO detail with per-line confirm/reject, delivery scheduling,
 * and sticky bottom bar with Confirm PO / Reject PO actions.
 * Calls confirmPO and rejectPO server functions.
 */

import { StatusBadge } from '@hyperquote/ui/feedback/StatusBadge'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import {
	Button,
	Dialog,
	Label,
	Modal,
	ModalOverlay,
	TextArea,
	TextField,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { confirmPO, rejectPO } from '../../lib/server/supplier-orders'
import { toast } from '../../lib/toast'
import type {
	DeliverySchedule,
	SupplierPO,
	SupplierPOLine,
} from '../../types/supplier'
import { DeliveryScheduleForm } from './DeliveryScheduleForm'
import { POLineItem } from './POLineItem'

function getStatusVariant(
	status: SupplierPO['status'],
): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
	switch (status) {
		case 'confirmed':
		case 'delivered':
			return 'success'
		case 'sent':
		case 'acknowledged':
			return 'warning'
		case 'rejected':
			return 'error'
		case 'in_production':
		case 'shipped':
			return 'info'
		default:
			return 'neutral'
	}
}

interface PODetailProps {
	po: SupplierPO
	locale: 'ar' | 'en'
}

export function PODetail({ po, locale }: PODetailProps) {
	const { t } = useTranslation('portal')
	const navigate = useNavigate()
	const queryClient = useQueryClient()

	// Local state for line item modifications
	const [lines, setLines] = useState<SupplierPOLine[]>(
		po.items.map((item) => ({ ...item })),
	)

	// Delivery schedule state
	const [deliverySchedule, setDeliverySchedule] = useState<DeliverySchedule>(
		po.deliverySchedule ?? {
			estimatedShipDate: '',
			deliveryMethod: 'supplier_delivers',
		},
	)

	// Modal states
	const [showConfirmModal, setShowConfirmModal] = useState(false)
	const [showRejectModal, setShowRejectModal] = useState(false)
	const [rejectReason, setRejectReason] = useState('')

	const confirmedCount = lines.filter((l) => l.confirmed).length
	const totalCount = lines.length

	// Mutations
	const confirmMutation = useMutation({
		mutationFn: () =>
			confirmPO({
				data: {
					poId: po.id,
					lines: lines.map((l) => ({
						lineId: l.id,
						confirmed: l.confirmed,
						reason: l.reason,
						partialQuantity: l.partialQuantity,
						newPrice: l.newPrice,
					})),
					deliverySchedule,
				},
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['supplier-pos'] })
			toast.success(t('supplier.poConfirmed'))
			navigate({ to: '/supplier/orders' })
		},
	})

	const rejectMutation = useMutation({
		mutationFn: () =>
			rejectPO({
				data: {
					poId: po.id,
					reason: rejectReason,
				},
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['supplier-pos'] })
			toast.success(t('supplier.poRejected'))
			navigate({ to: '/supplier/orders' })
		},
	})

	const handleLineChange = (
		index: number,
		updates: Partial<SupplierPOLine>,
	) => {
		setLines((prev) =>
			prev.map((l, i) => (i === index ? { ...l, ...updates } : l)),
		)
	}

	const formattedDate = new Date(po.dateReceived).toLocaleDateString(
		locale === 'ar' ? 'ar-EG' : 'en-GB',
		{ day: 'numeric', month: 'short', year: 'numeric' },
	)

	const BackArrow = locale === 'ar' ? ArrowRight : ArrowLeft

	return (
		<div className="flex flex-col gap-4 p-6 pb-24">
			{/* Header */}
			<div className="flex items-center gap-3">
				<Link
					to="/supplier/orders"
					className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
				>
					<BackArrow size={18} />
				</Link>
				<div className="flex flex-col gap-0.5">
					<div className="flex items-center gap-2">
						<span className="font-mono font-semibold text-lg text-[var(--color-text)]">
							{po.reference}
						</span>
						<StatusBadge status={getStatusVariant(po.status)}>
							{po.status}
						</StatusBadge>
					</div>
					<span className="text-[13px] text-[var(--color-text-muted)]">
						{formattedDate} &middot; from HyperQuote
					</span>
				</div>
			</div>

			{/* Line items table header */}
			<div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
				<div className="grid grid-cols-[40px_1fr_100px_100px_100px_60px] items-center gap-2 px-4 py-2 bg-[var(--color-surface)] text-[13px] font-medium text-[var(--color-text-muted)] max-md:grid-cols-[40px_1fr_80px_60px]">
					<span>#</span>
					<span>{t('supplier.productName')}</span>
					<span className="text-end max-md:hidden">
						{t('supplier.qtyRequested')}
					</span>
					<span className="text-end max-md:hidden">
						{t('supplier.unitPrice')}
					</span>
					<span className="text-end">{t('supplier.lineTotal')}</span>
					<span className="text-center">{t('supplier.confirm')}</span>
				</div>

				{/* Line items */}
				{lines.map((line, i) => (
					<POLineItem
						key={line.id}
						line={line}
						index={i}
						onChange={(updates) => handleLineChange(i, updates)}
						locale={locale}
					/>
				))}
			</div>

			{/* Delivery Schedule */}
			<DeliveryScheduleForm
				schedule={deliverySchedule}
				onChange={setDeliverySchedule}
			/>

			{/* Sticky bottom bar */}
			<div className="fixed bottom-0 inset-x-0 z-50 bg-[var(--color-surface)] border-t border-[var(--color-border)] p-4 flex gap-3">
				<Button
					onPress={() => setShowConfirmModal(true)}
					className="flex-1 flex items-center justify-center h-[48px] rounded-xl bg-[var(--color-success)] text-white font-semibold text-sm cursor-pointer hover:opacity-90 transition-opacity"
				>
					{t('supplier.confirmPO')}
				</Button>
				<Button
					onPress={() => setShowRejectModal(true)}
					className="flex items-center justify-center h-[48px] px-6 rounded-xl border-2 border-[var(--color-error)] text-[var(--color-error)] font-semibold text-sm cursor-pointer hover:bg-[var(--color-error)]/5 transition-colors"
				>
					{t('supplier.rejectPO')}
				</Button>
			</div>

			{/* Confirm modal */}
			<ModalOverlay
				isOpen={showConfirmModal}
				onOpenChange={setShowConfirmModal}
				isDismissable
				className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
			>
				<Modal className="w-[90vw] max-w-md">
					<Dialog
						className="backdrop-blur-2xl bg-[rgba(255,255,255,0.90)] dark:bg-[rgba(0,0,0,0.90)] rounded-2xl p-6 shadow-2xl outline-none"
						role="alertdialog"
					>
						{({ close }) => (
							<div className="flex flex-col gap-4">
								<h3 className="text-lg font-semibold text-[var(--color-text)]">
									{t('supplier.confirmPO')}
								</h3>
								<p className="text-sm text-[var(--color-text-muted)]">
									{t('supplier.confirmModal', {
										confirmed: confirmedCount,
										total: totalCount,
									})}
								</p>
								<div className="flex gap-3 justify-end">
									<Button
										onPress={close}
										className="px-4 py-2 text-sm text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text)] transition-colors"
									>
										{t('supplier.goBack')}
									</Button>
									<Button
										onPress={() => {
											close()
											confirmMutation.mutate()
										}}
										isDisabled={confirmMutation.isPending}
										className="px-6 py-2 rounded-xl bg-[var(--color-success)] text-white font-semibold text-sm cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
									>
										{t('supplier.confirm')}
									</Button>
								</div>
							</div>
						)}
					</Dialog>
				</Modal>
			</ModalOverlay>

			{/* Reject modal */}
			<ModalOverlay
				isOpen={showRejectModal}
				onOpenChange={setShowRejectModal}
				isDismissable
				isKeyboardDismissDisabled
				className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
			>
				<Modal className="w-[90vw] max-w-md">
					<Dialog
						className="backdrop-blur-2xl bg-[rgba(255,255,255,0.90)] dark:bg-[rgba(0,0,0,0.90)] rounded-2xl p-6 shadow-2xl outline-none"
						role="alertdialog"
					>
						{({ close }) => (
							<div className="flex flex-col gap-4">
								<h3 className="text-lg font-semibold text-[var(--color-text)]">
									{t('supplier.rejectPO')}
								</h3>
								<p className="text-sm text-[var(--color-text-muted)]">
									{t('supplier.rejectModal')}
								</p>
								<TextField
									value={rejectReason}
									onChange={setRejectReason}
									className="flex flex-col gap-1"
								>
									<Label className="text-[13px] text-[var(--color-text-muted)]">
										{t('supplier.reason')}
									</Label>
									<TextArea className="min-h-[100px] px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] resize-y" />
								</TextField>
								<div className="flex gap-3 justify-end">
									<Button
										onPress={close}
										className="px-4 py-2 text-sm text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text)] transition-colors"
									>
										{t('supplier.keepPO')}
									</Button>
									<Button
										onPress={() => {
											close()
											rejectMutation.mutate()
										}}
										isDisabled={
											!rejectReason.trim() || rejectMutation.isPending
										}
										className="px-6 py-2 rounded-xl bg-[var(--color-error)] text-white font-semibold text-sm cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
									>
										{t('supplier.rejectPO')}
									</Button>
								</div>
							</div>
						)}
					</Dialog>
				</Modal>
			</ModalOverlay>
		</div>
	)
}
