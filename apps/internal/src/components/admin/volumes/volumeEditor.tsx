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
import { LinkAction, TextControl } from '../AdminControls'
import { EntityEditor, Field, Section } from '../EntityEditor'
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

export function saveAdminDraft<TPayload>({
	blocked = false,
	draftId,
	mode,
	onCreate,
	onUpdate,
	payload,
}: {
	blocked?: boolean
	draftId: string | null | undefined
	mode: EditorMode | null
	onCreate: (payload: TPayload) => void
	onUpdate: (id: string, payload: TPayload) => void
	payload: TPayload | null
}) {
	if (blocked || !payload) return
	if (mode === 'create') {
		onCreate(payload)
		return
	}
	if (mode === 'edit' && draftId) onUpdate(draftId, payload)
}

export function deleteAdminDraftWithReason({
	confirmMessage,
	draftId,
	onDelete,
	promptMessage,
}: {
	confirmMessage: string
	draftId: string | null | undefined
	onDelete: (id: string, reason: string) => void
	promptMessage: string
}) {
	if (!draftId) return
	const reason = promptAdminDeleteReason({ confirmMessage, promptMessage })
	if (reason) onDelete(draftId, reason)
}

export function getAdminMutationError(...errors: unknown[]): string | null {
	for (const error of errors) {
		if (error instanceof Error) return error.message
	}
	return null
}

export function AdminMutationErrorNotice({ error }: { error: string | null }) {
	if (!error) return null
	return (
		<p
			className="rounded-md border border-[#B91C1C]/20 bg-[#B91C1C]/5 px-3 py-2 text-sm text-[#B91C1C]"
			role="alert"
		>
			{error}
		</p>
	)
}

interface EditorTextFieldProps {
	label: string
	value: string
	onChange: (value: string) => void
	readOnly: boolean
	required?: boolean
	ariaLabel?: string
	type?: 'text' | 'email' | 'tel' | 'password' | 'date'
	placeholder?: string
	children?: ReactNode
}

export function EditorTextField({
	label,
	value,
	onChange,
	readOnly,
	required,
	ariaLabel = label,
	type,
	placeholder,
	children,
}: EditorTextFieldProps) {
	return (
		<Field label={label} required={required}>
			<TextControl
				value={value}
				onChange={onChange}
				readOnly={readOnly}
				ariaLabel={ariaLabel}
				type={type}
				placeholder={placeholder}
			/>
			{children}
		</Field>
	)
}

export function EditorSectionTextField({
	sectionTitle,
	...props
}: EditorTextFieldProps & {
	sectionTitle: string
}) {
	return (
		<>
			<Section title={sectionTitle} />
			<EditorTextField {...props} />
		</>
	)
}

