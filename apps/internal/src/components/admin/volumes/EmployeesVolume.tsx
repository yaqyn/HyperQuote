import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
	type AdminEmployeeRole,
	type AdminEmployeeRow,
	adminCreateEmployee,
	adminDeleteEmployee,
	adminListEmployees,
	adminUpdateEmployee,
} from '../../../lib/server/admin'
import { getVolume } from '../../../types/admin'
import { Toggle } from '../../ui/Toggle'
import {
	NumberControl,
	SelectControl,
	StatusTag,
	TextControl,
} from '../AdminControls'
import { Field, Section } from '../EntityEditor'
import type { ColumnDef } from '../EntityIndex'
import { useAdminExport } from './useAdminExport'
import {
	promptAdminDeleteReason,
	useVolumeEditor,
	VolumeWorkspace,
} from './volumeEditor'

type EmployeeDraft = Omit<AdminEmployeeRow, 'id'> & {
	id?: string
	password?: string
}
type EmployeePayload = Omit<AdminEmployeeRow, 'id'> & { password?: string }

interface EmployeesVolumeProps {
	onOpenVolumes: () => void
}

function blankEmployee(): EmployeeDraft {
	return {
		name: '',
		email: '',
		phone: '',
		password: '',
		status: 'active',
		isCeo: false,
		roles: [],
		department: '',
		title: '',
		hireDate: '',
		baseSalary: 0,
		socialInsuranceSalary: 0,
		salaryCurrency: 'EGP',
	}
}

const employeeRoleOptions: Array<{ value: AdminEmployeeRole; label: string }> =
	[
		{ value: 'admin', label: 'Admin' },
		{ value: 'sales', label: 'Sales' },
		{ value: 'inventory', label: 'Inventory' },
		{ value: 'warehouse', label: 'Warehouse' },
		{ value: 'finance', label: 'Finance' },
		{ value: 'dispatch', label: 'Dispatch' },
		{ value: 'customer_service', label: 'Customer service' },
		{ value: 'driver_manager', label: 'Driver manager' },
		{ value: 'ceo', label: 'CEO' },
	]

