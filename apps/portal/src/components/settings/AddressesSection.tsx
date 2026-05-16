/**
 * Addresses settings section.
 * "Data is the design" — rows with bottom borders, no cards.
 * Default badge as tiny uppercase. Edit/delete as text links.
 * Dialog keeps glass elevated + isKeyboardDismissDisabled.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
	Button,
	Dialog,
	Heading,
	Input,
	Label,
	ListBox,
	ListBoxItem,
	Modal,
	ModalOverlay,
	Popover,
	Select,
	SelectValue,
	TextField,
} from 'react-aria-components'
import { type Control, Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { deleteAddress, saveAddress } from '../../lib/server/settings'
import type { Address } from '../../types/settings'

const EGYPTIAN_GOVERNORATES = [
	'Cairo',
	'Giza',
	'Alexandria',
	'Qalyubia',
	'Dakahlia',
	'Sharqia',
	'Gharbia',
	'Monufia',
	'Kafr El Sheikh',
	'Beheira',
	'Damietta',
	'Port Said',
	'Ismailia',
	'Suez',
	'North Sinai',
	'South Sinai',
	'Beni Suef',
	'Faiyum',
	'Minya',
	'Assiut',
	'Sohag',
	'Qena',
	'Luxor',
	'Aswan',
	'Red Sea',
	'New Valley',
	'Matrouh',
] as const

interface AddressesSectionProps {
	addresses: Address[]
}

interface AddressFormValues {
	label: string
	street: string
	city: string
	governorate: string
	postalCode: string
	isDefault: boolean
}

type AddressTextFieldName = 'label' | 'street' | 'city' | 'postalCode'

const labelClass =
	'text-[13px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)]'

const underlineInputClass =
	'w-full bg-transparent border-0 border-b border-[var(--color-border)] py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[#2563EB] placeholder:text-[var(--color-text-subtle)]'

export function AddressesSection({ addresses }: AddressesSectionProps) {
	const { t } = useTranslation('portal')
	const queryClient = useQueryClient()
	const [editingAddress, setEditingAddress] = useState<Address | null>(null)
	const [showForm, setShowForm] = useState(false)
	const [deletingId, setDeletingId] = useState<string | null>(null)

	const saveMutation = useMutation({
		mutationFn: (data: AddressFormValues & { id?: string }) =>
			saveAddress({ data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['addresses'] })
			setShowForm(false)
			setEditingAddress(null)
		},
	})

	const deleteMutation = useMutation({
		mutationFn: (addressId: string) => deleteAddress({ data: { addressId } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['addresses'] })
			setDeletingId(null)
		},
	})

	function handleEdit(address: Address) {
		setEditingAddress(address)
		setShowForm(true)
	}

	function handleAdd() {
		setEditingAddress(null)
		setShowForm(true)
	}

	return (
		<div className="space-y-6">
			{/* Add button */}
			<div className="flex justify-end">
				<Button
					onPress={handleAdd}
					className="px-4 py-2 bg-[#0F172A] text-white dark:bg-[#FAFAFA] dark:text-[#09090B] text-sm cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
				>
					{t('settings.addresses.addNew')}
				</Button>
			</div>

			{/* Address rows */}
			<div>
				{addresses.map((address) => (
					<div
						key={address.id}
						className="flex items-start justify-between py-4 border-b border-[var(--color-border)]"
					>
						<div className="space-y-0.5">
							<div className="flex items-center gap-3">
								<span className="text-sm text-[var(--color-text)]">
									{address.label}
								</span>
								{address.isDefault && (
									<span className="text-[13px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)]">
										{t('settings.addresses.default')}
									</span>
								)}
							</div>
							<p className="text-sm text-[var(--color-text-subtle)]">
								{address.street}
							</p>
							<p className="text-sm text-[var(--color-text-subtle)]">
								{address.city}, {address.governorate}
								{address.postalCode ? ` ${address.postalCode}` : ''}
							</p>
						</div>
						<div className="flex items-center gap-4">
							{!address.isDefault && (
								<Button
									onPress={() =>
										saveMutation.mutate({
											id: address.id,
											label: address.label,
											street: address.street,
											city: address.city,
											governorate: address.governorate,
											postalCode: address.postalCode ?? '',
											isDefault: true,
										})
									}
									className="text-[13px] text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
								>
									{t('settings.addresses.setDefault')}
								</Button>
							)}
							<Button
								onPress={() => handleEdit(address)}
								className="text-[13px] text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
							>
								{t('settings.addresses.edit')}
							</Button>
							<Button
								onPress={() => setDeletingId(address.id)}
								className="text-[13px] text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
							>
								{t('settings.addresses.delete')}
							</Button>
						</div>
					</div>
				))}

				{addresses.length === 0 && (
					<p className="py-8 text-sm text-[var(--color-text-subtle)] text-center">
						{t('settings.addresses.empty')}
					</p>
				)}
			</div>

			{/* Address form dialog */}
			{showForm && (
				<AddressFormDialog
					address={editingAddress}
					onSave={(data) =>
						saveMutation.mutate({
							...data,
							id: editingAddress?.id,
						})
					}
					onClose={() => {
						setShowForm(false)
						setEditingAddress(null)
					}}
					isPending={saveMutation.isPending}
				/>
			)}

			{/* Delete confirmation dialog */}
			{deletingId && (
				<DeleteConfirmDialog
					onConfirm={() => deleteMutation.mutate(deletingId)}
					onClose={() => setDeletingId(null)}
					isPending={deleteMutation.isPending}
				/>
			)}
		</div>
	)
}

// ============================================================================
// Address Form Dialog
// ============================================================================

