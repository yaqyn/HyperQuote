/**
 * Address ComboBox with saved addresses and inline creation.
 * First-time users: auto-expands the address form (no ComboBox shown).
 * Returning users: ComboBox with "Add New Address" option at bottom.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MapPin, Plus } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useState } from 'react'
import {
	Button as AriaButton,
	Button,
	ComboBox,
	Input,
	Label,
	ListBox,
	ListBoxItem,
	Popover,
	Select,
	ListBoxItem as SelectItem,
	ListBox as SelectListBox,
	Popover as SelectPopover,
	SelectValue,
	TextField,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import {
	type CustomerAddress,
	createAddress,
	getCustomerAddresses,
} from '../../../lib/server/addresses'
import { useQuoteBuilderStore } from '../../../stores/quote-builder'

// ============================================================================
// Egyptian Governorates
// ============================================================================

const GOVERNORATES = [
	'Cairo',
	'Giza',
	'Alexandria',
	'Qalyubia',
	'Sharqia',
	'Dakahlia',
	'Beheira',
	'Monufia',
	'Gharbia',
	'Kafr El Sheikh',
	'Damietta',
	'Port Said',
	'Ismailia',
	'Suez',
	'North Sinai',
	'South Sinai',
	'Red Sea',
	'New Valley',
	'Matrouh',
	'Fayoum',
	'Beni Suef',
	'Minya',
	'Assiut',
	'Sohag',
	'Qena',
	'Luxor',
	'Aswan',
] as const

// ============================================================================
// New Address Form
// ============================================================================

interface NewAddressFormProps {
	onSave: (address: CustomerAddress) => void
	isSaving: boolean
}

function NewAddressForm({ onSave, isSaving }: NewAddressFormProps) {
	const { t } = useTranslation('portal')
	const [street, setStreet] = useState('')
	const [area, setArea] = useState('')
	const [governorate, setGovernorate] = useState('')
	const [landmark, setLandmark] = useState('')
	const [phone, setPhone] = useState('')

	const canSave = street.trim() && area.trim() && governorate

	const handleSave = useCallback(async () => {
		if (!canSave) return
		try {
			const result = await createAddress({
				data: {
					street: street.trim(),
					area: area.trim(),
					city: governorate, // city derived from governorate for simplicity
					governorate,
					landmark: landmark.trim() || undefined,
					phone: phone.trim() || undefined,
				},
			})
			onSave(result)
		} catch {
			// Error handled by parent
		}
	}, [street, area, governorate, landmark, phone, canSave, onSave])

	const fieldClass =
		'w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-colors'

	return (
		<motion.div
			initial={{ opacity: 0, height: 0 }}
			animate={{ opacity: 1, height: 'auto' }}
			exit={{ opacity: 0, height: 0 }}
			transition={{ type: 'spring', stiffness: 300, damping: 25 }}
			className="space-y-3 mt-3"
		>
			{/* Street */}
			<TextField
				value={street}
				onChange={setStreet}
				isRequired
				className="flex flex-col gap-1"
			>
				<Label className="text-[13px] font-medium text-[var(--color-text-muted)]">
					{t('quoteBuilder.addressStreet', 'Street')} *
				</Label>
				<Input
					className={fieldClass}
					placeholder={t(
						'quoteBuilder.addressStreetPlaceholder',
						'e.g. 15 Tahrir Street',
					)}
				/>
			</TextField>

			{/* Area */}
			<TextField
				value={area}
				onChange={setArea}
				isRequired
				className="flex flex-col gap-1"
			>
				<Label className="text-[13px] font-medium text-[var(--color-text-muted)]">
					{t('quoteBuilder.addressArea', 'Area / District')} *
				</Label>
				<Input
					className={fieldClass}
					placeholder={t(
						'quoteBuilder.addressAreaPlaceholder',
						'e.g. Downtown',
					)}
				/>
			</TextField>

			{/* Governorate Select */}
			<Select
				selectedKey={governorate}
				onSelectionChange={(key) => setGovernorate(key as string)}
				className="flex flex-col gap-1"
			>
				<Label className="text-[13px] font-medium text-[var(--color-text-muted)]">
					{t('quoteBuilder.addressGovernorate', 'City / Governorate')} *
				</Label>
				<AriaButton
					className={`${fieldClass} flex items-center justify-between cursor-pointer`}
				>
					<SelectValue className="flex-1 text-start truncate">
						{({ isPlaceholder }) =>
							isPlaceholder ? (
								<span className="text-[var(--color-text-muted)]">
									{t('quoteBuilder.selectGovernorate', 'Select governorate')}
								</span>
							) : undefined
						}
					</SelectValue>
					<span className="text-[var(--color-text-muted)]" aria-hidden>
						<svg
							aria-hidden="true"
							width="12"
							height="12"
							viewBox="0 0 12 12"
							fill="none"
						>
							<path
								d="M3 4.5L6 7.5L9 4.5"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</span>
				</AriaButton>
				<SelectPopover className="w-[var(--trigger-width)] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] shadow-lg max-h-60 overflow-auto z-50">
					<SelectListBox className="p-1 outline-none">
						{GOVERNORATES.map((gov) => (
							<SelectItem
								key={gov}
								id={gov}
								className="px-3 py-2 text-sm rounded cursor-pointer text-[var(--color-text)] hover:bg-[var(--color-surface)] outline-none focus:bg-[var(--color-surface)] selected:bg-[var(--color-primary)]/10 selected:text-[var(--color-primary)]"
							>
								{gov}
							</SelectItem>
						))}
					</SelectListBox>
				</SelectPopover>
			</Select>

			{/* Landmark (optional) */}
			<TextField
				value={landmark}
				onChange={setLandmark}
				className="flex flex-col gap-1"
			>
				<Label className="text-[13px] font-medium text-[var(--color-text-muted)]">
					{t('quoteBuilder.addressLandmark', 'Landmark')}
				</Label>
				<Input
					className={fieldClass}
					placeholder={t(
						'quoteBuilder.addressLandmarkPlaceholder',
						'e.g. Near Tahrir Square',
					)}
				/>
			</TextField>

			{/* Phone (optional) */}
			<TextField
				value={phone}
				onChange={setPhone}
				className="flex flex-col gap-1"
			>
				<Label className="text-[13px] font-medium text-[var(--color-text-muted)]">
					{t('quoteBuilder.addressPhone', 'Phone at site')}
				</Label>
				<Input
					className={fieldClass}
					placeholder={t(
						'quoteBuilder.addressPhonePlaceholder',
						'e.g. +20 2 1234 5678',
					)}
				/>
			</TextField>

			{/* Save button */}
			<Button
				onPress={handleSave}
				isDisabled={!canSave || isSaving}
				className="h-10 px-4 rounded-lg border border-[var(--color-primary)] text-sm text-[var(--color-primary)] font-medium hover:bg-[var(--color-primary)]/5 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
			>
				{isSaving
					? t('quoteBuilder.savingAddress', 'Saving...')
					: t('quoteBuilder.saveAddress', 'Save Address')}
			</Button>
		</motion.div>
	)
}

