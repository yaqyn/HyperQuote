import {
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useAdminStore } from '../../../stores/admin'
import type {
	EditorMode,
	VolumeDefinition,
	VolumeId,
} from '../../../types/admin'
import { LinkAction } from '../AdminControls'
import { EntityEditor } from '../EntityEditor'
import { type ColumnDef, EntityIndex } from '../EntityIndex'
import { RegistryMasthead } from '../RegistryMasthead'

interface UseVolumeEditorOptions<TRow, TDraft> {
	rows: TRow[]
	blankDraft: () => TDraft
	rowToDraft: (row: TRow) => TDraft
	rowId: (row: TRow) => string
	draftId: (draft: TDraft) => string | null | undefined
}

export function useVolumeEditor<TRow, TDraft>({
	rows,
	blankDraft,
	rowToDraft,
	rowId,
	draftId,
}: UseVolumeEditorOptions<TRow, TDraft>): {
	mode: EditorMode | null
	draft: TDraft | null
	setDraft: Dispatch<SetStateAction<TDraft | null>>
	readOnly: boolean
	handleRowSelect: (row: TRow) => void
	handleNew: () => void
	handleClose: () => void
	handleEdit: () => void
	handleCancel: () => void
	showSavedDraft: (nextDraft: TDraft, id: string) => void
} {
	const mode = useAdminStore((s) => s.editorMode)
	const openEditor = useAdminStore((s) => s.openEditor)
	const closeEditor = useAdminStore((s) => s.closeEditor)
	const [draft, setDraft] = useState<TDraft | null>(null)

	function handleRowSelect(row: TRow) {
		const nextDraft = rowToDraft(row)
		setDraft(nextDraft)
		openEditor('view', rowId(row))
	}

	function handleNew() {
		setDraft(blankDraft())
		openEditor('create', null)
	}

	function handleClose() {
		closeEditor()
		setDraft(null)
	}

	function handleEdit() {
		if (!draft) return
		const id = draftId(draft)
		if (!id) return
		openEditor('edit', id)
	}

	function handleCancel() {
		if (mode === 'create') {
			handleClose()
			return
		}
		if (!draft) return
		const id = draftId(draft)
		if (!id) return
		const original = rows.find((row) => rowId(row) === id)
		if (original) setDraft(rowToDraft(original))
		openEditor('view', id)
	}

	function showSavedDraft(nextDraft: TDraft, id: string) {
		const state = useAdminStore.getState()
		if (state.editorMode === null) return
		if (state.editorMode !== 'create' && state.selectedEntryId !== id) return
		setDraft(nextDraft)
		openEditor('view', id)
	}

	return {
		mode,
		draft,
		setDraft,
		readOnly: mode === 'view',
		handleRowSelect,
		handleNew,
		handleClose,
		handleEdit,
		handleCancel,
		showSavedDraft,
	}
}

export function confirmAdminDelete(confirmMessage: string): boolean {
	return typeof window !== 'undefined' && window.confirm(confirmMessage)
}

export function promptAdminDeleteReason({
	confirmMessage,
	promptMessage,
}: {
	confirmMessage: string
	promptMessage: string
}): string | null {
	if (typeof window === 'undefined') return null
	if (!window.confirm(confirmMessage)) return null
	const reason = window.prompt(promptMessage)
	if (!reason || reason.trim().length < 8) return null
	return reason.trim()
}

function VolumeEditorFooter({
	mode,
	id,
	isSaving,
	isDeleting,
	onEdit,
	onSave,
	onCancel,
	onDelete,
	saveDisabled = false,
}: {
	mode: EditorMode | null
	id: string | null | undefined
	isSaving: boolean
	isDeleting: boolean
	saveDisabled?: boolean
	onEdit: () => void
	onSave: () => void
	onCancel: () => void
	onDelete: () => void
}) {
	const { t } = useTranslation('admin')

	return (
		<>
			<div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto">
				{mode === 'view' && (
					<LinkAction tone="primary" onClick={onEdit}>
						{t('actions.edit')}
					</LinkAction>
				)}
				{(mode === 'edit' || mode === 'create') && (
					<LinkAction
						tone="primary"
						onClick={onSave}
						disabled={isSaving || saveDisabled}
					>
						{t('actions.save')}
					</LinkAction>
				)}
				{(mode === 'edit' || mode === 'create') && (
					<LinkAction onClick={onCancel}>{t('actions.cancel')}</LinkAction>
				)}
			</div>
			{mode === 'view' && id && (
				<LinkAction tone="danger" onClick={onDelete} disabled={isDeleting}>
					{t('actions.delete')}
				</LinkAction>
			)}
		</>
	)
}

interface VolumeWorkspaceProps<TRow> {
	volume: VolumeDefinition
	volumeId: VolumeId
	rows: TRow[]
	columns: ColumnDef<TRow>[]
	rowKey: (row: TRow) => string
	onRowSelect: (row: TRow) => void
	onNewEntry: (() => void) | null
	filter: (row: TRow, query: string) => boolean
	isLoading?: boolean
	isError?: boolean
	topNote?: ReactNode
	onOpenVolumes: () => void
	onExport?: (() => void) | null
	isExporting?: boolean
	exportStatus?: string | null
	mode: EditorMode | null
	hasDraft: boolean
	idLabel?: string | null
	footerId?: string | null
	isSaving: boolean
	isDeleting: boolean
	saveDisabled?: boolean
	onClose: () => void
	onEdit: () => void
	onSave: () => void
	onCancel: () => void
	onDelete: () => void
	children: ReactNode
}

export function VolumeWorkspace<TRow>({
	volume,
	volumeId,
	rows,
	columns,
	rowKey,
	onRowSelect,
	onNewEntry,
	filter,
	isLoading,
	isError,
	topNote,
	onOpenVolumes,
	onExport,
	isExporting,
	exportStatus,
	mode,
	hasDraft,
	idLabel,
	footerId,
	isSaving,
	isDeleting,
	saveDisabled,
	onClose,
	onEdit,
	onSave,
	onCancel,
	onDelete,
	children,
}: VolumeWorkspaceProps<TRow>) {
	return (
		<>
			<RegistryMasthead
				volume={volume}
				entryCount={rows.length}
				onOpenVolumes={onOpenVolumes}
				onNewEntry={onNewEntry}
				onExport={onExport}
				isExporting={isExporting}
				exportStatus={exportStatus}
			/>
			<EntityIndex
				volume={volumeId}
				rows={rows}
				columns={columns}
				rowKey={rowKey}
				onRowSelect={onRowSelect}
				onNewEntry={onNewEntry}
				filter={filter}
				isLoading={isLoading}
				isError={isError}
				topNote={topNote}
			/>

			<EntityEditor
				isOpen={mode !== null}
				onClose={onClose}
				mode={mode}
				idLabel={idLabel ?? null}
				footer={
					hasDraft ? (
						<VolumeEditorFooter
							mode={mode}
							id={footerId ?? idLabel}
							isSaving={isSaving}
							isDeleting={isDeleting}
							saveDisabled={saveDisabled}
							onEdit={onEdit}
							onSave={onSave}
							onCancel={onCancel}
							onDelete={onDelete}
						/>
					) : null
				}
			>
				{children}
			</EntityEditor>
		</>
	)
}