export function EmployeesVolume({ onOpenVolumes }: EmployeesVolumeProps) {
	const { t } = useTranslation('admin')
	const qc = useQueryClient()
	const volume = getVolume('employees')
	const { exportStatus, isExporting, requestExport } =
		useAdminExport('employees')

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
		rowToDraft: (row) => ({ ...row, password: '' }),
		rowId: (row) => row.id,
		draftId: (row) => row.id,
	})

	const createMutation = useMutation({
		mutationFn: (payload: EmployeePayload) =>
			adminCreateEmployee({ data: payload }),
		onSuccess: (created) => {
			qc.invalidateQueries({ queryKey: ['admin', 'employees'] })
			showSavedDraft({ ...created }, created.id)
		},
	})

	const updateMutation = useMutation({
		mutationFn: (payload: { id: string } & Partial<EmployeePayload>) =>
			adminUpdateEmployee({ data: payload }),
		onSuccess: (updated) => {
			qc.invalidateQueries({ queryKey: ['admin', 'employees'] })
			showSavedDraft({ ...updated }, updated.id)
		},
	})

	const deleteMutation = useMutation({
		mutationFn: (payload: { id: string; reason: string }) =>
			adminDeleteEmployee({ data: payload }),
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
		const reason = promptAdminDeleteReason({
			confirmMessage: t('actions.confirmDelete'),
			promptMessage: 'Reason for disabling this employee',
		})
		if (!reason) return
		deleteMutation.mutate({ id: draft.id, reason })
	}

	const statusOptions: Array<{
		value: AdminEmployeeRow['status']
		label: string
	}> = [
		{ value: 'invited', label: 'Invited' },
		{ value: 'active', label: 'Active' },
		{ value: 'disabled', label: 'Disabled' },
	]

	function toggleRole(role: AdminEmployeeRole, checked: boolean) {
		if (!draft) return
		const roles = checked
			? Array.from(new Set([...draft.roles, role]))
			: draft.roles.filter((current) => current !== role)
		setDraft({ ...draft, roles })
	}

	const columns: ColumnDef<AdminEmployeeRow>[] = [
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
			key: 'email',
			labelKey: 'volumes.employees.columns.email',
			width: 'minmax(180px, 1.4fr)',
			mobileRole: 'detail',
			render: (r) => (
				<span className="break-words text-[var(--color-text-muted)]">
					{r.email}
				</span>
			),
		},
		{
			key: 'roles',
			labelKey: 'volumes.employees.columns.roles',
			width: 'minmax(180px, 1.4fr)',
			mobileRole: 'detail',
			render: (r) => (
				<span className="break-words text-[var(--color-text-muted)]">
					{r.roles.length ? r.roles.join(', ') : '—'}
				</span>
			),
		},
		{
			key: 'title',
			labelKey: 'volumes.employees.columns.title',
			width: 'minmax(140px, 1fr)',
			mobileRole: 'detail',
			render: (r) => (
				<span className="break-words text-[var(--color-text-muted)]">
					{r.title || '—'}
				</span>
			),
		},
		{
			key: 'status',
			labelKey: 'volumes.employees.columns.status',
			width: '110px',
			mobileRole: 'detail',
			render: (r) => (
				<StatusTag
					label={r.status}
					tone={r.status === 'active' ? 'primary' : 'muted'}
				/>
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
		{
			key: 'baseSalary',
			labelKey: 'volumes.employees.columns.salary',
			width: 'minmax(120px, 0.8fr)',
			mono: true,
			mobileRole: 'detail',
			render: (r) => (
				<>
					{r.salaryCurrency}{' '}
					{r.baseSalary.toLocaleString('en-EG', {
						maximumFractionDigits: 2,
					})}
				</>
			),
		},
	]

	const filter = (r: AdminEmployeeRow, q: string) =>
		r.name.toLowerCase().includes(q) ||
		r.email.toLowerCase().includes(q) ||
		r.department.toLowerCase().includes(q) ||
		r.title.toLowerCase().includes(q) ||
		r.roles.join(' ').toLowerCase().includes(q) ||
		r.phone.includes(q) ||
		String(r.baseSalary).includes(q) ||
		r.id.toLowerCase().includes(q)
	const mutationError =
		createMutation.error instanceof Error
			? createMutation.error.message
			: updateMutation.error instanceof Error
				? updateMutation.error.message
				: null

	return (
		<VolumeWorkspace
			volume={volume}
			volumeId="employees"
			rows={employees}
			columns={columns}
			rowKey={(r) => r.id}
			onRowSelect={handleRowSelect}
			onNewEntry={handleNew}
			filter={filter}
			isLoading={employeesPending}
			isError={employeesError}
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
					<Section title={t('editor.section.identity')} />
					<Field label={t('editor.fields.name')} required>
						<TextControl
							value={draft.name}
							onChange={(v) => setDraft({ ...draft, name: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.name')}
						/>
					</Field>
					<Section title={t('editor.section.contact')} />
					<Field label={t('editor.fields.email')} required>
						<TextControl
							value={draft.email}
							onChange={(v) => setDraft({ ...draft, email: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.email')}
							type="email"
						/>
					</Field>
					<Field label={t('editor.fields.phone')} required>
						<TextControl
							value={draft.phone}
							onChange={(v) => setDraft({ ...draft, phone: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.phone')}
							type="tel"
						/>
					</Field>
					{!readOnly && (
						<Field
							label={t('editor.fields.password')}
							required={mode === 'create'}
						>
							<TextControl
								value={draft.password ?? ''}
								onChange={(v) => setDraft({ ...draft, password: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.password')}
								type="password"
							/>
						</Field>
					)}
					{mutationError && (
						<p
							className="rounded-md border border-[#B91C1C]/20 bg-[#B91C1C]/5 px-3 py-2 text-sm text-[#B91C1C]"
							role="alert"
						>
							{mutationError}
						</p>
					)}

					<Section title={t('editor.section.assignment')} />
					<Field label={t('editor.fields.status')}>
						<SelectControl
							value={draft.status}
							onChange={(v) => setDraft({ ...draft, status: v })}
							options={statusOptions}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.status')}
						/>
					</Field>
					<Field label={t('editor.fields.roles')}>
						{readOnly ? (
							<span className="flex flex-wrap gap-1.5">
								{draft.roles.length ? (
									draft.roles.map((role) => (
										<StatusTag key={role} label={role} tone="neutral" />
									))
								) : (
									<StatusTag label="No roles" tone="muted" />
								)}
							</span>
						) : (
							<div className="grid gap-2 sm:grid-cols-2">
								{employeeRoleOptions.map((role) => (
									<RoleSwitch
										key={role.value}
										label={role.label}
										isSelected={draft.roles.includes(role.value)}
										onPress={() =>
											toggleRole(role.value, !draft.roles.includes(role.value))
										}
									/>
								))}
							</div>
						)}
					</Field>
					<Field label={t('editor.fields.isCeo')}>
						{readOnly ? (
							<StatusTag
								label={draft.isCeo ? 'CEO access' : 'Standard employee'}
								tone={draft.isCeo ? 'primary' : 'neutral'}
							/>
						) : (
							<Toggle
								isSelected={draft.isCeo}
								onChange={(checked) => setDraft({ ...draft, isCeo: checked })}
								aria-label={t('editor.fields.isCeo')}
							/>
						)}
					</Field>

					<Section title={t('editor.section.compensation')} />
					<Field label={t('editor.fields.title')}>
						<TextControl
							value={draft.title}
							onChange={(v) => setDraft({ ...draft, title: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.title')}
						/>
					</Field>
					<Field label={t('editor.fields.department')}>
						<TextControl
							value={draft.department}
							onChange={(v) => setDraft({ ...draft, department: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.department')}
						/>
					</Field>
					<Field label={t('editor.fields.hireDate')}>
						<TextControl
							value={draft.hireDate}
							onChange={(v) => setDraft({ ...draft, hireDate: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.hireDate')}
							type="date"
						/>
					</Field>
					<Field label={t('editor.fields.salaryCurrency')}>
						<TextControl
							value={draft.salaryCurrency}
							onChange={(v) =>
								setDraft({ ...draft, salaryCurrency: v.toUpperCase() })
							}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.salaryCurrency')}
						/>
					</Field>
					<Field label={t('editor.fields.baseSalary')}>
						<NumberControl
							value={draft.baseSalary}
							onChange={(v) => setDraft({ ...draft, baseSalary: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.baseSalary')}
							min={0}
							step={100}
							suffix={draft.salaryCurrency}
						/>
					</Field>
					<Field label={t('editor.fields.socialInsuranceSalary')}>
						<NumberControl
							value={draft.socialInsuranceSalary}
							onChange={(v) => setDraft({ ...draft, socialInsuranceSalary: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.socialInsuranceSalary')}
							min={0}
							step={100}
							suffix={draft.salaryCurrency}
						/>
					</Field>
				</div>
			)}
		</VolumeWorkspace>
	)
}

function RoleSwitch({
	label,
	isSelected,
	onPress,
}: {
	label: string
	isSelected: boolean
	onPress: () => void
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={isSelected}
			aria-label={label}
			onClick={onPress}
			className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-[var(--color-border)] px-3 py-2 text-start outline-none transition-colors hover:bg-black/[0.02] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25 dark:hover:bg-white/[0.03]"
		>
			<span className="font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-[var(--color-text)]">
				{label}
			</span>
			<span
				aria-hidden="true"
				className={`flex h-4 w-7 rounded-full p-0.5 transition-colors ${
					isSelected
						? 'bg-[var(--color-primary)]'
						: 'bg-black/[0.06] dark:bg-white/[0.08]'
				}`}
			>
				<span
					className={`h-3 w-3 rounded-full bg-white shadow transition-transform dark:bg-black ${
						isSelected ? 'translate-x-3' : ''
					}`}
				/>
			</span>
		</button>
	)
}
