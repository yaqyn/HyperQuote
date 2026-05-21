import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	type AdminCustomerAddressRow,
	type AdminCustomerProjectRow,
	adminCreateCustomerAddress,
	adminCreateCustomerProject,
	adminDeleteCustomerAddress,
	adminDeleteCustomerProject,
	adminListCustomerAddresses,
	adminListCustomerProjects,
	adminUpdateCustomerAddress,
	adminUpdateCustomerProject,
} from '../../lib/server/admin'
import {
	EmployeeActionButton,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'
import { Toggle } from '../ui/Toggle'
import {
	LinkAction,
	NumberControl,
	StatusTag,
	TextAreaControl,
	TextControl,
} from './AdminControls'
import { Field } from './EntityEditor'

type AddressDraft = Omit<AdminCustomerAddressRow, 'id' | 'createdAt'> & {
	id?: string
	createdAt?: string
}

type ProjectDraft = Omit<AdminCustomerProjectRow, 'id' | 'createdAt'> & {
	id?: string
	createdAt?: string
}

function blankAddress(customerId: string): AddressDraft {
	return {
		customerId,
		label: 'Primary',
		street: '',
		area: '',
		city: '',
		governorate: '',
		landmark: '',
		phone: '',
		postalCode: '',
		isDefault: false,
		latitude: null,
		longitude: null,
	}
}

function blankProject(customerId: string): ProjectDraft {
	return {
		customerId,
		name: '',
		description: '',
		archived: false,
	}
}

export function CustomerSubrecords({
	customerId,
	readOnly,
}: {
	customerId: string | null | undefined
	readOnly: boolean
}) {
	const { t } = useTranslation('admin')
	if (!customerId) {
		return (
			<EmployeeStatusPill>
				{t('customerSubrecords.saveFirst')}
			</EmployeeStatusPill>
		)
	}

	return (
		<div className="space-y-6">
			<CustomerAddresses customerId={customerId} readOnly={readOnly} />
			<CustomerProjects customerId={customerId} readOnly={readOnly} />
		</div>
	)
}

function CustomerAddresses({
	customerId,
	readOnly,
}: {
	customerId: string
	readOnly: boolean
}) {
	const { t } = useTranslation('admin')
	const qc = useQueryClient()
	const [draft, setDraft] = useState<AddressDraft | null>(null)
	const {
		data: addresses = [],
		isError,
		isPending,
	} = useQuery({
		queryKey: ['admin', 'customerAddresses', customerId],
		queryFn: () => adminListCustomerAddresses({ data: { customerId } }),
	})
	const createMutation = useMutation({
		mutationFn: (payload: AddressDraft) =>
			adminCreateCustomerAddress({ data: addressPayload(payload) }),
		onSuccess: () => {
			qc.invalidateQueries({
				queryKey: ['admin', 'customerAddresses', customerId],
			})
			qc.invalidateQueries({ queryKey: ['admin', 'customers'] })
			setDraft(null)
		},
	})
	const updateMutation = useMutation({
		mutationFn: (payload: AddressDraft & { id: string }) =>
			adminUpdateCustomerAddress({
				data: { id: payload.id, ...addressPayload(payload) },
			}),
		onSuccess: () => {
			qc.invalidateQueries({
				queryKey: ['admin', 'customerAddresses', customerId],
			})
			qc.invalidateQueries({ queryKey: ['admin', 'customers'] })
			setDraft(null)
		},
	})
	const deleteMutation = useMutation({
		mutationFn: (id: string) => adminDeleteCustomerAddress({ data: { id } }),
		onSuccess: () => {
			qc.invalidateQueries({
				queryKey: ['admin', 'customerAddresses', customerId],
			})
			qc.invalidateQueries({ queryKey: ['admin', 'customers'] })
		},
	})

	function saveAddress() {
		if (!draft) return
		if (draft.id) updateMutation.mutate({ ...draft, id: draft.id })
		else createMutation.mutate(draft)
	}

	return (
		<div className="space-y-3">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<p className="font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-[var(--color-text)]">
					{t('customerSubrecords.addresses')}
				</p>
				{!readOnly && (
					<EmployeeActionButton
						onClick={() => setDraft(blankAddress(customerId))}
						tone="primary"
						size="sm"
						leading={<Plus size={14} strokeWidth={2.2} />}
					>
						{t('customerSubrecords.addAddress')}
					</EmployeeActionButton>
				)}
			</div>
			{isError ? (
				<EmployeeStatusPill tone="danger">
					{t('customerSubrecords.addressError')}
				</EmployeeStatusPill>
			) : isPending ? (
				<EmployeeStatusPill>
					{t('customerSubrecords.loading')}
				</EmployeeStatusPill>
			) : addresses.length === 0 ? (
				<EmployeeStatusPill>
					{t('customerSubrecords.noAddresses')}
				</EmployeeStatusPill>
			) : (
				<ul className="space-y-2">
					{addresses.map((address) => (
						<li
							key={address.id}
							className="rounded-md border border-[var(--color-border)] p-3"
						>
							<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div className="min-w-0">
									<p className="break-words font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-[var(--color-text)]">
										{address.label || address.street}
									</p>
									<p className="mt-1 break-words font-[family-name:var(--font-archivo)] text-[12px] leading-relaxed text-[var(--color-text-muted)]">
										{[
											address.street,
											address.area,
											address.city,
											address.governorate,
										]
											.filter(Boolean)
											.join(', ')}
									</p>
									{address.isDefault && (
										<div className="mt-2">
											<StatusTag
												label={t('customerSubrecords.default')}
												tone="primary"
											/>
										</div>
									)}
								</div>
								{!readOnly && (
									<div className="flex shrink-0 gap-2">
										<EmployeeActionButton
											onClick={() => setDraft({ ...address })}
											tone="neutral"
											size="sm"
											leading={<Edit3 size={13} strokeWidth={2.2} />}
										>
											{t('actions.edit')}
										</EmployeeActionButton>
										<EmployeeActionButton
											onClick={() => {
												if (
													typeof window !== 'undefined' &&
													!window.confirm(t('actions.confirmDelete'))
												)
													return
												deleteMutation.mutate(address.id)
											}}
											tone="danger"
											size="sm"
											leading={<Trash2 size={13} strokeWidth={2.2} />}
										>
											{t('actions.delete')}
										</EmployeeActionButton>
									</div>
								)}
							</div>
						</li>
					))}
				</ul>
			)}
			{draft && (
				<div className="rounded-md border border-[var(--color-border)] bg-black/[0.015] p-3 dark:bg-white/[0.02]">
					<AddressForm draft={draft} setDraft={setDraft} />
					<div className="mt-3 flex flex-col gap-2 sm:flex-row">
						<LinkAction
							tone="primary"
							onClick={saveAddress}
							disabled={createMutation.isPending || updateMutation.isPending}
						>
							{t('actions.save')}
						</LinkAction>
						<LinkAction onClick={() => setDraft(null)}>
							{t('actions.cancel')}
						</LinkAction>
					</div>
				</div>
			)}
		</div>
	)
}

function CustomerProjects({
	customerId,
	readOnly,
}: {
	customerId: string
	readOnly: boolean
}) {
	const { t } = useTranslation('admin')
	const qc = useQueryClient()
	const [draft, setDraft] = useState<ProjectDraft | null>(null)
	const {
		data: projects = [],
		isError,
		isPending,
	} = useQuery({
		queryKey: ['admin', 'customerProjects', customerId],
		queryFn: () => adminListCustomerProjects({ data: { customerId } }),
	})
	const createMutation = useMutation({
		mutationFn: (payload: ProjectDraft) =>
			adminCreateCustomerProject({ data: projectPayload(payload) }),
		onSuccess: () => {
			qc.invalidateQueries({
				queryKey: ['admin', 'customerProjects', customerId],
			})
			setDraft(null)
		},
	})
	const updateMutation = useMutation({
		mutationFn: (payload: ProjectDraft & { id: string }) =>
			adminUpdateCustomerProject({
				data: { id: payload.id, ...projectPayload(payload) },
			}),
		onSuccess: () => {
			qc.invalidateQueries({
				queryKey: ['admin', 'customerProjects', customerId],
			})
			setDraft(null)
		},
	})
	const deleteMutation = useMutation({
		mutationFn: (id: string) => adminDeleteCustomerProject({ data: { id } }),
		onSuccess: () => {
			qc.invalidateQueries({
				queryKey: ['admin', 'customerProjects', customerId],
			})
		},
	})

	function saveProject() {
		if (!draft) return
		if (draft.id) updateMutation.mutate({ ...draft, id: draft.id })
		else createMutation.mutate(draft)
	}

	return (
		<div className="space-y-3">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<p className="font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-[var(--color-text)]">
					{t('customerSubrecords.projects')}
				</p>
				{!readOnly && (
					<EmployeeActionButton
						onClick={() => setDraft(blankProject(customerId))}
						tone="primary"
						size="sm"
						leading={<Plus size={14} strokeWidth={2.2} />}
					>
						{t('customerSubrecords.addProject')}
					</EmployeeActionButton>
				)}
			</div>
			{isError ? (
				<EmployeeStatusPill tone="danger">
					{t('customerSubrecords.projectError')}
				</EmployeeStatusPill>
			) : isPending ? (
				<EmployeeStatusPill>
					{t('customerSubrecords.loading')}
				</EmployeeStatusPill>
			) : projects.length === 0 ? (
				<EmployeeStatusPill>
					{t('customerSubrecords.noProjects')}
				</EmployeeStatusPill>
			) : (
				<ul className="space-y-2">
					{projects.map((project) => (
						<li
							key={project.id}
							className="rounded-md border border-[var(--color-border)] p-3"
						>
							<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div className="min-w-0">
									<p className="break-words font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-[var(--color-text)]">
										{project.name}
									</p>
									<p className="mt-1 break-words font-[family-name:var(--font-archivo)] text-[12px] leading-relaxed text-[var(--color-text-muted)]">
										{project.description || '—'}
									</p>
									{project.archived && (
										<div className="mt-2">
											<StatusTag
												label={t('customerSubrecords.archived')}
												tone="muted"
											/>
										</div>
									)}
								</div>
								{!readOnly && (
									<div className="flex shrink-0 gap-2">
										<EmployeeActionButton
											onClick={() => setDraft({ ...project })}
											tone="neutral"
											size="sm"
											leading={<Edit3 size={13} strokeWidth={2.2} />}
										>
											{t('actions.edit')}
										</EmployeeActionButton>
										<EmployeeActionButton
											onClick={() => deleteMutation.mutate(project.id)}
											tone="danger"
											size="sm"
											leading={<Trash2 size={13} strokeWidth={2.2} />}
										>
											{t('customerSubrecords.archive')}
										</EmployeeActionButton>
									</div>
								)}
							</div>
						</li>
					))}
				</ul>
			)}
			{draft && (
				<div className="rounded-md border border-[var(--color-border)] bg-black/[0.015] p-3 dark:bg-white/[0.02]">
					<ProjectForm draft={draft} setDraft={setDraft} />
					<div className="mt-3 flex flex-col gap-2 sm:flex-row">
						<LinkAction
							tone="primary"
							onClick={saveProject}
							disabled={createMutation.isPending || updateMutation.isPending}
						>
							{t('actions.save')}
						</LinkAction>
						<LinkAction onClick={() => setDraft(null)}>
							{t('actions.cancel')}
						</LinkAction>
					</div>
				</div>
			)}
		</div>
	)
}

function AddressForm({
	draft,
	setDraft,
}: {
	draft: AddressDraft
	setDraft: (draft: AddressDraft) => void
}) {
	const { t } = useTranslation('admin')
	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-4 lg:grid lg:grid-cols-2">
				<Field label={t('editor.fields.addressLabel')}>
					<TextControl
						value={draft.label}
						onChange={(v) => setDraft({ ...draft, label: v })}
						ariaLabel={t('editor.fields.addressLabel')}
					/>
				</Field>
				<Field label={t('editor.fields.addressPhone')}>
					<TextControl
						value={draft.phone}
						onChange={(v) => setDraft({ ...draft, phone: v })}
						ariaLabel={t('editor.fields.addressPhone')}
						type="tel"
					/>
				</Field>
			</div>
			<Field label={t('editor.fields.street')} required>
				<TextAreaControl
					value={draft.street}
					onChange={(v) => setDraft({ ...draft, street: v })}
					ariaLabel={t('editor.fields.street')}
					rows={2}
				/>
			</Field>
			<div className="flex flex-col gap-4 lg:grid lg:grid-cols-2">
				<Field label={t('editor.fields.area')}>
					<TextControl
						value={draft.area}
						onChange={(v) => setDraft({ ...draft, area: v })}
						ariaLabel={t('editor.fields.area')}
					/>
				</Field>
				<Field label={t('editor.fields.city')} required>
					<TextControl
						value={draft.city}
						onChange={(v) => setDraft({ ...draft, city: v })}
						ariaLabel={t('editor.fields.city')}
					/>
				</Field>
				<Field label={t('editor.fields.governorate')} required>
					<TextControl
						value={draft.governorate}
						onChange={(v) => setDraft({ ...draft, governorate: v })}
						ariaLabel={t('editor.fields.governorate')}
					/>
				</Field>
				<Field label={t('editor.fields.postalCode')}>
					<TextControl
						value={draft.postalCode}
						onChange={(v) => setDraft({ ...draft, postalCode: v })}
						ariaLabel={t('editor.fields.postalCode')}
					/>
				</Field>
				<Field label={t('editor.fields.latitude')}>
					<NumberControl
						value={draft.latitude ?? 0}
						onChange={(v) => setDraft({ ...draft, latitude: v })}
						ariaLabel={t('editor.fields.latitude')}
						step={0.0001}
					/>
				</Field>
				<Field label={t('editor.fields.longitude')}>
					<NumberControl
						value={draft.longitude ?? 0}
						onChange={(v) => setDraft({ ...draft, longitude: v })}
						ariaLabel={t('editor.fields.longitude')}
						step={0.0001}
					/>
				</Field>
			</div>
			<Field label={t('editor.fields.landmark')}>
				<TextAreaControl
					value={draft.landmark}
					onChange={(v) => setDraft({ ...draft, landmark: v })}
					ariaLabel={t('editor.fields.landmark')}
					rows={2}
				/>
			</Field>
			<Field label={t('editor.fields.isDefaultAddress')}>
				<Toggle
					isSelected={draft.isDefault}
					onChange={(checked) => setDraft({ ...draft, isDefault: checked })}
					aria-label={t('editor.fields.isDefaultAddress')}
				/>
			</Field>
		</div>
	)
}

