import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { EmployeeRow } from '../../../lib/db/db'
import {
	adminCreateEmployee,
	adminDeleteEmployee,
	adminListEmployees,
	adminUpdateEmployee,
} from '../../../lib/server/admin'
import { getVolume } from '../../../types/admin'
import { TextControl } from '../AdminControls'
import { EntityEditor, Field, Section } from '../EntityEditor'
import { type ColumnDef, EntityIndex } from '../EntityIndex'
import { RegistryMasthead } from '../RegistryMasthead'
import { useVolumeEditor, VolumeEditorFooter } from './volumeEditor'

type EmployeeDraft = Omit<EmployeeRow, 'id'> & { id?: string }

interface EmployeesVolumeProps {
	onOpenVolumes: () => void
}

function blankEmployee(): EmployeeDraft {
	return { name: '', name_ar: '', phone: '' }
}

export function EmployeesVolume({ onOpenVolumes }: EmployeesVolumeProps) {
	const { t } = useTranslation('admin')
	const qc = useQueryClient()
	const volume = getVolume('employees')

	const {
		data: employees = [],
		isError: employeesError,
		isPending: employeesPending,
	} = useQuery({
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
		rows: employees,
		blankDraft: blankEmployee,
		rowToDraft: (row) => ({ ...row }),
		rowId: (row) => row.id,
		draftId: (row) => row.id,
	})

	const createMutation = useMutation({
		mutationFn: (payload: Omit<EmployeeRow, 'id'>) =>
			adminCreateEmployee({ data: payload }),
		onSuccess: (created) => {
			qc.invalidateQueries({ queryKey: ['admin', 'employees'] })
			showSavedDraft({ ...created }, created.id)
		},
	})

	const updateMutation = useMutation({
		mutationFn: (payload: { id: string } & Partial<Omit<EmployeeRow, 'id'>>) =>
			adminUpdateEmployee({ data: payload }),
		onSuccess: (updated) => {
			qc.invalidateQueries({ queryKey: ['admin', 'employees'] })
			showSavedDraft({ ...updated }, updated.id)
		},
	})

	const deleteMutation = useMutation({
		mutationFn: (id: string) => adminDeleteEmployee({ data: { id } }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['admin', 'employees'] })
			handleClose()
		},
	})

	function handleSave() {
		if (!draft) return
		if (mode === 'create') {
			const { id: _id, ...payload } = draft
			createMutation.mutate(payload)
		} else if (mode === 'edit' && draft.id) {
			const { id, ...patch } = draft
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

	const columns: ColumnDef<EmployeeRow>[] = [
		{
			key: 'id',
			labelKey: 'volumes.employees.columns.id',
			width: '160px',
			mono: true,
			mobileRole: 'detail',
			render: (r) => <>{r.id}</>,
		},
		{
			key: 'name',
			labelKey: 'volumes.employees.columns.name',
			width: 'minmax(160px, 1.4fr)',
			mobileRole: 'primary',
			render: (r) => (
				<span className="break-words font-semibold text-[var(--color-text)]">
					{r.name}
				</span>
			),
		},
		{
			key: 'nameAr',
			labelKey: 'volumes.employees.columns.nameAr',
			width: 'minmax(160px, 1.4fr)',
			mobileRole: 'detail',
			render: (r) => (
				<span className="break-words text-[var(--color-text-muted)]">
					{r.name_ar}
				</span>
			),
		},
		{
			key: 'phone',
			labelKey: 'volumes.employees.columns.phone',
			width: 'minmax(140px, 1fr)',
			mono: true,
			mobileRole: 'detail',
			render: (r) => <>{r.phone}</>,
		},
	]

	const filter = (r: EmployeeRow, q: string) =>
		r.name.toLowerCase().includes(q) ||
		r.name_ar.includes(q) ||
		r.phone.includes(q) ||
		r.id.toLowerCase().includes(q)

	return (
		<>
			<RegistryMasthead
				volume={volume}
				entryCount={employees.length}
				onOpenVolumes={onOpenVolumes}
				onNewEntry={handleNew}
			/>
			<EntityIndex
				volume="employees"
				rows={employees}
				columns={columns}
				rowKey={(r) => r.id}
				onRowSelect={handleRowSelect}
				onNewEntry={handleNew}
				filter={filter}
				isLoading={employeesPending}
				isError={employeesError}
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

						<Section title={t('editor.section.contact')} />
						<Field label={t('editor.fields.phone')} required>
							<TextControl
								value={draft.phone}
								onChange={(v) => setDraft({ ...draft, phone: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.phone')}
								type="tel"
							/>
						</Field>
					</div>
				)}
			</EntityEditor>
		</>
	)
}
