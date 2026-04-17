import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { EmployeeRow } from '../../../lib/db/db'
import {
	adminCreateEmployee,
	adminDeleteEmployee,
	adminListEmployees,
	adminUpdateEmployee,
} from '../../../lib/server/admin'
import { useAdminStore } from '../../../stores/admin'
import { getVolume } from '../../../types/admin'
import { LinkAction, TextControl } from '../AdminControls'
import { EntityEditor, Field, Section } from '../EntityEditor'
import { type ColumnDef, EntityIndex } from '../EntityIndex'
import { RegistryMasthead } from '../RegistryMasthead'

type EmployeeDraft = Omit<EmployeeRow, 'id'> & { id?: string }

function blankEmployee(): EmployeeDraft {
	return { name: '', name_ar: '', phone: '' }
}

export function EmployeesVolume() {
	const { t } = useTranslation('admin')
	const qc = useQueryClient()
	const volume = getVolume('employees')

	const mode = useAdminStore((s) => s.editorMode)
	const openEditor = useAdminStore((s) => s.openEditor)
	const closeEditor = useAdminStore((s) => s.closeEditor)

	const { data: employees = [] } = useQuery({
		queryKey: ['admin', 'employees'],
		queryFn: () => adminListEmployees(),
	})

	const [draft, setDraft] = useState<EmployeeDraft | null>(null)

	function handleRowSelect(row: EmployeeRow) {
		setDraft({ ...row })
		openEditor('view', row.id)
	}

	function handleNew() {
		setDraft(blankEmployee())
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
			const original = employees.find((e) => e.id === draft.id)
			if (original) setDraft({ ...original })
			openEditor('view', draft.id)
		}
	}

	const createMutation = useMutation({
		mutationFn: (payload: Omit<EmployeeRow, 'id'>) =>
			adminCreateEmployee({ data: payload }),
		onSuccess: (created) => {
			qc.invalidateQueries({ queryKey: ['admin', 'employees'] })
			setDraft({ ...created })
			openEditor('view', created.id)
		},
	})

	const updateMutation = useMutation({
		mutationFn: (payload: { id: string } & Partial<Omit<EmployeeRow, 'id'>>) =>
			adminUpdateEmployee({ data: payload }),
		onSuccess: (updated) => {
			qc.invalidateQueries({ queryKey: ['admin', 'employees'] })
			setDraft({ ...updated })
			openEditor('view', updated.id)
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

	const readOnly = mode === 'view'

	const columns: ColumnDef<EmployeeRow>[] = [
		{
			key: 'id',
			labelKey: 'volumes.employees.columns.id',
			width: '160px',
			mono: true,
			render: (r) => <>{r.id}</>,
		},
		{
			key: 'name',
			labelKey: 'volumes.employees.columns.name',
			width: 'minmax(160px, 1.4fr)',
			render: (r) => (
				<span className="truncate font-medium text-[var(--color-text)]">
					{r.name}
				</span>
			),
		},
		{
			key: 'nameAr',
			labelKey: 'volumes.employees.columns.nameAr',
			width: 'minmax(160px, 1.4fr)',
			render: (r) => (
				<span className="truncate text-[var(--color-text-muted)]">
					{r.name_ar}
				</span>
			),
		},
		{
			key: 'phone',
			labelKey: 'volumes.employees.columns.phone',
			width: 'minmax(140px, 1fr)',
			mono: true,
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
			<RegistryMasthead volume={volume} entryCount={employees.length} />
			<EntityIndex
				volume="employees"
				rows={employees}
				columns={columns}
				rowKey={(r) => r.id}
				onRowSelect={handleRowSelect}
				onNewEntry={handleNew}
				filter={filter}
			/>

			<EntityEditor
				isOpen={mode !== null}
				onClose={handleClose}
				mode={mode}
				idLabel={draft?.id ?? null}
				footer={
					draft ? (
						<>
							<div className="flex items-center gap-6">
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
