import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from 'react-aria-components'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { isValidText } from '../../lib/inputs'
import { addCustomer, getCustomerList } from '../../lib/server/sales-customers'
import { useSalesStore } from '../../stores/sales'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchField,
	DispatchFooter,
	DispatchInputClass,
	DispatchSection,
} from '../shared/DispatchDialog'

interface AddCustomerDialogProps {
	onCustomerCreated?: (customerId: string) => void
}

interface FormValues {
	phone: string
	companyName: string
	contactName: string
	deliveryAddress: string
	projectName: string
	notes: string
}

// Egyptian phone format: +20 or 0 prefix, mobile (01X) or landline (2-9)
const EGYPT_PHONE_REGEX = /^(\+20|0)(1[0125]\d{8}|[2-9]\d{7,8})$/

interface DuplicateWarning {
	type: 'phone' | 'company'
	customerName: string
	customerId: string
}

export function AddCustomerDialog({
	onCustomerCreated,
}: AddCustomerDialogProps) {
	const { t } = useTranslation('internal')
	const queryClient = useQueryClient()
	const [isOpen, setIsOpen] = useState(false)
	const [duplicateWarnings, setDuplicateWarnings] = useState<
		DuplicateWarning[]
	>([])

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<FormValues>({
		defaultValues: {
			phone: '',
			companyName: '',
			contactName: '',
			deliveryAddress: '',
			projectName: '',
			notes: '',
		},
	})

	const mutation = useMutation({
		mutationFn: (data: FormValues) =>
			addCustomer({
				data: {
					phone: data.phone,
					companyName: data.companyName,
					contactName: data.contactName,
					deliveryAddress: data.deliveryAddress || undefined,
					projectName: data.projectName || undefined,
					notes: data.notes || undefined,
				},
			}),
		onSuccess: (result) => {
			queryClient.invalidateQueries({ queryKey: ['customer-list'] })
			queryClient.invalidateQueries({ queryKey: ['customer-360'] })
			reset()
			setDuplicateWarnings([])
			setIsOpen(false)

			useSalesStore.getState().setSelectedCustomerId(result.customerId)
			useSalesStore.getState().setActiveTab('customers')

			if (onCustomerCreated) onCustomerCreated(result.customerId)
		},
	})

	const checkPhoneDuplicate = async (phone: string) => {
		if (!phone || !EGYPT_PHONE_REGEX.test(phone)) return
		try {
			const result = await getCustomerList({
				data: { search: phone, page: 1, limit: 5 },
			})
			const matches = result.customers.filter((c) => c.phone === phone)
			setDuplicateWarnings((prev) => {
				const filtered = prev.filter((w) => w.type !== 'phone')
				if (matches.length > 0) {
					return [
						...filtered,
						{
							type: 'phone',
							customerName: matches[0].companyName,
							customerId: matches[0].id,
						},
					]
				}
				return filtered
			})
		} catch {
			/* swallow duplicate-check errors */
		}
	}

	const checkCompanyDuplicate = async (companyName: string) => {
		if (!companyName || companyName.length < 3) return
		try {
			const result = await getCustomerList({
				data: { search: companyName, page: 1, limit: 5 },
			})
			const similar = result.customers.filter(
				(c) =>
					c.companyName.toLowerCase().includes(companyName.toLowerCase()) ||
					companyName.toLowerCase().includes(c.companyName.toLowerCase()),
			)
			setDuplicateWarnings((prev) => {
				const filtered = prev.filter((w) => w.type !== 'company')
				if (similar.length > 0) {
					return [
						...filtered,
						{
							type: 'company',
							customerName: similar[0].companyName,
							customerId: similar[0].id,
						},
					]
				}
				return filtered
			})
		} catch {
			/* swallow duplicate-check errors */
		}
	}

	const onSubmit = (data: FormValues) => mutation.mutate(data)

	const phoneWarning = duplicateWarnings.find((w) => w.type === 'phone')
	const companyWarning = duplicateWarnings.find((w) => w.type === 'company')

	function handleClose() {
		if (mutation.isPending) return
		reset()
		setDuplicateWarnings([])
		setIsOpen(false)
	}

	return (
		<>
			<Button
				onPress={() => setIsOpen(true)}
				className="group inline-flex items-center gap-1 font-[family-name:var(--font-archivo)] text-[12.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/50 rounded-sm"
			>
				<span
					aria-hidden
					className="font-[family-name:var(--font-plex-mono)] text-[14px] leading-none opacity-60 group-hover:opacity-100 transition-opacity"
				>
					[
				</span>
				<span>+ {t('sales.addCustomer.button')}</span>
				<span
					aria-hidden
					className="font-[family-name:var(--font-plex-mono)] text-[14px] leading-none opacity-60 group-hover:opacity-100 transition-opacity"
				>
					]
				</span>
			</Button>

			<DispatchDialog
				isOpen={isOpen}
				onClose={handleClose}
				size="md"
				eyebrow="Sales · Form No. 014"
				title={t('sales.addCustomer.title')}
				dismissDisabled={mutation.isPending}
			>
				<form
					onSubmit={handleSubmit(onSubmit)}
					className="flex flex-col min-h-0 flex-1"
				>
					<DispatchBody>
						<DispatchSection label="Primary contact" />

						<div className="space-y-5">
							<Controller
								name="phone"
								control={control}
								rules={{
									required: t('sales.addCustomer.phoneRequired'),
									pattern: {
										value: EGYPT_PHONE_REGEX,
										message: t('sales.addCustomer.phoneInvalid'),
									},
								}}
								render={({ field }) => (
									<DispatchField
										label={t('sales.addCustomer.phone')}
										required
										error={errors.phone?.message}
									>
										<input
											type="tel"
											value={field.value}
											onChange={(e) => field.onChange(e.target.value)}
											onBlur={() => {
												field.onBlur()
												checkPhoneDuplicate(field.value)
											}}
											placeholder="+201001234567"
											className={DispatchInputClass()}
										/>
									</DispatchField>
								)}
							/>
							{phoneWarning && (
								<DuplicateBanner
									message={t('sales.addCustomer.phoneDuplicate', {
										name: phoneWarning.customerName,
									})}
									customerId={phoneWarning.customerId}
								/>
							)}

							<Controller
								name="companyName"
								control={control}
								rules={{
									required: t('sales.addCustomer.companyRequired'),
									validate: (v) =>
										isValidText(v, 2, 120) || 'Company name is not valid',
								}}
								render={({ field }) => (
									<DispatchField
										label={t('sales.addCustomer.companyName')}
										required
										error={errors.companyName?.message}
									>
										<input
											value={field.value}
											onChange={(e) => field.onChange(e.target.value)}
											onBlur={() => {
												field.onBlur()
												checkCompanyDuplicate(field.value)
											}}
											className={DispatchInputClass()}
										/>
									</DispatchField>
								)}
							/>
							{companyWarning && (
								<DuplicateBanner
									message={t('sales.addCustomer.companyDuplicate', {
										name: companyWarning.customerName,
									})}
									customerId={companyWarning.customerId}
								/>
							)}

							<Controller
								name="contactName"
								control={control}
								rules={{
									required: t('sales.addCustomer.contactRequired'),
									validate: (v) =>
										isValidText(v, 2, 80) || 'Contact name is not valid',
								}}
								render={({ field }) => (
									<DispatchField
										label={t('sales.addCustomer.contactName')}
										required
										error={errors.contactName?.message}
									>
										<input
											value={field.value}
											onChange={(e) => field.onChange(e.target.value)}
											onBlur={field.onBlur}
											className={DispatchInputClass()}
										/>
									</DispatchField>
								)}
							/>
						</div>

						<DispatchSection label="Additional details" />
						<div className="space-y-5">
							<Controller
								name="deliveryAddress"
								control={control}
								render={({ field }) => (
									<DispatchField label={t('sales.addCustomer.deliveryAddress')}>
										<textarea
											value={field.value}
											onChange={(e) => field.onChange(e.target.value)}
											onBlur={field.onBlur}
											rows={2}
											className={`${DispatchInputClass()} resize-none`}
										/>
									</DispatchField>
								)}
							/>
							<div className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:gap-6">
								<Controller
									name="projectName"
									control={control}
									render={({ field }) => (
										<DispatchField label={t('sales.addCustomer.projectName')}>
											<input
												value={field.value}
												onChange={(e) => field.onChange(e.target.value)}
												onBlur={field.onBlur}
												className={DispatchInputClass()}
											/>
										</DispatchField>
									)}
								/>
								<Controller
									name="notes"
									control={control}
									render={({ field }) => (
										<DispatchField label={t('sales.addCustomer.notes')}>
											<input
												value={field.value}
												onChange={(e) => field.onChange(e.target.value)}
												onBlur={field.onBlur}
												className={DispatchInputClass()}
											/>
										</DispatchField>
									)}
								/>
							</div>
						</div>
					</DispatchBody>

					<DispatchFooter leading="Fields marked required">
						<DispatchAction
							onPress={handleClose}
							tone="ghost"
							isDisabled={mutation.isPending}
						>
							{t('sales.addCustomer.cancel')}
						</DispatchAction>
						<DispatchAction
							type="submit"
							onPress={() => {
								void handleSubmit(onSubmit)()
							}}
							isDisabled={isSubmitting || mutation.isPending}
						>
							{isSubmitting || mutation.isPending
								? t('sales.addCustomer.creating')
								: t('sales.addCustomer.create')}
						</DispatchAction>
					</DispatchFooter>
				</form>
			</DispatchDialog>
		</>
	)
}

function DuplicateBanner({
	message,
	customerId,
}: {
	message: string
	customerId: string
}) {
	const setActiveTab = useSalesStore((s) => s.setActiveTab)
	return (
		<div className="flex flex-col items-start justify-between gap-3 px-3 py-2 border border-[#D97706]/40 bg-[#D97706]/[0.06] lg:flex-row lg:items-center">
			<span className="font-[family-name:var(--font-archivo)] italic text-[12px] text-[var(--color-text-muted)]">
				{message}
			</span>
			<button
				type="button"
				onClick={() => {
					useSalesStore.getState().setSelectedCustomerId(customerId)
					setActiveTab('customers')
				}}
				className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--color-primary)] hover:text-[var(--color-text)] transition-colors"
			>
				View →
			</button>
		</div>
	)
}
