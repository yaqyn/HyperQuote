import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SupplierRow } from '../../../lib/db/db'
import {
	adminCreateSupplier,
	adminDeleteSupplier,
	adminListSuppliers,
	adminUpdateSupplier,
} from '../../../lib/server/admin'
import { useAdminStore } from '../../../stores/admin'
import { getVolume } from '../../../types/admin'
import {
	LinkAction,
	NumberControl,
	SelectControl,
	StatusTag,
	TextControl,
} from '../AdminControls'
import { EntityEditor, Field, Section } from '../EntityEditor'
import { type ColumnDef, EntityIndex } from '../EntityIndex'
import { RegistryMasthead } from '../RegistryMasthead'
import { SupplierItems, useSupplierItemCount } from '../SupplierItems'

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

	const mode = useAdminStore((s) => s.editorMode)
	const openEditor = useAdminStore((s) => s.openEditor)
	const closeEditor = useAdminStore((s) => s.closeEditor)

	const {
		data: suppliers = [],
		isError: suppliersError,
		isPending: suppliersPending,
	} = useQuery({
		queryKey: ['admin', 'suppliers'],
		queryFn: () => adminListSuppliers(),
	})

	const [draft, setDraft] = useState<SupplierDraft | null>(null)

	function handleRowSelect(row: SupplierRow) {
		setDraft({ ...row, originalName: row.name })
		openEditor('view', row.name)
	}

	function handleNew() {
		setDraft(blankSupplier())
		openEditor('create', null)
	}

	function handleClose() {
		closeEditor()
		setDraft(null)
	}

	function handleEdit() {
		if (!draft?.originalName) return
		openEditor('edit', draft.originalName)
	}

	function handleCancel() {
		if (mode === 'create') {
			handleClose()
		} else if (draft?.originalName) {
			const original = suppliers.find((s) => s.name === draft.originalName)
			if (original) setDraft({ ...original, originalName: original.name })
			openEditor('view', draft.originalName)
		}
	}

	const createMutation = useMutation({
		mutationFn: (payload: Omit<SupplierRow, 'joinedAt'>) =>
			adminCreateSupplier({ data: payload }),
		onSuccess: (created) => {
			qc.invalidateQueries({ queryKey: ['admin', 'suppliers'] })
			setDraft({ ...created, originalName: created.name })
			openEditor('view', created.name)
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
			setDraft({ ...updated, originalName: updated.name })
			openEditor('view', updated.name)
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

	const readOnly = mode === 'view'

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
							{mode === 'view' && draft.originalName && (
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