export function EditorPasswordField({
	mode,
	error,
	...props
}: Omit<EditorTextFieldProps, 'readOnly' | 'type'> & {
	mode: EditorMode | null
	error?: ReactNode
}) {
	if (mode === 'view') return null
	return (
		<EditorTextField
			{...props}
			readOnly={false}
			required={props.required ?? mode === 'create'}
			type="password"
		>
			{error}
		</EditorTextField>
	)
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

interface VolumeWorkspaceIndexState<TRow> {
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
}

interface VolumeWorkspaceEditorState {
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
}

export function volumeWorkspaceIndexState<TRow>(
	volume: VolumeDefinition,
	volumeId: VolumeId,
	rows: TRow[],
	columns: ColumnDef<TRow>[],
	rowKey: (row: TRow) => string,
	onRowSelect: (row: TRow) => void,
	onNewEntry: (() => void) | null,
	filter: (row: TRow, query: string) => boolean,
	options: Omit<
		VolumeWorkspaceIndexState<TRow>,
		| 'columns'
		| 'filter'
		| 'onNewEntry'
		| 'onRowSelect'
		| 'rowKey'
		| 'rows'
		| 'volume'
		| 'volumeId'
	>,
): VolumeWorkspaceIndexState<TRow> {
	return {
		volume,
		volumeId,
		rows,
		columns,
		rowKey,
		onRowSelect,
		onNewEntry,
		filter,
		...options,
	}
}

export function volumeWorkspaceEditorState<
	TDraft extends { id?: string | null },
>(
	mode: EditorMode | null,
	draft: TDraft | null,
	isSaving: boolean,
	isDeleting: boolean,
	actions: [
		onClose: () => void,
		onEdit: () => void,
		onSave: () => void,
		onCancel: () => void,
		onDelete: () => void,
	],
	options: Pick<
		VolumeWorkspaceEditorState,
		'footerId' | 'idLabel' | 'saveDisabled'
	> = {},
): VolumeWorkspaceEditorState {
	const [onClose, onEdit, onSave, onCancel, onDelete] = actions
	return {
		mode,
		hasDraft: Boolean(draft),
		idLabel: options.idLabel ?? draft?.id ?? null,
		footerId: options.footerId,
		isSaving,
		isDeleting,
		saveDisabled: options.saveDisabled,
		onClose,
		onEdit,
		onSave,
		onCancel,
		onDelete,
	}
}

interface VolumeWorkspaceProps<TRow> {
	indexState?: VolumeWorkspaceIndexState<TRow>
	editorState?: VolumeWorkspaceEditorState
	volume?: VolumeDefinition
	volumeId?: VolumeId
	rows?: TRow[]
	columns?: ColumnDef<TRow>[]
	rowKey?: (row: TRow) => string
	onRowSelect?: (row: TRow) => void
	onNewEntry?: (() => void) | null
	filter?: (row: TRow, query: string) => boolean
	isLoading?: boolean
	isError?: boolean
	topNote?: ReactNode
	onOpenVolumes?: () => void
	onExport?: (() => void) | null
	isExporting?: boolean
	exportStatus?: string | null
	mode?: EditorMode | null
	hasDraft?: boolean
	idLabel?: string | null
	footerId?: string | null
	isSaving?: boolean
	isDeleting?: boolean
	saveDisabled?: boolean
	onClose?: () => void
	onEdit?: () => void
	onSave?: () => void
	onCancel?: () => void
	onDelete?: () => void
	children: ReactNode
}

export function VolumeWorkspace<TRow>({
	indexState,
	editorState,
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
	let index = indexState
	if (!index) {
		if (
			!volume ||
			!volumeId ||
			!rows ||
			!columns ||
			!rowKey ||
			!onRowSelect ||
			!filter ||
			!onOpenVolumes
		) {
			throw new Error('VolumeWorkspace requires index props')
		}
		index = {
			volume,
			volumeId,
			rows,
			columns,
			rowKey,
			onRowSelect,
			onNewEntry: onNewEntry ?? null,
			filter,
			isLoading,
			isError,
			topNote,
			onOpenVolumes,
			onExport,
			isExporting,
			exportStatus,
		}
	}
	const editor = editorState ?? {
		mode: mode ?? null,
		hasDraft: Boolean(hasDraft),
		idLabel,
		footerId,
		isSaving: Boolean(isSaving),
		isDeleting: Boolean(isDeleting),
		saveDisabled,
		onClose: onClose ?? (() => undefined),
		onEdit: onEdit ?? (() => undefined),
		onSave: onSave ?? (() => undefined),
		onCancel: onCancel ?? (() => undefined),
		onDelete: onDelete ?? (() => undefined),
	}

	return (
		<>
			<RegistryMasthead
				volume={index.volume}
				entryCount={index.rows.length}
				onOpenVolumes={index.onOpenVolumes}
				onNewEntry={index.onNewEntry}
				onExport={index.onExport}
				isExporting={index.isExporting}
				exportStatus={index.exportStatus}
			/>
			<EntityIndex
				volume={index.volumeId}
				rows={index.rows}
				columns={index.columns}
				rowKey={index.rowKey}
				onRowSelect={index.onRowSelect}
				onNewEntry={index.onNewEntry}
				filter={index.filter}
				isLoading={index.isLoading}
				isError={index.isError}
				topNote={index.topNote}
			/>

			<EntityEditor
				isOpen={editor.mode !== null}
				onClose={editor.onClose}
				mode={editor.mode}
				idLabel={editor.idLabel ?? null}
				footer={
					editor.hasDraft ? (
						<VolumeEditorFooter
							mode={editor.mode}
							id={editor.footerId ?? editor.idLabel}
							isSaving={editor.isSaving}
							isDeleting={editor.isDeleting}
							saveDisabled={editor.saveDisabled}
							onEdit={editor.onEdit}
							onSave={editor.onSave}
							onCancel={editor.onCancel}
							onDelete={editor.onDelete}
						/>
					) : null
				}
			>
				{children}
			</EntityEditor>
		</>
	)
}
