import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { SupplierRow } from '../../../lib/db/types'
import {
	adminCreateSupplier,
	adminDeleteSupplier,
	adminListSuppliers,
	adminUpdateSupplier,
} from '../../../lib/server/admin'
import { getVolume } from '../../../types/admin'
import {
	NumberControl,
	SelectControl,
	StatusTag,
	TextAreaControl,
	TextControl,
} from '../AdminControls'
import { EntityEditor, Field, Section } from '../EntityEditor'
import { type ColumnDef, EntityIndex } from '../EntityIndex'
import { RegistryMasthead } from '../RegistryMasthead'
import {
	SupplierSpecialties,
	useSupplierSpecialtyCount,
} from '../SupplierItems'
import { useAdminExport } from './useAdminExport'
import { useVolumeEditor, VolumeEditorFooter } from './volumeEditor'

type SupplierDraft = Omit<SupplierRow, 'id' | 'joinedAt'> & {
	id?: string
	joinedAt?: string
}
type SupplierPayload = Omit<SupplierRow, 'id' | 'joinedAt'>

interface SuppliersVolumeProps {
	onOpenVolumes: () => void
}

function blankSupplier(): SupplierDraft {
	return {
		name: '',
		email: null,
		status: 'active',
		tier: 'new',
		paymentTerms: '',
		phone: null,
		rating: 3,
		customBadges: [],
		notes: null,
	}
}

