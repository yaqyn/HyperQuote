import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { CustomerRow } from '../../../lib/db/types'
import {
	adminCreateCustomer,
	adminDeleteCustomer,
	adminListCustomers,
	adminListEmployees,
	adminUpdateCustomer,
} from '../../../lib/server/admin'
import { getVolume } from '../../../types/admin'
import { Toggle } from '../../ui/Toggle'
import {
	NumberControl,
	SelectControl,
	StatusTag,
	TextAreaControl,
	TextControl,
} from '../AdminControls'
import { CustomerSubrecords } from '../CustomerSubrecords'
import { Field, Section } from '../EntityEditor'
import type { ColumnDef } from '../EntityIndex'
import {
	confirmAdminDelete,
	useVolumeEditor,
	VolumeWorkspace,
} from './volumeEditor'

type CustomerDraft = Omit<CustomerRow, 'id' | 'joinedAt'> & {
	id?: string
	joinedAt?: string
}
type CustomerPayload = Omit<CustomerRow, 'id' | 'joinedAt' | 'userId'>

interface CustomersVolumeProps {
	onOpenVolumes: () => void
}

function blankCustomer(): CustomerDraft {
	return {
		userId: null,
		companyName: '',
		tier: 'new',
		status: 'unclaimed',
		tradeLicenseStatus: 'not_uploaded',
		profilePhotoUrl: null,
		createdByEmployeeId: null,
		contactName: '',
		phone: '',
		email: null,
		addressId: null,
		addressLabel: 'Primary',
		address: '',
		street: '',
		area: '',
		city: '',
		governorate: '',
		landmark: '',
		addressPhone: '',
		postalCode: '',
		latitude: null,
		longitude: null,
		isDefault: true,
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

	const {
		data: customers = [],
		isError: customersError,
		isPending: customersPending,
	} = useQuery({
		queryKey: ['admin', 'customers'],
		queryFn: () => adminListCustomers(),
	})
	const { data: employees = [] } = useQuery({
		queryKey: ['admin', 'employees'],
		queryFn: () => adminListEmployees(),
	})

	const {
		mode,
		draft,
		setDraft,
		readOnly,
		handleRowSelect,
		handleNew,
		handleClose,
		handleEdit,
		handleCancel,
		showSavedDraft,
	} = useVolumeEditor({
		rows: customers,
		blankDraft: blankCustomer,
		rowToDraft: (row) => ({ ...row }),
		rowId: (row) => row.id,
		draftId: (row) => row.id,
	})

	const createMutation = useMutation({
		mutationFn: (payload: CustomerPayload) =>
			adminCreateCustomer({ data: payload }),
		onSuccess: (created) => {
			qc.invalidateQueries({ queryKey: ['admin', 'customers'] })
			showSavedDraft({ ...created }, created.id)
		},
	})

	const updateMutation = useMutation({
		mutationFn: (payload: { id: string } & Partial<CustomerPayload>) =>
			adminUpdateCustomer({ data: payload }),
		onSuccess: (updated) => {
			qc.invalidateQueries({ queryKey: ['admin', 'customers'] })
			showSavedDraft({ ...updated }, updated.id)
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
			const { id: _id, joinedAt: _joined, userId: _userId, ...payload } = draft
			createMutation.mutate(payload)
		} else if (mode === 'edit' && draft.id) {
			const { id, joinedAt: _joined, userId: _userId, ...patch } = draft
			updateMutation.mutate({ id, ...patch })
		}
	}

	function handleDelete() {
		if (!draft?.id) return
		if (!confirmAdminDelete(t('actions.confirmDelete'))) return
		deleteMutation.mutate(draft.id)
	}

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
		r.governorate.toLowerCase().includes(q) ||
		r.street.toLowerCase().includes(q) ||
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
	const tradeLicenseOptions: Array<{
		value: CustomerRow['tradeLicenseStatus']
		label: string
	}> = [
		{
			value: 'not_uploaded',
			label: t('editor.enums.tradeLicense.not_uploaded'),
		},
		{
			value: 'under_review',
			label: t('editor.enums.tradeLicense.under_review'),
		},
		{ value: 'approved', label: t('editor.enums.tradeLicense.approved') },
		{ value: 'rejected', label: t('editor.enums.tradeLicense.rejected') },
	]
	const employeeOptions = [
		{ value: '', label: '—' },
		...employees.map((employee) => ({
			value: employee.id,
			label: employee.name,
		})),
	]
	const salesRepOptions = [
		{ value: '', label: '—' },
		...employees
			.filter(
				(employee) =>
					employee.status === 'active' &&
					(employee.roles.includes('sales') ||
						employee.roles.includes('admin')),
			)
			.map((employee) => ({ value: employee.id, label: employee.name })),
	]

	function coordinateFromInput(value: string): number | null {
		if (!value.trim()) return null
		const parsed = Number(value)
		return Number.isFinite(parsed) ? parsed : null
	}

	return (
		<VolumeWorkspace
			volume={volume}
			volumeId="customers"
			rows={customers}
			columns={columns}
			rowKey={(r) => r.id}
			onRowSelect={handleRowSelect}
			onNewEntry={handleNew}
			filter={filter}
			isLoading={customersPending}
			isError={customersError}
			onOpenVolumes={onOpenVolumes}
			mode={mode}
			hasDraft={Boolean(draft)}
			idLabel={draft?.id ?? null}
			isSaving={createMutation.isPending || updateMutation.isPending}
			isDeleting={deleteMutation.isPending}
			onClose={handleClose}
			onEdit={handleEdit}
			onSave={handleSave}
			onCancel={handleCancel}
			onDelete={handleDelete}
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
					<Field label={t('editor.fields.profilePhotoUrl')}>
						<TextControl
							value={draft.profilePhotoUrl ?? ''}
							onChange={(v) =>
								setDraft({ ...draft, profilePhotoUrl: v || null })
							}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.profilePhotoUrl')}
							placeholder="https://..."
						/>
					</Field>
					<div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
						<Field label={t('editor.fields.tradeLicenseStatus')}>
							<SelectControl
								value={draft.tradeLicenseStatus}
								onChange={(v) => setDraft({ ...draft, tradeLicenseStatus: v })}
								options={tradeLicenseOptions}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.tradeLicenseStatus')}
							/>
						</Field>
						<Field label={t('editor.fields.createdByEmployee')}>
							<SelectControl
								value={draft.createdByEmployeeId ?? ''}
								onChange={(v) =>
									setDraft({ ...draft, createdByEmployeeId: v || null })
								}
								options={employeeOptions}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.createdByEmployee')}
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
					<div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
						<Field label={t('editor.fields.addressLabel')}>
							<TextControl
								value={draft.addressLabel}
								onChange={(v) => setDraft({ ...draft, addressLabel: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.addressLabel')}
							/>
						</Field>
						<Field label={t('editor.fields.addressPhone')}>
							<TextControl
								value={draft.addressPhone}
								onChange={(v) => setDraft({ ...draft, addressPhone: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.addressPhone')}
								type="tel"
							/>
						</Field>
					</div>
					<Field label={t('editor.fields.street')} required>
						<TextAreaControl
							value={draft.street}
							onChange={(v) => setDraft({ ...draft, street: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.street')}
							rows={2}
						/>
					</Field>
					<div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
						<Field label={t('editor.fields.area')}>
							<TextControl
								value={draft.area}
								onChange={(v) => setDraft({ ...draft, area: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.area')}
							/>
						</Field>
						<Field label={t('editor.fields.city')} required>
							<TextControl
								value={draft.city}
								onChange={(v) => setDraft({ ...draft, city: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.city')}
							/>
						</Field>
						<Field label={t('editor.fields.governorate')} required>
							<TextControl
								value={draft.governorate}
								onChange={(v) => setDraft({ ...draft, governorate: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.governorate')}
							/>
						</Field>
						<Field label={t('editor.fields.postalCode')}>
							<TextControl
								value={draft.postalCode}
								onChange={(v) => setDraft({ ...draft, postalCode: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.postalCode')}
							/>
						</Field>
						<Field label={t('editor.fields.latitude')}>
							<TextControl
								value={draft.latitude?.toString() ?? ''}
								onChange={(v) =>
									setDraft({ ...draft, latitude: coordinateFromInput(v) })
								}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.latitude')}
							/>
						</Field>
						<Field label={t('editor.fields.longitude')}>
							<TextControl
								value={draft.longitude?.toString() ?? ''}
								onChange={(v) =>
									setDraft({ ...draft, longitude: coordinateFromInput(v) })
								}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.longitude')}
							/>
						</Field>
					</div>
					<Field label={t('editor.fields.landmark')}>
						<TextAreaControl
							value={draft.landmark}
							onChange={(v) => setDraft({ ...draft, landmark: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.landmark')}
							rows={2}
						/>
					</Field>
					<Field label={t('editor.fields.isDefaultAddress')}>
						{readOnly ? (
							<StatusTag
								label={draft.isDefault ? 'Default' : 'Secondary'}
								tone={draft.isDefault ? 'primary' : 'neutral'}
							/>
						) : (
							<Toggle
								isSelected={draft.isDefault}
								onChange={(checked) =>
									setDraft({ ...draft, isDefault: checked })
								}
								aria-label={t('editor.fields.isDefaultAddress')}
							/>
						)}
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
								readOnly={true}
								ariaLabel={t('editor.fields.currentExposure')}
								min={0}
								suffix="EGP"
							/>
						</Field>
						<Field label={t('editor.fields.orderCount')}>
							<NumberControl
								value={draft.orderCount}
								onChange={(v) => setDraft({ ...draft, orderCount: v })}
								readOnly={true}
								ariaLabel={t('editor.fields.orderCount')}
								min={0}
							/>
						</Field>
						<Field label={t('editor.fields.lifetimeValue')}>
							<NumberControl
								value={draft.lifetimeValue}
								onChange={(v) => setDraft({ ...draft, lifetimeValue: v })}
								readOnly={true}
								ariaLabel={t('editor.fields.lifetimeValue')}
								min={0}
								suffix="EGP"
							/>
						</Field>
						<Field label={t('editor.fields.avgMargin')}>
							<NumberControl
								value={draft.avgMargin}
								onChange={(v) => setDraft({ ...draft, avgMargin: v })}
								readOnly={true}
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
						<SelectControl
							value={draft.assignedSalesRep ?? ''}
							onChange={(v) =>
								setDraft({ ...draft, assignedSalesRep: v || null })
							}
							options={salesRepOptions}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.assignedSalesRep')}
						/>
					</Field>

					<Section title={t('editor.section.customerRecords')} />
					<CustomerSubrecords customerId={draft.id} readOnly={readOnly} />
				</div>
			)}
		</VolumeWorkspace>
	)
}
