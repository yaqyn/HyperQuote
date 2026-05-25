import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { DriverRow } from '../../../lib/db/types'
import {
	adminCreateDriver,
	adminDeleteDriver,
	adminListDrivers,
	adminUpdateDriver,
} from '../../../lib/server/admin'
import { getVolume } from '../../../types/admin'
import { SelectControl, StatusTag, TextControl } from '../AdminControls'
import { Field, Section } from '../EntityEditor'
import type { ColumnDef } from '../EntityIndex'
import {
	promptAdminDeleteReason,
	useVolumeEditor,
	VolumeWorkspace,
} from './volumeEditor'

type DriverDraft = Omit<DriverRow, 'id' | 'createdAt'> & {
	id?: string
	createdAt?: string
	password?: string
}

type DriverPayload = Omit<DriverDraft, 'id' | 'createdAt' | 'userId'>

interface DriversVolumeProps {
	onOpenVolumes: () => void
}

function blankDriver(): DriverDraft {
	return {
		userId: null,
		fullName: '',
		email: '',
		phone: '',
		password: '',
		status: 'offline',
		vehicleLabel: '',
	}
}

export function DriversVolume({ onOpenVolumes }: DriversVolumeProps) {
	const { t } = useTranslation('admin')
	const qc = useQueryClient()
	const volume = getVolume('drivers')

	const {
		data: drivers = [],
		isError: driversError,
		isPending: driversPending,
	} = useQuery({
		queryKey: ['admin', 'drivers'],
		queryFn: () => adminListDrivers(),
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
		rows: drivers,
		blankDraft: blankDriver,
		rowToDraft: (row) => ({ ...row, password: '' }),
		rowId: (row) => row.id,
		draftId: (row) => row.id,
	})

	const createMutation = useMutation({
		mutationFn: (payload: DriverPayload) =>
			adminCreateDriver({ data: payload }),
		onSuccess: (created) => {
			qc.invalidateQueries({ queryKey: ['admin', 'drivers'] })
			showSavedDraft({ ...created, password: '' }, created.id)
		},
	})

	const updateMutation = useMutation({
		mutationFn: (payload: { id: string } & Partial<DriverPayload>) =>
			adminUpdateDriver({ data: payload }),
		onSuccess: (updated) => {
			qc.invalidateQueries({ queryKey: ['admin', 'drivers'] })
			qc.invalidateQueries({ queryKey: ['admin', 'trucks'] })
			showSavedDraft({ ...updated, password: '' }, updated.id)
		},
	})

	const deleteMutation = useMutation({
		mutationFn: (payload: { id: string; reason: string }) =>
			adminDeleteDriver({ data: payload }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['admin', 'drivers'] })
			qc.invalidateQueries({ queryKey: ['admin', 'trucks'] })
			handleClose()
		},
	})

	function driverPayloadFromDraft(value: DriverDraft): DriverPayload {
		return {
			fullName: value.fullName,
			email: value.email,
			phone: value.phone,
			password: value.password?.trim() ? value.password : undefined,
			status: value.status,
			vehicleLabel: value.vehicleLabel?.trim() ? value.vehicleLabel : null,
		}
	}

	function handleSave() {
		if (!draft) return
		if (passwordTooShort) return
		const payload = driverPayloadFromDraft(draft)
		if (mode === 'create') {
			createMutation.mutate(payload)
		} else if (mode === 'edit' && draft.id) {
			updateMutation.mutate({ id: draft.id, ...payload })
		}
	}

	function handleDelete() {
		if (!draft?.id) return
		const reason = promptAdminDeleteReason({
			confirmMessage: t('actions.confirmDelete'),
			promptMessage: 'Reason for disabling this driver',
		})
		if (!reason) return
		deleteMutation.mutate({ id: draft.id, reason })
	}

	const statusOptions: Array<{ value: DriverRow['status']; label: string }> = [
		{ value: 'invited', label: t('editor.enums.driverStatus.invited') },
		{ value: 'available', label: t('editor.enums.driverStatus.available') },
		{ value: 'on_delivery', label: t('editor.enums.driverStatus.on_delivery') },
		{ value: 'offline', label: t('editor.enums.driverStatus.offline') },
		{ value: 'disabled', label: t('editor.enums.driverStatus.disabled') },
	]

	const columns: ColumnDef<DriverRow>[] = [
		{
			key: 'name',
			labelKey: 'volumes.drivers.columns.name',
			width: 'minmax(180px, 1.5fr)',
			mobileRole: 'primary',
			render: (r) => (
				<span className="break-words font-semibold text-[var(--color-text)]">
					{r.fullName}
				</span>
			),
		},
		{
			key: 'email',
			labelKey: 'volumes.drivers.columns.email',
			width: 'minmax(190px, 1.4fr)',
			mobileRole: 'detail',
			render: (r) => (
				<span className="break-words text-[var(--color-text-muted)]">
					{r.email ?? '—'}
				</span>
			),
		},
		{
			key: 'phone',
			labelKey: 'volumes.drivers.columns.phone',
			width: 'minmax(120px, 1fr)',
			mono: true,
			mobileRole: 'detail',
			render: (r) => <>{r.phone}</>,
		},
		{
			key: 'vehicle',
			labelKey: 'volumes.drivers.columns.vehicle',
			width: 'minmax(120px, 1fr)',
			mobileRole: 'detail',
			render: (r) => <>{r.vehicleLabel ?? '—'}</>,
		},
		{
			key: 'status',
			labelKey: 'volumes.drivers.columns.status',
			width: '130px',
			mobileRole: 'detail',
			render: (r) => (
				<StatusTag
					label={t(`editor.enums.driverStatus.${r.status}`)}
					tone={
						r.status === 'available'
							? 'primary'
							: r.status === 'disabled'
								? 'muted'
								: 'neutral'
					}
				/>
			),
		},
	]

	const filter = (r: DriverRow, q: string) =>
		r.fullName.toLowerCase().includes(q) ||
		(r.email?.toLowerCase().includes(q) ?? false) ||
		r.phone.includes(q) ||
		(r.vehicleLabel?.toLowerCase().includes(q) ?? false) ||
		r.id.toLowerCase().includes(q)
	const passwordTooShort =
		Boolean(draft?.password?.trim()) &&
		(draft?.password?.trim().length ?? 0) < 6
	const mutationError =
		createMutation.error instanceof Error
			? createMutation.error.message
			: updateMutation.error instanceof Error
				? updateMutation.error.message
				: null

	return (
		<VolumeWorkspace
			volume={volume}
			volumeId="drivers"
			rows={drivers}
			columns={columns}
			rowKey={(r) => r.id}
			onRowSelect={handleRowSelect}
			onNewEntry={handleNew}
			filter={filter}
			isLoading={driversPending}
			isError={driversError}
			onOpenVolumes={onOpenVolumes}
			mode={mode}
			hasDraft={Boolean(draft)}
			idLabel={draft?.id ?? null}
			isSaving={createMutation.isPending || updateMutation.isPending}
			isDeleting={deleteMutation.isPending}
			saveDisabled={passwordTooShort}
			onClose={handleClose}
			onEdit={handleEdit}
			onSave={handleSave}
			onCancel={handleCancel}
			onDelete={handleDelete}
		>
			{draft && (
				<div className="space-y-6">
					<Section title={t('editor.section.identity')} />
					<Field label={t('editor.fields.driverName')} required>
						<TextControl
							value={draft.fullName}
							onChange={(v) => setDraft({ ...draft, fullName: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.driverName')}
						/>
					</Field>
					<Field label={t('editor.fields.driverEmail')} required>
						<TextControl
							value={draft.email ?? ''}
							onChange={(v) => setDraft({ ...draft, email: v || null })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.driverEmail')}
							type="email"
						/>
					</Field>
					<Field label={t('editor.fields.driverPhone')} required>
						<TextControl
							value={draft.phone}
							onChange={(v) => setDraft({ ...draft, phone: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.driverPhone')}
							type="tel"
						/>
					</Field>
					{!readOnly && (
						<Field
							label={t('editor.fields.driverPassword')}
							required={mode === 'create'}
						>
							<TextControl
								value={draft.password ?? ''}
								onChange={(v) => setDraft({ ...draft, password: v })}
								readOnly={false}
								ariaLabel={t('editor.fields.driverPassword')}
								type="password"
							/>
							{passwordTooShort && (
								<p className="mt-1.5 text-xs text-[#B91C1C]" role="alert">
									Driver passwords must be at least 6 characters.
								</p>
							)}
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

					<Section title={t('editor.section.operational')} />
					<Field label={t('editor.fields.status')}>
						<SelectControl
							value={draft.status}
							onChange={(v) => setDraft({ ...draft, status: v })}
							options={statusOptions}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.status')}
						/>
					</Field>
					<Field label={t('editor.fields.vehicleLabel')}>
						<TextControl
							value={draft.vehicleLabel ?? ''}
							onChange={(v) => setDraft({ ...draft, vehicleLabel: v || null })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.vehicleLabel')}
						/>
					</Field>
				</div>
			)}
		</VolumeWorkspace>
	)
}
