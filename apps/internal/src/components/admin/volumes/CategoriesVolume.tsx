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
import { StatusTag } from '../AdminControls'
import { Section } from '../EntityEditor'
import type { ColumnDef } from '../EntityIndex'
import {
	CatalogDescriptionFields,
	CatalogIdentityFields,
	CatalogThumbnail,
	CatalogVisibilityField,
	catalogLocalizedLabels,
} from './CatalogImageControls'
import { useAdminExport } from './useAdminExport'
import {
	deleteAdminDraftWithReason,
	saveAdminDraft,
	useVolumeEditor,
	VolumeWorkspace,
	volumeWorkspaceEditorState,
	volumeWorkspaceIndexState,
} from './volumeEditor'

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
		saveAdminDraft({
			mode,
			draftId: draft?.id,
			payload: draft ? draftToPayload(draft) : null,
			onCreate: (payload) => createMutation.mutate(payload),
			onUpdate: (id, payload) => updateMutation.mutate({ id, ...payload }),
		})
	}

	function handleDelete() {
		deleteAdminDraftWithReason({
			draftId: draft?.id,
			confirmMessage: t('actions.confirmDelete'),
			promptMessage: 'Reason for deactivating this category',
			onDelete: (id, reason) => deleteMutation.mutate({ id, reason }),
		})
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
	const catalogLabels = catalogLocalizedLabels(t)
	const workspaceIndex = volumeWorkspaceIndexState(
		volume,
		'categories',
		categories,
		columns,
		(r) => r.id,
		handleRowSelect,
		handleNew,
		filter,
		{
			isLoading: categoriesPending,
			isError: categoriesError,
			onOpenVolumes,
			onExport: requestExport,
			isExporting,
			exportStatus,
		},
	)
	const workspaceEditor = volumeWorkspaceEditorState(
		mode,
		draft,
		createMutation.isPending || updateMutation.isPending,
		deleteMutation.isPending,
		[handleClose, handleEdit, handleSave, handleCancel, handleDelete],
	)

	return (
		<VolumeWorkspace indexState={workspaceIndex} editorState={workspaceEditor}>
			{draft && (
				<div className="space-y-6">
					<CatalogIdentityFields
						pictureUrl={draft.pictureUrl}
						name={draft.name}
						nameAr={draft.name_ar}
						onPatch={(patch) => setDraft({ ...draft, ...patch })}
						readOnly={readOnly}
						labels={catalogLabels}
					/>

					<Section title={t('editor.section.commercial')} />
					<CatalogVisibilityField
						label={t('editor.fields.availabilityStatus')}
						visibleLabel={t('editor.values.visible')}
						hiddenLabel={t('editor.values.hidden')}
						isVisible={draft.isActive}
						onChange={(checked) => setDraft({ ...draft, isActive: checked })}
						readOnly={readOnly}
					/>

					<CatalogDescriptionFields
						description={draft.description}
						descriptionAr={draft.description_ar}
						onPatch={(patch) => setDraft({ ...draft, ...patch })}
						readOnly={readOnly}
						labels={catalogLabels}
					/>
				</div>
			)}
		</VolumeWorkspace>
	)
}
