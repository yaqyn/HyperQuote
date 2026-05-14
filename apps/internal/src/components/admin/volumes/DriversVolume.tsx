import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TruckRow } from '../../../lib/db/db'
import {
	adminCreateTruck,
	adminDeleteTruck,
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
import { EntityEditor, Field, Section } from '../EntityEditor'
import { type ColumnDef, EntityIndex } from '../EntityIndex'
import { RegistryMasthead } from '../RegistryMasthead'
import { useVolumeEditor, VolumeEditorFooter } from './volumeEditor'

type TruckDraft = Omit<TruckRow, 'id'> & { id?: string }

interface DriversVolumeProps {
	onOpenVolumes: () => void
}

function blankTruck(): TruckDraft {
	return {
		plateNumber: '',
		driverName: '',
		driverPhone: '',
		capacityTons: 0,
		bodyType: 'flatbed',
		status: 'available',
	}
}

export function DriversVolume({ onOpenVolumes }: DriversVolumeProps) {
	const { t } = useTranslation('admin')
	const qc = useQueryClient()
	const volume = getVolume('drivers')

	const {
		data: trucks = [],
		isError: trucksError,
		isPending: trucksPending,
	} = useQuery({
		queryKey: ['admin', 'drivers'],
		queryFn: () => adminListTrucks(),
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
		mutationFn: (payload: Omit<TruckRow, 'id'>) =>
			adminCreateTruck({ data: payload }),
		onSuccess: (created) => {
			qc.invalidateQueries({ queryKey: ['admin', 'drivers'] })
			showSavedDraft({ ...created }, created.id)
		},
	})

	const updateMutation = useMutation({
		mutationFn: (payload: { id: string } & Partial<Omit<TruckRow, 'id'>>) =>
			adminUpdateTruck({ data: payload }),
		onSuccess: (updated) => {
			qc.invalidateQueries({ queryKey: ['admin', 'drivers'] })
			showSavedDraft({ ...updated }, updated.id)
		},
	})

	const deleteMutation = useMutation({
		mutationFn: (id: string) => adminDeleteTruck({ data: { id } }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['admin', 'drivers'] })
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

	const columns: ColumnDef<TruckRow>[] = [
		{
			key: 'plate',
			labelKey: 'volumes.drivers.columns.plate',
			width: '120px',
			mono: true,
			mobileRole: 'detail',
			render: (r) => (
				<span className="text-[var(--color-text)]">{r.plateNumber}</span>
			),
		},
		{
			key: 'driver',
			labelKey: 'volumes.drivers.columns.driver',
			width: 'minmax(140px, 1.4fr)',
			mobileRole: 'primary',
			render: (r) => (
				<span className="break-words font-semibold text-[var(--color-text)]">
					{r.driverName}
				</span>
			),
		},
		{
			key: 'phone',
			labelKey: 'volumes.drivers.columns.phone',
			width: 'minmax(120px, 1fr)',
			mono: true,
			mobileRole: 'detail',
			render: (r) => <>{r.driverPhone}</>,
		},
		{
			key: 'capacity',
			labelKey: 'volumes.drivers.columns.capacity',
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
			labelKey: 'volumes.drivers.columns.body',
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
			labelKey: 'volumes.drivers.columns.status',
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
		r.driverName.toLowerCase().includes(q) ||
		r.driverPhone.includes(q) ||
		r.id.toLowerCase().includes(q)

	return (
		<>
			<RegistryMasthead
				volume={volume}
				entryCount={trucks.length}
				onOpenVolumes={onOpenVolumes}
				onNewEntry={handleNew}
			/>
			<EntityIndex
				volume="drivers"
				rows={trucks}
				columns={columns}
				rowKey={(r) => r.id}
				onRowSelect={handleRowSelect}
				onNewEntry={handleNew}
				filter={filter}
				isLoading={trucksPending}
				isError={trucksError}
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

						<Section title={t('editor.section.contact')} />
						<Field label={t('editor.fields.driverName')} required>
							<TextControl
								value={draft.driverName}
								onChange={(v) => setDraft({ ...draft, driverName: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.driverName')}
							/>
						</Field>
						<Field label={t('editor.fields.driverPhone')} required>
							<TextControl
								value={draft.driverPhone}
								onChange={(v) => setDraft({ ...draft, driverPhone: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.driverPhone')}
								type="tel"
							/>
						</Field>
					</div>
				)}
			</EntityEditor>
		</>
	)
}