function ProjectForm({
	draft,
	setDraft,
}: {
	draft: ProjectDraft
	setDraft: (draft: ProjectDraft) => void
}) {
	const { t } = useTranslation('admin')
	return (
		<div className="space-y-4">
			<Field label={t('editor.fields.projectName')} required>
				<TextControl
					value={draft.name}
					onChange={(v) => setDraft({ ...draft, name: v })}
					ariaLabel={t('editor.fields.projectName')}
				/>
			</Field>
			<Field label={t('editor.fields.description')}>
				<TextAreaControl
					value={draft.description}
					onChange={(v) => setDraft({ ...draft, description: v })}
					ariaLabel={t('editor.fields.description')}
					rows={3}
				/>
			</Field>
			<Field label={t('customerSubrecords.archived')}>
				<Toggle
					isSelected={draft.archived}
					onChange={(checked) => setDraft({ ...draft, archived: checked })}
					aria-label={t('customerSubrecords.archived')}
				/>
			</Field>
		</div>
	)
}

function addressPayload(draft: AddressDraft) {
	return {
		customerId: draft.customerId,
		label: draft.label,
		street: draft.street,
		area: draft.area,
		city: draft.city,
		governorate: draft.governorate,
		landmark: draft.landmark,
		phone: draft.phone,
		postalCode: draft.postalCode,
		isDefault: draft.isDefault,
		latitude: draft.latitude,
		longitude: draft.longitude,
	}
}

function projectPayload(draft: ProjectDraft) {
	return {
		customerId: draft.customerId,
		name: draft.name,
		description: draft.description,
		archived: draft.archived,
	}
}
