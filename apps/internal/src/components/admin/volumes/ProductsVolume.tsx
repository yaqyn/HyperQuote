import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
	type AdminProduct,
	type AdminProductPayload,
	adminCreateProduct,
	adminDeleteProduct,
	adminListCategories,
	adminListProducts,
	adminUpdateProduct,
} from '../../../lib/server/admin'
import { getVolume } from '../../../types/admin'
import { Toggle } from '../../ui/Toggle'
import {
	NumberControl,
	SelectControl,
	StatusTag,
	TextAreaControl,
	TextControl,
} from '../AdminControls'
import { Field, Section } from '../EntityEditor'
import type { ColumnDef } from '../EntityIndex'
import { CatalogPictureField, CatalogThumbnail } from './CatalogImageControls'
import { useAdminExport } from './useAdminExport'
import { useVolumeEditor, VolumeWorkspace } from './volumeEditor'

type ProductDraft = AdminProductPayload & { id?: string }

interface ProductsVolumeProps {
	onOpenVolumes: () => void
}

function blankProduct(): ProductDraft {
	return {
		name: '',
		name_ar: '',
		category: '',
		brand: null,
		manufacturer: '',
		cost: 0,
		isVisible: true,
		weight_kg: 0,
		unit_of_measure: 'piece',
		unit_of_measure_ar: 'قطعة',
		description: '',
		description_ar: '',
		lowStockThreshold: 0,
		goodStockThreshold: 0,
		pictureUrl: null,
	}
}

function productToDraft(row: AdminProduct): ProductDraft {
	return {
		id: row.id,
		name: row.name,
		name_ar: row.name_ar,
		category: row.category,
		brand: row.brand,
		manufacturer: row.manufacturer,
		cost: row.cost,
		isVisible: row.isVisible,
		weight_kg: row.weight_kg,
		unit_of_measure: row.unit_of_measure,
		unit_of_measure_ar: row.unit_of_measure_ar,
		description: row.description,
		description_ar: row.description_ar,
		lowStockThreshold: row.lowStockThreshold,
		goodStockThreshold: row.goodStockThreshold,
		pictureUrl: row.pictureUrl ?? null,
	}
}

function draftToPayload(draft: ProductDraft): AdminProductPayload {
	return {
		name: draft.name,
		name_ar: draft.name_ar,
		category: draft.category,
		brand: draft.brand,
		manufacturer: draft.manufacturer,
		cost: draft.cost,
		isVisible: draft.isVisible,
		weight_kg: draft.weight_kg,
		unit_of_measure: draft.unit_of_measure,
		unit_of_measure_ar: draft.unit_of_measure_ar,
		description: draft.description,
		description_ar: draft.description_ar,
		lowStockThreshold: draft.lowStockThreshold,
		goodStockThreshold: draft.goodStockThreshold,
		pictureUrl: draft.pictureUrl,
	}
}

