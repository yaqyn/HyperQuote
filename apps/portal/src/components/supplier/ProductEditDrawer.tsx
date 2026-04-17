/**
 * ProductEditDrawer -- 480px inline-end slide drawer for editing product details.
 * Uses React Hook Form with standardSchemaResolver + Zod.
 * NumberField from @hyperquote/forms (RHF-wrapped version).
 */

import { NumberField, standardSchemaResolver } from '@hyperquote/forms'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect } from 'react'
import { Button, TextArea } from 'react-aria-components'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useShortcut } from '../../hooks/useShortcut'
import { updateSupplierStock } from '../../lib/server/supplier-stock'
import { toast } from '../../lib/toast'
import type { SupplierProduct } from '../../types/supplier'

const productEditSchema = z.object({
	price: z.number().positive(),
	minOrderQuantity: z.number().optional(),
	stockQuantity: z.number().min(0),
	leadTimeDays: z.number().optional(),
	notes: z.string().optional(),
})

type ProductEditFormValues = z.infer<typeof productEditSchema>

interface ProductEditDrawerProps {
	product: SupplierProduct | null
	onClose: () => void
	locale: 'ar' | 'en'
}

export default function ProductEditDrawer({
	product,
	onClose,
	locale,
}: ProductEditDrawerProps) {
	const { t } = useTranslation('portal')
	const queryClient = useQueryClient()

	useShortcut('Escape', onClose)

	const methods = useForm<ProductEditFormValues>({
		resolver: standardSchemaResolver(productEditSchema),
		defaultValues: {
			price: product?.currentPrice ?? 0,
			minOrderQuantity: product?.minOrderQuantity ?? undefined,
			stockQuantity: product?.stockQuantity ?? 0,
			leadTimeDays: product?.leadTimeDays ?? undefined,
			notes: '',
		},
	})

	// Reset form when product changes
	useEffect(() => {
		if (product) {
			methods.reset({
				price: product.currentPrice,
				minOrderQuantity: product.minOrderQuantity ?? undefined,
				stockQuantity: product.stockQuantity,
				leadTimeDays: product.leadTimeDays ?? undefined,
				notes: '',
			})
		}
	}, [product, methods])

	const updateMutation = useMutation({
		mutationFn: (values: ProductEditFormValues & { productId: string }) =>
			updateSupplierStock({
				data: {
					productId: values.productId,
					price: values.price,
					quantity: values.stockQuantity,
				},
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['supplier-products'] })
			toast.success(locale === 'ar' ? 'تم تحديث المنتج' : 'Product updated')
			onClose()
		},
	})

	const onSubmit = methods.handleSubmit((values) => {
		if (!product) return
		updateMutation.mutate({ ...values, productId: product.id })
	})

	if (!product) return null

	return (
		<div className="fixed inset-0 z-50">
			{/* Backdrop */}
			<button
				type="button"
				aria-label={locale === 'ar' ? 'إغلاق' : 'Close'}
				className="absolute inset-0 bg-black/20 dark:bg-black/40 cursor-default"
				onClick={onClose}
			/>

			{/* Drawer panel */}
			<motion.div
				initial={{ x: locale === 'ar' ? -480 : 480 }}
				animate={{ x: 0 }}
				exit={{ x: locale === 'ar' ? -480 : 480 }}
				transition={{
					type: 'spring',
					stiffness: 200,
					damping: 20,
				}}
				className={[
					'absolute top-0 bottom-0',
					'w-[480px] max-w-full',
					'inset-inline-end-0',
					'backdrop-blur-2xl',
					'bg-[rgba(255,255,255,0.90)] dark:bg-[rgba(0,0,0,0.90)]',
					'border-s border-[var(--color-border)]',
					'flex flex-col',
					'z-10',
				].join(' ')}
			>
				{/* Header */}
				<div className="flex items-center justify-between h-14 px-6 border-b border-[var(--color-border)] shrink-0">
					<h3 className="font-semibold text-lg text-[var(--color-text)]">
						{t('supplier.editProduct')}
					</h3>
					<Button
						onPress={onClose}
						aria-label={locale === 'ar' ? 'إغلاق' : 'Close'}
						className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer transition-colors"
					>
						<X size={20} />
					</Button>
				</div>

				{/* Form */}
				<FormProvider {...methods}>
					<form
						onSubmit={onSubmit}
						className="flex flex-col flex-1 overflow-auto"
					>
						<div className="flex flex-col gap-6 p-6 flex-1">
							{/* Product name (read-only) */}
							<div>
								<span className="text-[13px] font-medium text-[var(--color-text-muted)] uppercase tracking-widest mb-1 block">
									{t('supplier.productName')}
								</span>
								<div className="px-3 py-2 rounded-lg bg-[var(--color-surface)] text-sm text-[var(--color-text)]">
									{locale === 'ar' ? product.nameAr : product.name}
								</div>
							</div>

							{/* Price */}
							<NumberField
								name="price"
								label={t('supplier.price')}
								minValue={0.01}
								formatOptions={{
									style: 'decimal',
									minimumFractionDigits: 0,
								}}
								isRequired
							/>

							{/* MOQ */}
							<NumberField
								name="minOrderQuantity"
								label={t('supplier.moq')}
								minValue={0}
							/>

							{/* Stock Quantity */}
							<NumberField
								name="stockQuantity"
								label={t('supplier.stockQty')}
								minValue={0}
								isRequired
							/>

							{/* Lead Time */}
							<div className="flex items-end gap-2">
								<div className="flex-1">
									<NumberField
										name="leadTimeDays"
										label={t('supplier.leadTime')}
										minValue={0}
									/>
								</div>
								<span className="text-sm text-[var(--color-text-muted)] pb-2">
									{t('supplier.leadTimeDays')}
								</span>
							</div>

							{/* Notes */}
							<div>
								<span className="text-[13px] font-medium text-[var(--color-text-muted)] uppercase tracking-widest mb-1 block">
									{t('supplier.notes')}
								</span>
								<TextArea
									{...methods.register('notes')}
									className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] min-h-[80px] resize-none outline-none focus:border-[var(--color-primary)]"
								/>
							</div>
						</div>

						{/* Bottom actions */}
						<div className="flex flex-col gap-2 p-6 border-t border-[var(--color-border)] shrink-0">
							<Button
								type="submit"
								isDisabled={updateMutation.isPending}
								className="flex items-center justify-center h-[44px] w-full rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
							>
								{t('supplier.updateProduct')}
							</Button>
							<Button
								onPress={onClose}
								className="flex items-center justify-center h-[44px] w-full text-sm text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text)] transition-colors"
							>
								{t('supplier.discardChanges')}
							</Button>
						</div>
					</form>
				</FormProvider>
			</motion.div>
		</div>
	)
}
