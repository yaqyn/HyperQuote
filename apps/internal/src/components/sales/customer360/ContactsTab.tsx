import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button as AriaButton } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { getCustomer360 } from '../../../lib/server/sales-customers'
import type { CustomerContact } from '../../../types/sales'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
	DispatchSection,
} from '../../shared/DispatchDialog'
import { Toggle, UnderlineInput } from '../../ui'

interface ContactsTabProps {
	customerId: string
	enabled: boolean
}

interface NewContact {
	name: string
	role: string
	email: string
	phone: string
	isPrimary: boolean
}

const EMPTY_CONTACT: NewContact = {
	name: '',
	role: '',
	email: '',
	phone: '',
	isPrimary: false,
}

export function ContactsTab({ customerId, enabled }: ContactsTabProps) {
	const { t } = useTranslation('internal')
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [localContacts, setLocalContacts] = useState<CustomerContact[]>([])
	const [form, setForm] = useState<NewContact>(EMPTY_CONTACT)

	const { data, isLoading } = useQuery({
		queryKey: ['customer-360', 'contacts', customerId],
		queryFn: () => getCustomer360({ data: { customerId } }),
		staleTime: 120_000,
		enabled,
		select: (d) => d.contacts,
	})

	if (!enabled) return null
	if (isLoading) return <TabSkeleton />

	const allContacts = [...(data ?? []), ...localContacts]

	if (allContacts.length === 0 && !isDialogOpen) {
		return (
			<div className="p-6">
				<div className="flex items-center justify-center h-48 text-[13px] text-black/30 dark:text-white/30">
					{t('sales.customer360.contacts.noContacts')}
				</div>
				<AddContactButton onPress={() => setIsDialogOpen(true)} />
				<AddContactDialog
					isOpen={isDialogOpen}
					onOpenChange={setIsDialogOpen}
					form={form}
					setForm={setForm}
					onSave={() => handleSave()}
				/>
			</div>
		)
	}

	function handleSave() {
		if (!form.name.trim() || !form.phone.trim()) return

		// TODO: Save to server via createContact server function
		const newContact: CustomerContact = {
			id: `local-${Date.now()}`,
			name: form.name.trim(),
			role: form.role.trim() || 'Contact',
			email: form.email.trim() || null,
			phone: form.phone.trim(),
			lastContactDate: null,
			commPreference: 'phone',
			relationshipStrength: 'new',
			dealRole: 'end_user',
			reportsTo: null,
		}
		setLocalContacts((prev) => [...prev, newContact])
		setForm(EMPTY_CONTACT)
		setIsDialogOpen(false)
	}

	return (
		<div className="space-y-6 p-4 sm:p-6">
			{/* Mini profile cards -- 2-column grid */}
			<div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
				{allContacts.map((contact) => (
					<ContactCard key={contact.id} contact={contact} />
				))}
			</div>

			{/* Add Contact */}
			<AddContactButton onPress={() => setIsDialogOpen(true)} />
			<AddContactDialog
				isOpen={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				form={form}
				setForm={setForm}
				onSave={() => handleSave()}
			/>
		</div>
	)
}

function AddContactButton({ onPress }: { onPress: () => void }) {
	const { t } = useTranslation('internal')
	return (
		<AriaButton
			className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#2563EB] outline-none
        data-[hovered]:bg-[#2563EB]/[0.04] rounded-lg transition-colors
        data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/40"
			onPress={onPress}
		>
			+ {t('sales.customer360.contacts.addContact')}
		</AriaButton>
	)
}

function AddContactDialog({
	isOpen,
	onOpenChange,
	form,
	setForm,
	onSave,
}: {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	form: NewContact
	setForm: React.Dispatch<React.SetStateAction<NewContact>>
	onSave: () => void
}) {
	const { t } = useTranslation('internal')
	const canSave = form.name.trim().length > 0 && form.phone.trim().length > 0

	return (
		<DispatchDialog
			isOpen={isOpen}
			onClose={() => onOpenChange(false)}
			size="sm"
			eyebrow="Customer · Contacts"
			title={t('sales.customer360.contacts.addContact')}
		>
			<DispatchBody>
				<DispatchSection label="Contact" />
				<div className="space-y-4">
					<UnderlineInput
						label={t('sales.customer360.contacts.name')}
						placeholder={t('sales.customer360.contacts.name')}
						value={form.name}
						onChange={(v) => setForm((f) => ({ ...f, name: v }))}
					/>
					<UnderlineInput
						label={t('sales.customer360.contacts.role')}
						placeholder={t('sales.customer360.contacts.role')}
						value={form.role}
						onChange={(v) => setForm((f) => ({ ...f, role: v }))}
					/>
					<UnderlineInput
						label={t('sales.customer360.contacts.email')}
						placeholder={t('sales.customer360.contacts.email')}
						value={form.email}
						onChange={(v) => setForm((f) => ({ ...f, email: v }))}
					/>
					<UnderlineInput
						label={t('sales.customer360.contacts.phone')}
						placeholder="+201001234567"
						value={form.phone}
						onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
					/>
					<Toggle
						label={t('sales.customer360.contacts.primaryContact')}
						isSelected={form.isPrimary}
						onChange={(v) => setForm((f) => ({ ...f, isPrimary: v }))}
					/>
				</div>
			</DispatchBody>
			<DispatchFooter>
				<DispatchAction tone="ghost" onPress={() => onOpenChange(false)}>
					{t('sales.customer360.contacts.cancel')}
				</DispatchAction>
				<DispatchAction isDisabled={!canSave} onPress={onSave}>
					{t('sales.customer360.contacts.save')}
				</DispatchAction>
			</DispatchFooter>
		</DispatchDialog>
	)
}

function ContactCard({ contact }: { contact: CustomerContact }) {
	const initials = contact.name
		.split(' ')
		.map((w) => w[0])
		.join('')
		.slice(0, 2)
		.toUpperCase()

	return (
		<div className="flex items-start gap-3 p-4 rounded-lg transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] group">
			{/* Initials circle */}
			<div className="w-9 h-9 rounded-full bg-[#2563EB]/[0.08] flex items-center justify-center shrink-0">
				<span className="text-[12px] font-semibold text-[#2563EB]">
					{initials}
				</span>
			</div>

			<div className="flex-1 min-w-0">
				{/* Name + role */}
				<p className="text-[13px] font-semibold text-[var(--color-text)] dark:text-white leading-tight">
					{contact.name}
				</p>
				<p className="text-[11px] text-black/35 dark:text-white/35 mt-0.5">
					{contact.role}
				</p>

				{/* Phone + email */}
				<div className="mt-2 space-y-0.5">
					<p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-black/45 dark:text-white/45">
						{contact.phone}
					</p>
					{contact.email && (
						<p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-black/45 dark:text-white/45 truncate">
							{contact.email}
						</p>
					)}
				</div>
			</div>
		</div>
	)
}

function TabSkeleton() {
	return (
		<div className="p-6 grid grid-cols-2 gap-1 animate-pulse">
			{Array.from({ length: 4 }, (_, i) => `skeleton-${i}`).map((key) => (
				<div
					key={key}
					className="h-24 rounded-lg bg-black/[0.03] dark:bg-white/[0.03]"
				/>
			))}
		</div>
	)
}