export function SuppliersVolume({ onOpenVolumes }: SuppliersVolumeProps) {
	const { t } = useTranslation('admin')
	const qc = useQueryClient()
	const volume = getVolume('suppliers')
	const { exportStatus, isExporting, requestExport } =
		useAdminExport('suppliers')

	const {
		data: suppliers = [],
		isError: suppliersError,
		isPending: suppliersPending,
	} = useQuery({
		queryKey: ['admin', 'suppliers'],
		queryFn: () => adminListSuppliers(),
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
		rows: suppliers,
		blankDraft: blankSupplier,
		rowToDraft: (row) => ({ ...row }),
		rowId: (row) => row.id,
		draftId: (row) => row.id,
	})

	const createMutation = useMutation({
		mutationFn: (payload: SupplierPayload) =>
			adminCreateSupplier({ data: payload }),
		onSuccess: (created) => {
			qc.invalidateQueries({ queryKey: ['admin', 'suppliers'] })
			showSavedDraft({ ...created }, created.id)
		},
	})

	const updateMutation = useMutation({
		mutationFn: (payload: { id: string } & Partial<SupplierPayload>) =>
			adminUpdateSupplier({ data: payload }),
		onSuccess: (updated) => {
			qc.invalidateQueries({ queryKey: ['admin', 'suppliers'] })
			showSavedDraft({ ...updated }, updated.id)
		},
	})

	const deleteMutation = useMutation({
		mutationFn: (payload: { id: string; reason: string }) =>
			adminDeleteSupplier({ data: payload }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['admin', 'suppliers'] })
			handleClose()
		},
	})

	function handleSave() {
		if (!draft) return
		if (mode === 'create') {
			const { id: _id, joinedAt: _j, ...payload } = draft
			createMutation.mutate(payload)
		} else if (mode === 'edit' && draft.id) {
			const { id, joinedAt: _j, ...patch } = draft
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
		const reason =
			typeof window === 'undefined'
				? null
				: window.prompt('Reason for deactivating this supplier')
		if (!reason || reason.trim().length < 8) return
		deleteMutation.mutate({
			id: draft.id,
			reason: reason.trim(),
		})
	}

	const tierOptions: Array<{ value: SupplierRow['tier']; label: string }> = [
		{ value: 'preferred', label: t('editor.enums.supplierTier.preferred') },
		{ value: 'approved', label: t('editor.enums.supplierTier.approved') },
		{ value: 'conditional', label: t('editor.enums.supplierTier.conditional') },
		{ value: 'new', label: t('editor.enums.supplierTier.new') },
	]
	const statusOptions: Array<{ value: SupplierRow['status']; label: string }> =
		[
			{ value: 'active', label: t('editor.enums.supplierStatus.active') },
			{ value: 'inactive', label: t('editor.enums.supplierStatus.inactive') },
			{ value: 'blocked', label: t('editor.enums.supplierStatus.blocked') },
		]

	const columns: ColumnDef<SupplierRow>[] = [
		{
			key: 'name',
			labelKey: 'volumes.suppliers.columns.name',
			width: 'minmax(200px, 2fr)',
			mobileRole: 'primary',
			render: (r) => (
				<span className="break-words font-semibold text-[var(--color-text)]">
					{r.name}
				</span>
			),
		},
		{
			key: 'tier',
			labelKey: 'volumes.suppliers.columns.tier',
			width: '120px',
			mobileRole: 'detail',
			render: (r) => (
				<StatusTag
					label={t(`editor.enums.supplierTier.${r.tier}`)}
					tone={
						r.tier === 'preferred'
							? 'primary'
							: r.tier === 'new'
								? 'muted'
								: 'neutral'
					}
				/>
			),
		},
		{
			key: 'status',
			labelKey: 'volumes.suppliers.columns.status',
			width: '110px',
			mobileRole: 'detail',
			render: (r) => (
				<StatusTag
					label={t(`editor.enums.supplierStatus.${r.status}`)}
					tone={r.status === 'active' ? 'primary' : 'muted'}
				/>
			),
		},
		{
			key: 'paymentTerms',
			labelKey: 'volumes.suppliers.columns.paymentTerms',
			width: 'minmax(120px, 1.4fr)',
			mobileRole: 'detail',
			render: (r) => (
				<span className="break-words text-[var(--color-text-muted)]">
					{r.paymentTerms}
				</span>
			),
		},
		{
			key: 'rating',
			labelKey: 'volumes.suppliers.columns.rating',
			width: '90px',
			align: 'end',
			mono: true,
			mobileRole: 'detail',
			render: (r) => <>{r.rating.toFixed(1)}</>,
		},
		{
			key: 'specialties',
			labelKey: 'volumes.suppliers.columns.specialties',
			width: '70px',
			align: 'end',
			mono: true,
			mobileRole: 'detail',
			render: (r) => <SupplierSpecialtyCountCell id={r.id} />,
		},
		{
			key: 'phone',
			labelKey: 'volumes.suppliers.columns.phone',
			width: 'minmax(120px, 1fr)',
			mono: true,
			mobileRole: 'detail',
			render: (r) => <>{r.phone ?? '—'}</>,
		},
	]

	const filter = (r: SupplierRow, q: string) =>
		r.name.toLowerCase().includes(q) ||
		(r.email?.toLowerCase().includes(q) ?? false) ||
		r.paymentTerms.toLowerCase().includes(q) ||
		(r.notes?.toLowerCase().includes(q) ?? false) ||
		(r.phone?.includes(q) ?? false)

	return (
		<>
			<RegistryMasthead
				volume={volume}
				entryCount={suppliers.length}
				onOpenVolumes={onOpenVolumes}
				onNewEntry={handleNew}
				onExport={requestExport}
				isExporting={isExporting}
				exportStatus={exportStatus}
			/>
			<EntityIndex
				volume="suppliers"
				rows={suppliers}
				columns={columns}
				rowKey={(r) => r.id}
				onRowSelect={handleRowSelect}
				onNewEntry={handleNew}
				filter={filter}
				isLoading={suppliersPending}
				isError={suppliersError}
			/>

			<EntityEditor
				isOpen={mode !== null}
				onClose={handleClose}
				mode={mode}
				idLabel={draft?.id ?? null}
				footer={
					draft ? (
						<VolumeEditorFooter
							mode={mode}
							id={draft.id}
							isSaving={createMutation.isPending || updateMutation.isPending}
							isDeleting={deleteMutation.isPending}
							onEdit={handleEdit}
							onSave={handleSave}
							onCancel={handleCancel}
							onDelete={handleDelete}
						/>
					) : null
				}
			>
				{draft && (
					<div className="space-y-6">
						<Section title={t('editor.section.identity')} />
						<Field label={t('editor.fields.supplierName')} required>
							<TextControl
								value={draft.name}
								onChange={(v) => setDraft({ ...draft, name: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.supplierName')}
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
							<Field label={t('editor.fields.rating')}>
								<NumberControl
									value={draft.rating}
									onChange={(v) => setDraft({ ...draft, rating: v })}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.rating')}
									min={0}
									max={5}
									step={0.1}
									suffix="/ 5"
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

						<Section title={t('editor.section.commercial')} />
						<Field label={t('editor.fields.paymentTerms')}>
							<TextControl
								value={draft.paymentTerms}
								onChange={(v) => setDraft({ ...draft, paymentTerms: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.paymentTerms')}
								placeholder="e.g. Net 30"
							/>
						</Field>

						<Section title={t('editor.section.contact')} />
						<Field label={t('editor.fields.phone')}>
							<TextControl
								value={draft.phone ?? ''}
								onChange={(v) => setDraft({ ...draft, phone: v || null })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.phone')}
								type="tel"
							/>
						</Field>
						<Field label={t('editor.fields.notes')}>
							<TextAreaControl
								value={draft.notes ?? ''}
								onChange={(v) => setDraft({ ...draft, notes: v || null })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.notes')}
								rows={3}
							/>
						</Field>

						<Section title={t('editor.section.badges')} />
						<Field label={t('editor.fields.customBadges')}>
							<TextControl
								value={draft.customBadges.join(', ')}
								onChange={(v) =>
									setDraft({
										...draft,
										customBadges: v
											.split(',')
											.map((b) => b.trim())
											.filter(Boolean),
									})
								}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.customBadges')}
								placeholder="badge, badge, badge"
							/>
						</Field>

						<Section title={t('specialties.title')} />
						<SupplierSpecialties
							supplierId={draft.id ?? null}
							readOnly={readOnly}
						/>
					</div>
				)}
			</EntityEditor>
		</>
	)
}

// ─── Specialty count cell ────────────────────────────────

function SupplierSpecialtyCountCell({ id }: { id: string }) {
	const count = useSupplierSpecialtyCount(id)
	return <>{count}</>
}
