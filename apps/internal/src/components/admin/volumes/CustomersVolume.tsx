import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CustomerRow } from '../../../lib/db/db'
import {
	adminCreateCustomer,
	adminDeleteCustomer,
	adminListCustomers,
	adminUpdateCustomer,
} from '../../../lib/server/admin'
import { useAdminStore } from '../../../stores/admin'
import { getVolume } from '../../../types/admin'
import {
	LinkAction,
	NumberControl,
	SelectControl,
	StatusTag,
	TextAreaControl,
	TextControl,
} from '../AdminControls'
import { EntityEditor, Field, Section } from '../EntityEditor'
import { type ColumnDef, EntityIndex } from '../EntityIndex'
import { RegistryMasthead } from '../RegistryMasthead'

type CustomerDraft = Omit<CustomerRow, 'id' | 'joinedAt'> & {
	id?: string
	joinedAt?: string
}

interface CustomersVolumeProps {
	onOpenVolumes: () => void
}

function blankCustomer(): CustomerDraft {
	return {
		companyName: '',
		tier: 'new',
		status: 'unclaimed',
		contactName: '',
		phone: '',
		email: null,
		address: '',
		city: '',
		creditLimit: 0,
		currentExposure: 0,
		orderCount: 0,
		lifetimeValue: 0,
		avgMargin: 0,
		paymentHistory: 'fair',
		assignedSalesRep: null,
	}
}

