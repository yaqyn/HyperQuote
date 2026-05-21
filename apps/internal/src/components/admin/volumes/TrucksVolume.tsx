import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TruckRow } from '../../../lib/db/types'
import {
	adminCreateTruck,
	adminDeleteTruck,
	adminListDrivers,
	adminListTrucks,
	adminUpdateTruck,
} from '../../../lib/server/admin'
import { getVolume } from '../../../types/admin'
import {
	NumberControl,
	SelectControl,
	StatusTag,
	TextControl,
} from '../AdminControls'
import { Field, Section } from '../EntityEditor'
import type { ColumnDef } from '../EntityIndex'
import { useVolumeEditor, VolumeWorkspace } from './volumeEditor'

type TruckDraft = Omit<TruckRow, 'id' | 'createdAt'> & {
	id?: string
	createdAt?: string
}

type TruckPayload = Omit<TruckDraft, 'driverName'>

interface TrucksVolumeProps {
	onOpenVolumes: () => void
}

function blankTruck(): TruckDraft {
	return {
		plateNumber: '',
		driverId: null,
		driverName: null,
		capacityTons: 0,
		bodyType: 'flatbed',
		status: 'available',
	}
}

export function TrucksVolume({ onOpenVolumes }: TrucksVolumeProps) {
	const { t } = useTranslation('admin')
	const qc = useQueryClient()
	const volume = getVolume('trucks')

	const {
		data: trucks = [],
		isError: trucksError,
		isPending: trucksPending,
	} = useQuery({
		queryKey: ['admin', 'trucks'],
		queryFn: () => adminListTrucks(),
	})
	const { data: drivers = [] } = useQuery({
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
		rows: trucks,
		blankDraft: blankTruck,
		rowToDraft: (row) => ({ ...row }),
		rowId: (row) => row.id,
		draftId: (row) => row.id,
	})

	const createMutation = useMutation({
		mutationFn: (payload: TruckPayload) => adminCreateTruck({ data: payload }),
		onSuccess: (created) => {
			qc.invalidateQueries({ queryKey: ['admin', 'trucks'] })
			showSavedDraft({ ...created }, created.id)
		},
	})

	const updateMutation = useMutation({
		mutationFn: (payload: { id: string } & Partial<TruckPayload>) =>
			adminUpdateTruck({ data: payload }),
		onSuccess: (updated) => {
			qc.invalidateQueries({ queryKey: ['admin', 'trucks'] })
			showSavedDraft({ ...updated }, updated.id)
		},
	})

	const deleteMutation = useMutation({
		mutationFn: (id: string) => adminDeleteTruck({ data: { id } }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['admin', 'trucks'] })
			handleClose()
		},
	})

	function truckPayloadFromDraft(value: TruckDraft): TruckPayload {
		return {
			plateNumber: value.plateNumber,
			driverId: value.driverId,
			capacityTons: value.capacityTons,
			bodyType: value.bodyType,
			status: value.status,
		}
	}

	function handleSave() {
		if (!draft) return
		const payload = truckPayloadFromDraft(draft)
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
		deleteMutation.mutate(draft.id)
	}

	const bodyOptions: Array<{ value: TruckRow['bodyType']; label: string }> = [
		{ value: 'flatbed', label: t('editor.enums.bodyType.flatbed') },
		{ value: 'curtain-side', label: t('editor.enums.bodyType.curtain-side') },
		{ value: 'box', label: t('editor.enums.bodyType.box') },
		{ value: 'tipper', label: t('editor.enums.bodyType.tipper') },
	]

	const statusOptions: Array<{ value: TruckRow['status']; label: string }> = [
		{ value: 'available', label: t('editor.enums.truckStatus.available') },
		{ value: 'loading', label: t('editor.enums.truckStatus.loading') },
		{ value: 'dispatched', label: t('editor.enums.truckStatus.dispatched') },
		{ value: 'maintenance', label: t('editor.enums.truckStatus.maintenance') },
	]

	const driverOptions = [
		{ value: '', label: '—' },
		...drivers
			.filter((driver) => driver.status !== 'disabled')
			.map((driver) => ({
				value: driver.id,
				label: `${driver.fullName} · ${driver.phone}`,
			})),
	]

	const columns: ColumnDef<TruckRow>[] = [
		{
			key: 'plate',
			labelKey: 'volumes.trucks.columns.plate',
			width: '120px',
			mono: true,
			mobileRole: 'primary',
			render: (r) => (
				<span className="font-semibold text-[var(--color-text)]">
					{r.plateNumber}
				</span>
			),
		},
		{
			key: 'driver',
			labelKey: 'volumes.trucks.columns.driver',
			width: 'minmax(160px, 1.4fr)',
			mobileRole: 'detail',
			render: (r) => <>{r.driverName ?? '—'}</>,
		},
		{
			key: 'capacity',
			labelKey: 'volumes.trucks.columns.capacity',
			width: '100px',
			mono: true,
			align: 'end',
			mobileRole: 'detail',
			render: (r) => (
				<span>
					{r.capacityTons}
					<span className="ml-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
						t
					</span>
				</span>
			),
		},
		{
			key: 'body',
			labelKey: 'volumes.trucks.columns.body',
			width: '120px',
			mobileRole: 'detail',
			render: (r) => (
				<span className="text-[var(--color-text-muted)]">
					{t(`editor.enums.bodyType.${r.bodyType}`)}
				</span>
			),
		},
		{
			key: 'status',
			labelKey: 'volumes.trucks.columns.status',
			width: '140px',
			mobileRole: 'detail',
			render: (r) => (
				<StatusTag
					label={t(`editor.enums.truckStatus.${r.status}`)}
					tone={
						r.status === 'available'
							? 'primary'
							: r.status === 'maintenance'
								? 'muted'
								: 'neutral'
					}
				/>
			),
		},
	]

	const filter = (r: TruckRow, q: string) =>
		r.plateNumber.toLowerCase().includes(q) ||
		(r.driverName?.toLowerCase().includes(q) ?? false) ||
		r.id.toLowerCase().includes(q)

	return (
		<VolumeWorkspace
			volume={volume}
			volumeId="trucks"
			rows={trucks}
			columns={columns}
			rowKey={(r) => r.id}
			onRowSelect={handleRowSelect}
			onNewEntry={handleNew}
			filter={filter}
			isLoading={trucksPending}
			isError={trucksError}
			onOpenVolumes={onOpenVolumes}
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
					<Section title={t('editor.section.vehicle')} />
					<Field label={t('editor.fields.plateNumber')} required>
						<TextControl
							value={draft.plateNumber}
							onChange={(v) => setDraft({ ...draft, plateNumber: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.plateNumber')}
						/>
					</Field>
					<div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
						<Field label={t('editor.fields.bodyType')}>
							<SelectControl
								value={draft.bodyType}
								onChange={(v) => setDraft({ ...draft, bodyType: v })}
								options={bodyOptions}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.bodyType')}
							/>
						</Field>
						<Field label={t('editor.fields.capacityTons')}>
							<NumberControl
								value={draft.capacityTons}
								onChange={(v) => setDraft({ ...draft, capacityTons: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.capacityTons')}
								min={0}
								step={0.5}
								suffix="t"
							/>
						</Field>
					</div>

					<Section title={t('editor.section.assignment')} />
					<Field label={t('editor.fields.assignedDriver')}>
						<SelectControl
							value={draft.driverId ?? ''}
							onChange={(v) => setDraft({ ...draft, driverId: v || null })}
							options={driverOptions}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.assignedDriver')}
						/>
					</Field>
					<Field label={t('editor.fields.status')}>
						<SelectControl
							value={draft.status}
							onChange={(v) => setDraft({ ...draft, status: v })}
							options={statusOptions}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.status')}
						/>
					</Field>
				</div>
			)}
		</VolumeWorkspace>
	)
}
