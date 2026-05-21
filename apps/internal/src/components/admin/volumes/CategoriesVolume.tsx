import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
	type AdminCategoryPayload,
	type AdminCategoryRow,
	adminCreateCategory,
	adminDeleteCategory,
	adminListCategories,
	adminUpdateCategory,
} from '../../../lib/server/admin'
import { getVolume } from '../../../types/admin'
import { Toggle } from '../../ui/Toggle'
import { StatusTag, TextAreaControl, TextControl } from '../AdminControls'
import { Field, Section } from '../EntityEditor'
import type { ColumnDef } from '../EntityIndex'
import { CatalogPictureField, CatalogThumbnail } from './CatalogImageControls'
import { useAdminExport } from './useAdminExport'
import { useVolumeEditor, VolumeWorkspace } from './volumeEditor'

type CategoryDraft = AdminCategoryPayload & { id?: string }

interface CategoriesVolumeProps {
	onOpenVolumes: () => void
}

function blankCategory(): CategoryDraft {
	return {
		name: '',
		name_ar: '',
		isActive: true,
		description: '',
		description_ar: '',
		pictureUrl: null,
	}
}

function categoryToDraft(row: AdminCategoryRow): CategoryDraft {
	return {
		id: row.id,
		name: row.name,
		name_ar: row.name_ar,
		isActive: row.isActive,
		description: row.description,
		description_ar: row.description_ar,
		pictureUrl: row.pictureUrl,
	}
}

function draftToPayload(draft: CategoryDraft): AdminCategoryPayload {
	return {
		name: draft.name,
		name_ar: draft.name_ar,
		isActive: draft.isActive,
		description: draft.description,
		description_ar: draft.description_ar,
		pictureUrl: draft.pictureUrl,
	}
}

export function CategoriesVolume({ onOpenVolumes }: CategoriesVolumeProps) {
	const { t } = useTranslation('admin')
	const qc = useQueryClient()
	const volume = getVolume('categories')
	const { exportStatus, isExporting, requestExport } =
		useAdminExport('categories')

	const {
		data: categories = [],
		isError: categoriesError,
		isPending: categoriesPending,
	} = useQuery({
		queryKey: ['admin', 'categories'],
		queryFn: () => adminListCategories(),
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
		rows: categories,
		blankDraft: blankCategory,
		rowToDraft: categoryToDraft,
		rowId: (row) => row.id,
		draftId: (row) => row.id,
	})

	const createMutation = useMutation({
		mutationFn: (payload: AdminCategoryPayload) =>
			adminCreateCategory({ data: payload }),
		onSuccess: (created) => {
			qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
			showSavedDraft(categoryToDraft(created), created.id)
		},
	})

	const updateMutation = useMutation({
		mutationFn: (payload: { id: string } & AdminCategoryPayload) =>
			adminUpdateCategory({ data: payload }),
		onSuccess: (updated) => {
			qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
			showSavedDraft(categoryToDraft(updated), updated.id)
		},
	})

	const deleteMutation = useMutation({
		mutationFn: (payload: { id: string; reason: string }) =>
			adminDeleteCategory({ data: payload }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
			handleClose()
		},
	})

	function handleSave() {
		if (!draft) return
		const payload = draftToPayload(draft)
		if (mode === 'create') {
			createMutation.mutate(payload)
		} else if (mode === 'edit' && draft.id) {
			updateMutation.mutate({ id: draft.id, ...payload })
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
				: window.prompt('Reason for deactivating this category')
		if (!reason || reason.trim().length < 8) return
		deleteMutation.mutate({ id: draft.id, reason: reason.trim() })
	}

	const columns: ColumnDef<AdminCategoryRow>[] = [
		{
			key: 'thumb',
			labelKey: 'volumes.categories.columns.thumb',
			width: '44px',
			mobileRole: 'media',
			render: (r) => <CatalogThumbnail src={r.pictureUrl} alt={r.name} />,
		},
		{
			key: 'name',
			labelKey: 'volumes.categories.columns.name',
			width: 'minmax(180px, 1.6fr)',
			mobileRole: 'primary',
			render: (r) => (
				<span className="break-words font-semibold text-[var(--color-text)]">
					{r.name}
				</span>
			),
		},
		{
			key: 'description',
			labelKey: 'volumes.categories.columns.description',
			width: 'minmax(220px, 2fr)',
			mobileRole: 'detail',
			render: (r) => (
				<span className="line-clamp-2 break-words text-[var(--color-text-muted)]">
					{r.description || '—'}
				</span>
			),
		},
		{
			key: 'status',
			labelKey: 'volumes.categories.columns.status',
			width: '110px',
			mobileRole: 'detail',
			render: (r) => (
				<StatusTag
					label={
						r.isActive ? t('editor.values.visible') : t('editor.values.hidden')
					}
					tone={r.isActive ? 'primary' : 'muted'}
				/>
			),
		},
	]

	const filter = (r: AdminCategoryRow, q: string) =>
		r.name.toLowerCase().includes(q) ||
		r.name_ar.includes(q) ||
		r.description.toLowerCase().includes(q) ||
		r.description_ar.includes(q)

	return (
		<VolumeWorkspace
			volume={volume}
			volumeId="categories"
			rows={categories}
			columns={columns}
			rowKey={(r) => r.id}
			onRowSelect={handleRowSelect}
			onNewEntry={handleNew}
			filter={filter}
			isLoading={categoriesPending}
			isError={categoriesError}
			onOpenVolumes={onOpenVolumes}
			onExport={requestExport}
			isExporting={isExporting}
			exportStatus={exportStatus}
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
					<CatalogPictureField
						value={draft.pictureUrl}
						onChange={(v) => setDraft({ ...draft, pictureUrl: v })}
						readOnly={readOnly}
						altText={draft.name || t('editor.fields.name')}
						label={t('editor.fields.pictureUrl')}
					/>

					<Section title={t('editor.section.identity')} />
					<Field label={t('editor.fields.name')} required>
						<TextControl
							value={draft.name}
							onChange={(v) => setDraft({ ...draft, name: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.name')}
						/>
					</Field>
					<Field label={t('editor.fields.nameAr')} required>
						<TextControl
							value={draft.name_ar}
							onChange={(v) => setDraft({ ...draft, name_ar: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.nameAr')}
						/>
					</Field>

					<Section title={t('editor.section.commercial')} />
					<Field label={t('editor.fields.availabilityStatus')}>
						{readOnly ? (
							<StatusTag
								label={
									draft.isActive
										? t('editor.values.visible')
										: t('editor.values.hidden')
								}
								tone={draft.isActive ? 'primary' : 'muted'}
							/>
						) : (
							<Toggle
								isSelected={draft.isActive}
								onChange={(checked) =>
									setDraft({ ...draft, isActive: checked })
								}
								label={
									draft.isActive
										? t('editor.values.visible')
										: t('editor.values.hidden')
								}
								aria-label={t('editor.fields.availabilityStatus')}
							/>
						)}
					</Field>

					<Field label={t('editor.fields.description')} required>
						<TextAreaControl
							value={draft.description}
							onChange={(v) => setDraft({ ...draft, description: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.description')}
							rows={3}
						/>
					</Field>
					<Field label={t('editor.fields.descriptionAr')} required>
						<TextAreaControl
							value={draft.description_ar}
							onChange={(v) => setDraft({ ...draft, description_ar: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.descriptionAr')}
							rows={3}
						/>
					</Field>
				</div>
			)}
		</VolumeWorkspace>
	)
}