// ============================================================================
// AddressComboBox
// ============================================================================

const ADD_NEW_ID = '__add_new__'

export function AddressComboBox() {
	const { t } = useTranslation('portal')
	const queryClient = useQueryClient()
	const setDeliveryAddressId = useQuoteBuilderStore(
		(s) => s.setDeliveryAddressId,
	)
	const deliveryAddressId = useQuoteBuilderStore((s) => s.deliveryAddressId)

	const [showNewForm, setShowNewForm] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [inputValue, setInputValue] = useState('')

	const { data: addresses = [], isLoading } = useQuery({
		queryKey: ['customerAddresses'],
		queryFn: () => getCustomerAddresses(),
		staleTime: 10 * 60 * 1000, // 10 minutes
	})

	// First-time user: no saved addresses
	const isFirstTime = !isLoading && addresses.length === 0

	const selectedAddress = addresses.find((a) => a.id === deliveryAddressId)

	const handleSaveNewAddress = useCallback(
		async (address: CustomerAddress) => {
			setIsSaving(false)
			setShowNewForm(false)
			setDeliveryAddressId(address.id)
			setInputValue(address.label || address.street)
			// Invalidate addresses query to include the new one
			queryClient.invalidateQueries({ queryKey: ['customerAddresses'] })
		},
		[setDeliveryAddressId, queryClient],
	)

	// First-time: show heading + auto-expanded form
	if (isFirstTime) {
		return (
			<div>
				<div className="flex items-center gap-2 mb-2">
					<MapPin size={18} className="text-[var(--color-primary)]" />
					<h3 className="text-base font-semibold text-[var(--color-text)]">
						{t('quoteBuilder.addDeliveryAddress', 'Add your delivery address')}
					</h3>
				</div>
				<NewAddressForm onSave={handleSaveNewAddress} isSaving={isSaving} />
			</div>
		)
	}

	return (
		<div>
			<ComboBox
				inputValue={inputValue}
				onInputChange={setInputValue}
				selectedKey={deliveryAddressId}
				onSelectionChange={(key) => {
					if (key === ADD_NEW_ID) {
						setShowNewForm(true)
						setInputValue('')
						return
					}
					setShowNewForm(false)
					setDeliveryAddressId(key as string)
					const addr = addresses.find((a) => a.id === key)
					if (addr) setInputValue(addr.label || addr.street)
				}}
				className="flex flex-col gap-1"
				menuTrigger="focus"
			>
				<Label className="text-[13px] font-medium text-[var(--color-text-muted)]">
					{t('quoteBuilder.deliveryAddress', 'Delivery Address')}
				</Label>
				<div className="relative">
					<MapPin
						size={16}
						className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
					/>
					<Input
						className="w-full h-10 ps-9 pe-3 rounded-lg border border-[var(--color-border)] bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-colors"
						placeholder={t(
							'quoteBuilder.selectAddress',
							'Search or select an address...',
						)}
					/>
				</div>
				<Popover className="w-[var(--trigger-width)] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] shadow-lg max-h-60 overflow-auto z-50">
					<ListBox className="p-1 outline-none">
						{addresses.map((addr) => (
							<ListBoxItem
								key={addr.id}
								id={addr.id}
								textValue={addr.label || addr.street}
								className="px-3 py-2 rounded cursor-pointer outline-none hover:bg-[var(--color-surface)] focus:bg-[var(--color-surface)] selected:bg-[var(--color-primary)]/10"
							>
								<div className="text-sm font-medium text-[var(--color-text)]">
									{addr.label || addr.street}
								</div>
								<div className="text-[13px] text-[var(--color-text-muted)]">
									{addr.street} - {addr.area}, {addr.city}
								</div>
							</ListBoxItem>
						))}
						<ListBoxItem
							id={ADD_NEW_ID}
							textValue={t('quoteBuilder.addNewAddress', 'Add New Address')}
							className="px-3 py-2 rounded cursor-pointer outline-none hover:bg-[var(--color-surface)] focus:bg-[var(--color-surface)] text-[var(--color-primary)] flex items-center gap-2 border-t border-[var(--color-border)] mt-1 pt-2"
						>
							<Plus size={14} />
							<span className="text-sm font-medium">
								{t('quoteBuilder.addNewAddress', 'Add New Address')}
							</span>
						</ListBoxItem>
					</ListBox>
				</Popover>
			</ComboBox>

			{/* Selected address preview */}
			{selectedAddress && !showNewForm && (
				<div className="mt-2 p-3 rounded-lg bg-[var(--color-surface)] text-[13px] text-[var(--color-text-muted)]">
					{selectedAddress.street}, {selectedAddress.area},{' '}
					{selectedAddress.city}, {selectedAddress.governorate}
					{selectedAddress.landmark && ` - ${selectedAddress.landmark}`}
				</div>
			)}

			{/* New address form */}
			{showNewForm && (
				<NewAddressForm onSave={handleSaveNewAddress} isSaving={isSaving} />
			)}
		</div>
	)
}