export function CustomersVolume({ onOpenVolumes }: CustomersVolumeProps) {
	const { t } = useTranslation('admin')
	const qc = useQueryClient()
	const volume = getVolume('customers')

	const mode = useAdminStore((s) => s.editorMode)
	const _selectedId = useAdminStore((s) => s.selectedEntryId)
	const openEditor = useAdminStore((s) => s.openEditor)
	const closeEditor = useAdminStore((s) => s.closeEditor)

	const {
		data: customers = [],
		isError: customersError,
		isPending: customersPending,
	} = useQuery({
		queryKey: ['admin', 'customers'],
		queryFn: () => adminListCustomers(),
	})

	const [draft, setDraft] = useState<CustomerDraft | null>(null)

	function handleRowSelect(row: CustomerRow) {
		setDraft({ ...row })
		openEditor('view', row.id)
	}

	function handleNew() {
		setDraft(blankCustomer())
		openEditor('create', null)
	}

	function handleClose() {
		closeEditor()
		setDraft(null)
	}

	function handleEdit() {
		if (!draft?.id) return
		openEditor('edit', draft.id)
	}

	function handleCancel() {
		if (mode === 'create') {
			handleClose()
		} else if (draft?.id) {
			const original = customers.find((c) => c.id === draft.id)
			if (original) setDraft({ ...original })
			openEditor('view', draft.id)
		}
	}

	const createMutation = useMutation({
		mutationFn: (payload: Omit<CustomerRow, 'id' | 'joinedAt'>) =>
			adminCreateCustomer({ data: payload }),
		onSuccess: (created) => {
			qc.invalidateQueries({ queryKey: ['admin', 'customers'] })
			setDraft({ ...created })
			openEditor('view', created.id)
		},
	})

	const updateMutation = useMutation({
		mutationFn: (
			payload: { id: string } & Partial<Omit<CustomerRow, 'id' | 'joinedAt'>>,
		) => adminUpdateCustomer({ data: payload }),
		onSuccess: (updated) => {
			qc.invalidateQueries({ queryKey: ['admin', 'customers'] })
			setDraft({ ...updated })
			openEditor('view', updated.id)
		},
	})

	const deleteMutation = useMutation({
		mutationFn: (id: string) => adminDeleteCustomer({ data: { id } }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['admin', 'customers'] })
			handleClose()
		},
	})

	function handleSave() {
		if (!draft) return
		if (mode === 'create') {
			const { id: _id, joinedAt: _joined, ...payload } = draft
			createMutation.mutate(payload)
		} else if (mode === 'edit' && draft.id) {
			const { id, joinedAt: _joined, ...patch } = draft
			updateMutation.mutate({ id, ...patch })
		}
	}

	function handleDelete() {
		if (!draft?.id) return
		if (
			typeof window !== 'undefined' &&
			!window.confirm(t('actions.confirmDelete'))
		)
			return
		deleteMutation.mutate(draft.id)
	}

	const readOnly = mode === 'view'

	// ─── Columns ───
	const tierLabel = (tier: CustomerRow['tier']) =>
		t(`editor.enums.tier.${tier}`)
	const statusLabel = (s: CustomerRow['status']) =>
		t(`editor.enums.customerStatus.${s}`)

	const columns: ColumnDef<CustomerRow>[] = [
		{
			key: 'company',
			labelKey: 'volumes.customers.columns.company',
			width: 'minmax(180px, 2fr)',
			mobileRole: 'primary',
			render: (r) => (
				<span className="break-words font-semibold text-[var(--color-text)]">
					{r.companyName}
				</span>
			),
		},
		{
			key: 'tier',
			labelKey: 'volumes.customers.columns.tier',
			width: '80px',
			mobileRole: 'detail',
			render: (r) => (
				<StatusTag
					label={tierLabel(r.tier)}
					tone={
						r.tier === 'A' ? 'primary' : r.tier === 'new' ? 'muted' : 'neutral'
					}
				/>
			),
		},
		{
			key: 'status',
			labelKey: 'volumes.customers.columns.status',
			width: '120px',
			mobileRole: 'detail',
			render: (r) => (
				<StatusTag
					label={statusLabel(r.status)}
					tone={
						r.status === 'active'
							? 'primary'
							: r.status === 'inactive'
								? 'muted'
								: 'neutral'
					}
				/>
			),
		},
		{
			key: 'city',
			labelKey: 'volumes.customers.columns.city',
			width: 'minmax(120px, 1fr)',
			mobileRole: 'detail',
			render: (r) => <span className="break-words">{r.city || '—'}</span>,
		},
		{
			key: 'orders',
			labelKey: 'volumes.customers.columns.orders',
			width: '80px',
			align: 'end',
			mono: true,
			mobileRole: 'detail',
			render: (r) => <>{r.orderCount}</>,
		},
		{
			key: 'joinedAt',
			labelKey: 'volumes.customers.columns.joinedAt',
			width: '120px',
			align: 'end',
			mono: true,
			mobileRole: 'hidden',
			render: (r) => <>{r.joinedAt.slice(0, 10)}</>,
		},
	]

	const filter = (r: CustomerRow, q: string) =>
		r.companyName.toLowerCase().includes(q) ||
		r.contactName.toLowerCase().includes(q) ||
		r.city.toLowerCase().includes(q) ||
		r.phone.includes(q) ||
		r.id.toLowerCase().includes(q)

	const tierOptions: Array<{ value: CustomerRow['tier']; label: string }> = [
		{ value: 'A', label: t('editor.enums.tier.A') },
		{ value: 'B', label: t('editor.enums.tier.B') },
		{ value: 'C', label: t('editor.enums.tier.C') },
		{ value: 'new', label: t('editor.enums.tier.new') },
	]

	const statusOptions: Array<{ value: CustomerRow['status']; label: string }> =
		[
			{ value: 'unclaimed', label: t('editor.enums.customerStatus.unclaimed') },
			{ value: 'claimed', label: t('editor.enums.customerStatus.claimed') },
			{ value: 'active', label: t('editor.enums.customerStatus.active') },
			{ value: 'inactive', label: t('editor.enums.customerStatus.inactive') },
		]

	const paymentOptions: Array<{
		value: CustomerRow['paymentHistory']
		label: string
	}> = [
		{ value: 'excellent', label: t('editor.enums.paymentHistory.excellent') },
		{ value: 'good', label: t('editor.enums.paymentHistory.good') },
		{ value: 'fair', label: t('editor.enums.paymentHistory.fair') },
		{ value: 'poor', label: t('editor.enums.paymentHistory.poor') },
	]

	return (
		<>
			<RegistryMasthead
				volume={volume}
				entryCount={customers.length}
				onOpenVolumes={onOpenVolumes}
				onNewEntry={handleNew}
			/>
			<EntityIndex
				volume="customers"
				rows={customers}
				columns={columns}
				rowKey={(r) => r.id}
				onRowSelect={handleRowSelect}
				onNewEntry={handleNew}
				filter={filter}
				isLoading={customersPending}
				isError={customersError}
			/>

			<EntityEditor
				isOpen={mode !== null}
				onClose={handleClose}
				mode={mode}
				idLabel={draft?.id ?? null}
				footer={
					draft ? (
						<>
							<div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto">
								{mode === 'view' && (
									<LinkAction tone="primary" onClick={handleEdit}>
										{t('actions.edit')}
									</LinkAction>
								)}
								{(mode === 'edit' || mode === 'create') && (
									<LinkAction
										tone="primary"
										onClick={handleSave}
										disabled={
											createMutation.isPending || updateMutation.isPending
										}
									>
										{t('actions.save')}
									</LinkAction>
								)}
								{(mode === 'edit' || mode === 'create') && (
									<LinkAction onClick={handleCancel}>
										{t('actions.cancel')}
									</LinkAction>
								)}
							</div>
							{mode === 'view' && draft.id && (
								<LinkAction
									tone="danger"
									onClick={handleDelete}
									disabled={deleteMutation.isPending}
								>
									{t('actions.delete')}
								</LinkAction>
							)}
						</>
					) : null
				}
			>
				{draft && (
					<div className="space-y-6">
						<Section title={t('editor.section.identity')} />
						<Field label={t('editor.fields.companyName')} required>
							<TextControl
								value={draft.companyName}
								onChange={(v) => setDraft({ ...draft, companyName: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.companyName')}
							/>
						</Field>
						<div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
							<Field label={t('editor.fields.tier')}>
								<SelectControl
									value={draft.tier}
									onChange={(v) => setDraft({ ...draft, tier: v })}
									options={tierOptions}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.tier')}
								/>
							</Field>
							<Field label={t('editor.fields.status')}>
								<SelectControl
									value={draft.status}
									onChange={(v) => setDraft({ ...draft, status: v })}
									options={statusOptions}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.status')}
								/>
							</Field>
						</div>

						<Section title={t('editor.section.contact')} />
						<Field label={t('editor.fields.contactName')} required>
							<TextControl
								value={draft.contactName}
								onChange={(v) => setDraft({ ...draft, contactName: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.contactName')}
							/>
						</Field>
						<div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
							<Field label={t('editor.fields.phone')} required>
								<TextControl
									value={draft.phone}
									onChange={(v) => setDraft({ ...draft, phone: v })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.phone')}
									type="tel"
								/>
							</Field>
							<Field label={t('editor.fields.email')}>
								<TextControl
									value={draft.email ?? ''}
									onChange={(v) => setDraft({ ...draft, email: v || null })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.email')}
									type="email"
								/>
							</Field>
						</div>

						<Section title={t('editor.section.address')} />
						<Field label={t('editor.fields.address')}>
							<TextAreaControl
								value={draft.address}
								onChange={(v) => setDraft({ ...draft, address: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.address')}
								rows={2}
							/>
						</Field>
						<Field label={t('editor.fields.city')}>
							<TextControl
								value={draft.city}
								onChange={(v) => setDraft({ ...draft, city: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.city')}
							/>
						</Field>

						<Section title={t('editor.section.commercial')} />
						<div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
							<Field label={t('editor.fields.creditLimit')}>
								<NumberControl
									value={draft.creditLimit}
									onChange={(v) => setDraft({ ...draft, creditLimit: v })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.creditLimit')}
									min={0}
									suffix="EGP"
								/>
							</Field>
							<Field label={t('editor.fields.currentExposure')}>
								<NumberControl
									value={draft.currentExposure}
									onChange={(v) => setDraft({ ...draft, currentExposure: v })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.currentExposure')}
									min={0}
									suffix="EGP"
								/>
							</Field>
							<Field label={t('editor.fields.orderCount')}>
								<NumberControl
									value={draft.orderCount}
									onChange={(v) => setDraft({ ...draft, orderCount: v })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.orderCount')}
									min={0}
								/>
							</Field>
							<Field label={t('editor.fields.lifetimeValue')}>
								<NumberControl
									value={draft.lifetimeValue}
									onChange={(v) => setDraft({ ...draft, lifetimeValue: v })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.lifetimeValue')}
									min={0}
									suffix="EGP"
								/>
							</Field>
							<Field label={t('editor.fields.avgMargin')}>
								<NumberControl
									value={draft.avgMargin}
									onChange={(v) => setDraft({ ...draft, avgMargin: v })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.avgMargin')}
									suffix="%"
									step={0.1}
								/>
							</Field>
							<Field label={t('editor.fields.paymentHistory')}>
								<SelectControl
									value={draft.paymentHistory}
									onChange={(v) => setDraft({ ...draft, paymentHistory: v })}
									options={paymentOptions}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.paymentHistory')}
								/>
							</Field>
						</div>

						<Section title={t('editor.section.assignment')} />
						<Field label={t('editor.fields.assignedSalesRep')}>
							<TextControl
								value={draft.assignedSalesRep ?? ''}
								onChange={(v) =>
									setDraft({ ...draft, assignedSalesRep: v || null })
								}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.assignedSalesRep')}
							/>
						</Field>
					</div>
				)}
			</EntityEditor>
		</>
	)
}