export function ProductsVolume({ onOpenVolumes }: ProductsVolumeProps) {
	const { t } = useTranslation('admin')
	const qc = useQueryClient()
	const volume = getVolume('products')
	const { exportStatus, isExporting, requestExport } =
		useAdminExport('products')

	const {
		data: products = [],
		isError: productsError,
		isPending: productsPending,
	} = useQuery({
		queryKey: ['admin', 'products'],
		queryFn: () => adminListProducts(),
	})
	const { data: categories = [] } = useQuery({
		queryKey: ['admin', 'categories'],
		queryFn: () => adminListCategories(),
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
		rows: products,
		blankDraft: blankProduct,
		rowToDraft: productToDraft,
		rowId: (row) => row.id,
		draftId: (row) => row.id,
	})

	const createMutation = useMutation({
		mutationFn: (payload: AdminProductPayload) =>
			adminCreateProduct({ data: payload }),
		onSuccess: (created) => {
			qc.invalidateQueries({ queryKey: ['admin', 'products'] })
			showSavedDraft(productToDraft(created), created.id)
		},
	})

	const updateMutation = useMutation({
		mutationFn: (payload: { id: string } & Partial<AdminProductPayload>) =>
			adminUpdateProduct({ data: payload }),
		onSuccess: (updated) => {
			qc.invalidateQueries({ queryKey: ['admin', 'products'] })
			showSavedDraft(productToDraft(updated), updated.id)
		},
	})

	const deleteMutation = useMutation({
		mutationFn: (payload: { id: string; reason: string }) =>
			adminDeleteProduct({ data: payload }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['admin', 'products'] })
			handleClose()
		},
	})

	const categoryOptions = useMemo(() => {
		const options = categories
			.filter(
				(category) => category.isActive || category.slug === draft?.category,
			)
			.map((category) => ({
				value: category.slug,
				label: category.parentSlug
					? `${category.name} · ${category.parentSlug}`
					: category.name,
			}))
		if (
			draft?.category &&
			!options.some((option) => option.value === draft.category)
		) {
			options.unshift({ value: draft.category, label: draft.category })
		}
		return options
	}, [categories, draft?.category])

	useEffect(() => {
		if (!draft || readOnly || draft.category || categoryOptions.length === 0) {
			return
		}
		setDraft({ ...draft, category: categoryOptions[0].value })
	}, [categoryOptions, draft, readOnly, setDraft])

	const thresholdInvalid = Boolean(
		draft && draft.goodStockThreshold < draft.lowStockThreshold,
	)
	const missingCategory = categoryOptions.length === 0

	function handleSave() {
		if (!draft || thresholdInvalid || missingCategory) return
		const payload = draftToPayload(draft)
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
		const reason =
			typeof window === 'undefined'
				? null
				: window.prompt('Reason for deactivating this product')
		if (!reason || reason.trim().length < 8) return
		deleteMutation.mutate({ id: draft.id, reason: reason.trim() })
	}

	const columns: ColumnDef<AdminProduct>[] = [
		{
			key: 'thumb',
			labelKey: 'volumes.products.columns.thumb',
			width: '44px',
			mobileRole: 'media',
			render: (r) => <CatalogThumbnail src={r.pictureUrl} alt={r.name} />,
		},
		{
			key: 'name',
			labelKey: 'volumes.products.columns.name',
			width: 'minmax(200px, 2fr)',
			mobileRole: 'primary',
			render: (r) => (
				<span className="break-words font-semibold text-[var(--color-text)]">
					{r.name}
				</span>
			),
		},
		{
			key: 'category',
			labelKey: 'volumes.products.columns.category',
			width: 'minmax(140px, 1fr)',
			mobileRole: 'detail',
			render: (r) => (
				<span className="break-words text-[var(--color-text-muted)]">
					{r.category}
				</span>
			),
		},
		{
			key: 'unit',
			labelKey: 'volumes.products.columns.unit',
			width: '90px',
			mono: true,
			mobileRole: 'detail',
			render: (r) => <>{r.unit_of_measure}</>,
		},
		{
			key: 'cost',
			labelKey: 'volumes.products.columns.cost',
			width: 'minmax(120px, 1fr)',
			align: 'end',
			mono: true,
			mobileRole: 'detail',
			render: (r) => <>{r.cost.toLocaleString()} EGP</>,
		},
		{
			key: 'visibility',
			labelKey: 'volumes.products.columns.visibility',
			width: '110px',
			mobileRole: 'detail',
			render: (r) => (
				<StatusTag
					label={
						r.isVisible ? t('editor.values.visible') : t('editor.values.hidden')
					}
					tone={r.isVisible ? 'primary' : 'muted'}
				/>
			),
		},
	]

	const filter = (r: AdminProduct, q: string) =>
		r.name.toLowerCase().includes(q) ||
		r.name_ar.includes(q) ||
		r.category.toLowerCase().includes(q) ||
		r.unit_of_measure_ar.includes(q) ||
		(r.brand?.toLowerCase().includes(q) ?? false) ||
		r.manufacturer.toLowerCase().includes(q)

	return (
		<VolumeWorkspace
			volume={volume}
			volumeId="products"
			rows={products}
			columns={columns}
			rowKey={(r) => r.id}
			onRowSelect={handleRowSelect}
			onNewEntry={handleNew}
			filter={filter}
			isLoading={productsPending}
			isError={productsError}
			onOpenVolumes={onOpenVolumes}
			onExport={requestExport}
			isExporting={isExporting}
			exportStatus={exportStatus}
			mode={mode}
			hasDraft={Boolean(draft)}
			idLabel={draft?.id ?? null}
			isSaving={createMutation.isPending || updateMutation.isPending}
			isDeleting={deleteMutation.isPending}
			saveDisabled={thresholdInvalid || missingCategory}
			onClose={handleClose}
			onEdit={handleEdit}
			onSave={handleSave}
			onCancel={handleCancel}
			onDelete={handleDelete}
		>
			{draft && (
				<div className="space-y-6">
					<CatalogPictureField
						value={draft.pictureUrl}
						onChange={(v) => setDraft({ ...draft, pictureUrl: v })}
						readOnly={readOnly}
						altText={draft.name || t('editor.fields.name')}
						label={t('editor.fields.pictureUrl')}
					/>

					<Section title={t('editor.section.identity')} />
					<Field label={t('editor.fields.name')} required>
						<TextControl
							value={draft.name}
							onChange={(v) => setDraft({ ...draft, name: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.name')}
						/>
					</Field>
					<Field label={t('editor.fields.nameAr')} required>
						<TextControl
							value={draft.name_ar}
							onChange={(v) => setDraft({ ...draft, name_ar: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.nameAr')}
						/>
					</Field>

					<Section title={t('editor.section.taxonomy')} />
					<div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
						<Field label={t('editor.fields.category')} required>
							{categoryOptions.length > 0 ? (
								<SelectControl
									value={draft.category}
									onChange={(v) => setDraft({ ...draft, category: v })}
									options={categoryOptions}
									readOnly={readOnly}
									ariaLabel={t('editor.fields.category')}
								/>
							) : (
								<StatusTag
									label={t('editor.values.categoryRequired')}
									tone="muted"
								/>
							)}
						</Field>
						<Field label={t('editor.fields.brand')}>
							<TextControl
								value={draft.brand ?? ''}
								onChange={(v) => setDraft({ ...draft, brand: v || null })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.brand')}
							/>
						</Field>
						<Field label={t('editor.fields.manufacturer')}>
							<TextControl
								value={draft.manufacturer}
								onChange={(v) => setDraft({ ...draft, manufacturer: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.manufacturer')}
							/>
						</Field>
					</div>

					<Section title={t('editor.section.commercial')} />
					<div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
						<Field label={t('editor.fields.cost')} required>
							<NumberControl
								value={draft.cost}
								onChange={(v) => setDraft({ ...draft, cost: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.cost')}
								min={0}
								suffix="EGP"
							/>
						</Field>
						<Field label={t('editor.fields.availabilityStatus')}>
							{readOnly ? (
								<StatusTag
									label={
										draft.isVisible
											? t('editor.values.visible')
											: t('editor.values.hidden')
									}
									tone={draft.isVisible ? 'primary' : 'muted'}
								/>
							) : (
								<Toggle
									isSelected={draft.isVisible}
									onChange={(checked) =>
										setDraft({ ...draft, isVisible: checked })
									}
									label={
										draft.isVisible
											? t('editor.values.visible')
											: t('editor.values.hidden')
									}
									aria-label={t('editor.fields.availabilityStatus')}
								/>
							)}
						</Field>
					</div>

					<Section title={t('editor.section.specifications')} />
					<div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
						<Field label={t('editor.fields.weightKg')}>
							<NumberControl
								value={draft.weight_kg}
								onChange={(v) => setDraft({ ...draft, weight_kg: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.weightKg')}
								min={0}
								step={0.1}
								suffix="kg"
							/>
						</Field>
						<Field label={t('editor.fields.unitOfMeasure')} required>
							<TextControl
								value={draft.unit_of_measure}
								onChange={(v) => setDraft({ ...draft, unit_of_measure: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.unitOfMeasure')}
							/>
						</Field>
						<Field label={t('editor.fields.unitOfMeasureAr')} required>
							<TextControl
								value={draft.unit_of_measure_ar}
								onChange={(v) => setDraft({ ...draft, unit_of_measure_ar: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.unitOfMeasureAr')}
							/>
						</Field>
					</div>

					<Section title={t('editor.section.stock')} />
					<div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
						<Field label={t('editor.fields.lowStockThreshold')}>
							<NumberControl
								value={draft.lowStockThreshold}
								onChange={(v) => setDraft({ ...draft, lowStockThreshold: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.lowStockThreshold')}
								min={0}
							/>
						</Field>
						<Field label={t('editor.fields.goodStockThreshold')}>
							<NumberControl
								value={draft.goodStockThreshold}
								onChange={(v) => setDraft({ ...draft, goodStockThreshold: v })}
								readOnly={readOnly}
								ariaLabel={t('editor.fields.goodStockThreshold')}
								min={0}
							/>
							{thresholdInvalid && !readOnly && (
								<p className="mt-2 font-[family-name:var(--font-archivo)] text-[12px] text-red-700 dark:text-red-300">
									{t('editor.values.goodStockThresholdInvalid')}
								</p>
							)}
						</Field>
					</div>

					<Field label={t('editor.fields.description')} required>
						<TextAreaControl
							value={draft.description}
							onChange={(v) => setDraft({ ...draft, description: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.description')}
							rows={3}
						/>
					</Field>
					<Field label={t('editor.fields.descriptionAr')} required>
						<TextAreaControl
							value={draft.description_ar}
							onChange={(v) => setDraft({ ...draft, description_ar: v })}
							readOnly={readOnly}
							ariaLabel={t('editor.fields.descriptionAr')}
							rows={3}
						/>
					</Field>
				</div>
			)}
		</VolumeWorkspace>
	)
}
