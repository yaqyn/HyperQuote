import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { SupplierRow } from '../../../lib/db/db'
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
	TextControl,
} from '../AdminControls'
import { EntityEditor, Field, Section } from '../EntityEditor'
import { type ColumnDef, EntityIndex } from '../EntityIndex'
import { RegistryMasthead } from '../RegistryMasthead'
import { SupplierItems, useSupplierItemCount } from '../SupplierItems'
import { useVolumeEditor, VolumeEditorFooter } from './volumeEditor'

type SupplierDraft = Omit<SupplierRow, 'joinedAt'> & {
	joinedAt?: string
	/** The name the record was keyed by when the draft was opened. */
	originalName?: string
}

interface SuppliersVolumeProps {
	onOpenVolumes: () => void
}

function blankSupplier(): SupplierDraft {
	return {
		name: '',
		tier: 'new',
		paymentTerms: '',
		phone: null,
		rating: 3,
		customBadges: [],
	}
}

export function SuppliersVolume({ onOpenVolumes }: SuppliersVolumeProps) {
	const { t } = useTranslation('admin')
	const qc = useQueryClient()
	const volume = getVolume('suppliers')

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
		rowToDraft: (row) => ({ ...row, originalName: row.name }),
		rowId: (row) => row.name,
		draftId: (row) => row.originalName,
	})

	const createMutation = useMutation({
		mutationFn: (payload: Omit<SupplierRow, 'joinedAt'>) =>
			adminCreateSupplier({ data: payload }),
		onSuccess: (created) => {
			qc.invalidateQueries({ queryKey: ['admin', 'suppliers'] })
			showSavedDraft({ ...created, originalName: created.name }, created.name)
		},
	})

	const updateMutation = useMutation({
		mutationFn: (
			payload: { originalName: string } & Partial<
				Omit<SupplierRow, 'joinedAt'>
			>,
		) => adminUpdateSupplier({ data: payload }),
		onSuccess: (updated) => {
			qc.invalidateQueries({ queryKey: ['admin', 'suppliers'] })
			showSavedDraft({ ...updated, originalName: updated.name }, updated.name)
		},
	})

	const deleteMutation = useMutation({
		mutationFn: (name: string) => adminDeleteSupplier({ data: { name } }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['admin', 'suppliers'] })
			handleClose()
		},
	})

	function handleSave() {
		if (!draft) return
		if (mode === 'create') {
			const { originalName: _o, joinedAt: _j, ...payload } = draft
			createMutation.mutate(payload)
		} else if (mode === 'edit' && draft.originalName) {
			const { originalName, joinedAt: _j, ...patch } = draft
			updateMutation.mutate({ originalName, ...patch })
		}
	}

	function handleDelete() {
		if (!draft?.originalName) return
		if (
			typeof window !== 'undefined' &&
			!window.confirm(t('actions.confirmDelete'))
		)
			return
		deleteMutation.mutate(draft.originalName)
	}

	const tierOptions: Array<{ value: SupplierRow['tier']; label: string }> = [
		{ value: 'preferred', label: t('editor.enums.supplierTier.preferred') },
		{ value: 'approved', label: t('editor.enums.supplierTier.approved') },
		{ value: 'conditional', label: t('editor.enums.supplierTier.conditional') },
		{ value: 'new', label: t('editor.enums.supplierTier.new') },
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
			key: 'items',
			labelKey: 'volumes.suppliers.columns.items',
			width: '70px',
			align: 'end',
			mono: true,
			mobileRole: 'detail',
			render: (r) => <SupplierItemCountCell name={r.name} />,
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
		r.paymentTerms.toLowerCase().includes(q) ||
		(r.phone?.includes(q) ?? false)

	return (
		<>
			<RegistryMasthead
				volume={volume}
				entryCount={suppliers.length}
				onOpenVolumes={onOpenVolumes}
				onNewEntry={handleNew}
			/>
			<EntityIndex
				volume="suppliers"
				rows={suppliers}
				columns={columns}
				rowKey={(r) => r.name}
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
				idLabel={draft?.originalName ?? null}
				footer={
					draft ? (
						<VolumeEditorFooter
							mode={mode}
							id={draft.originalName}
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

						<Section title={t('items.title')} />
						<SupplierItems
							supplierName={draft.originalName ?? null}
							readOnly={readOnly}
						/>
					</div>
				)}
			</EntityEditor>
		</>
	)
}

// ─── Items count cell ────────────────────────────────────

function SupplierItemCountCell({ name }: { name: string }) {
	const count = useSupplierItemCount(name)
	return <>{count}</>
}