function AddressFormDialog({
	address,
	onSave,
	onClose,
	isPending,
}: {
	address: Address | null
	onSave: (data: AddressFormValues) => void
	onClose: () => void
	isPending: boolean
}) {
	const { t } = useTranslation('portal')

	const { control, handleSubmit } = useForm<AddressFormValues>({
		defaultValues: {
			label: address?.label ?? '',
			street: address?.street ?? '',
			city: address?.city ?? '',
			governorate: address?.governorate ?? '',
			postalCode: address?.postalCode ?? '',
			isDefault: address?.isDefault ?? false,
		},
	})

	const onSubmit = handleSubmit((data) => onSave(data))

	return (
		<ModalOverlay
			isDismissable
			isOpen
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
		>
			<Modal
				isKeyboardDismissDisabled
				className="w-full max-w-md mx-4 bg-white/90 dark:bg-black/90 backdrop-blur-2xl border border-[var(--color-border)] shadow-xl"
			>
				<Dialog className="p-6 outline-none">
					<Heading
						slot="title"
						className="text-sm font-medium text-[var(--color-text)] mb-6"
					>
						{address
							? t('settings.addresses.editTitle')
							: t('settings.addresses.addTitle')}
					</Heading>

					<form onSubmit={onSubmit} className="space-y-5">
						<AddressTextField
							control={control}
							name="label"
							label={t('settings.addresses.label')}
							isRequired
						/>

						<AddressTextField
							control={control}
							name="street"
							label={t('settings.addresses.street')}
							isRequired
						/>

						<AddressTextField
							control={control}
							name="city"
							label={t('settings.addresses.city')}
							isRequired
						/>

						{/* Governorate Select */}
						<Controller
							name="governorate"
							control={control}
							rules={{ required: true }}
							render={({ field }) => (
								<Select
									selectedKey={field.value || null}
									onSelectionChange={(key) => field.onChange(key as string)}
									className="space-y-1.5"
								>
									<Label className={labelClass}>
										{t('settings.addresses.governorate')}
									</Label>
									<Button className="w-full flex items-center justify-between bg-transparent border-0 border-b border-[var(--color-border)] py-2 text-sm text-[var(--color-text)] outline-none focus:border-[#2563EB] cursor-pointer transition-colors">
										<SelectValue className="truncate" />
									</Button>
									<Popover className="w-[var(--trigger-width)] max-h-60 overflow-y-auto border border-[var(--color-border)] bg-white/95 dark:bg-black/95 backdrop-blur-2xl shadow-lg">
										<ListBox className="p-1">
											{EGYPTIAN_GOVERNORATES.map((gov) => (
												<ListBoxItem
													key={gov}
													id={gov}
													textValue={gov}
													className="px-3 py-2 text-sm text-[var(--color-text)] cursor-pointer outline-none hover:bg-[var(--color-surface)] focus:bg-[var(--color-surface)] data-[selected]:font-medium"
												>
													{gov}
												</ListBoxItem>
											))}
										</ListBox>
									</Popover>
								</Select>
							)}
						/>

						<AddressTextField
							control={control}
							name="postalCode"
							label={t('settings.addresses.postalCode')}
						/>

						<div className="flex justify-end gap-4 pt-4">
							<Button
								onPress={onClose}
								className="text-sm text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
							>
								{t('settings.cancel')}
							</Button>
							<Button
								type="submit"
								isDisabled={isPending}
								className="px-4 py-2 bg-[#0F172A] text-white dark:bg-[#FAFAFA] dark:text-[#09090B] text-sm cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:opacity-50"
							>
								{isPending ? t('settings.saving') : t('settings.saveChanges')}
							</Button>
						</div>
					</form>
				</Dialog>
			</Modal>
		</ModalOverlay>
	)
}

function AddressTextField({
	control,
	name,
	label,
	isRequired = false,
}: {
	control: Control<AddressFormValues>
	name: AddressTextFieldName
	label: string
	isRequired?: boolean
}) {
	return (
		<Controller
			name={name}
			control={control}
			rules={isRequired ? { required: true } : undefined}
			render={({ field }) => (
				<TextField
					value={field.value}
					onChange={field.onChange}
					isRequired={isRequired}
					className="space-y-1.5"
				>
					<Label className={labelClass}>{label}</Label>
					<Input className={underlineInputClass} />
				</TextField>
			)}
		/>
	)
}

// ============================================================================
// Delete Confirm Dialog
// ============================================================================

function DeleteConfirmDialog({
	onConfirm,
	onClose,
	isPending,
}: {
	onConfirm: () => void
	onClose: () => void
	isPending: boolean
}) {
	const { t } = useTranslation('portal')

	return (
		<ModalOverlay
			isDismissable
			isOpen
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
		>
			<Modal
				isKeyboardDismissDisabled
				className="w-full max-w-sm mx-4 bg-white/90 dark:bg-black/90 backdrop-blur-2xl border border-[var(--color-border)] shadow-xl"
			>
				<Dialog className="p-6 outline-none">
					<Heading
						slot="title"
						className="text-sm font-medium text-[var(--color-text)] mb-2"
					>
						{t('settings.addresses.deleteConfirm')}
					</Heading>
					<p className="text-sm text-[var(--color-text-subtle)] mb-6">
						{t('settings.addresses.deleteBody')}
					</p>
					<div className="flex justify-end gap-4">
						<Button
							onPress={onClose}
							className="text-sm text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
						>
							{t('settings.cancel')}
						</Button>
						<Button
							onPress={onConfirm}
							isDisabled={isPending}
							className="px-4 py-2 bg-[#0F172A] text-white dark:bg-[#FAFAFA] dark:text-[#09090B] text-sm cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:opacity-50"
						>
							{t('settings.addresses.deleteAction')}
						</Button>
					</div>
				</Dialog>
			</Modal>
		</ModalOverlay>
	)
}
