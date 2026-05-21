import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	type AdminCategoryRow,
	type AdminProduct,
	type AdminSupplierSpecialtyRow,
	adminAddSupplierSpecialty,
	adminListCategories,
	adminListProducts,
	adminListSupplierSpecialties,
	adminRemoveSupplierSpecialty,
	adminUpdateSupplierSpecialty,
} from '../../lib/server/admin'
import {
	EmployeeActionButton,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'
import { LinkAction, SelectControl } from './AdminControls'

const ALL_SCOPE = '__all__'

type SpecialtyDraft = {
	categorySlug: string
	productSlug: string | null
}

type SelectOption = {
	value: string
	label: string
}

export function SupplierSpecialties({
	supplierId,
	readOnly,
}: {
	supplierId: string | null
	readOnly: boolean
}) {
	const { t } = useTranslation('admin')
	const qc = useQueryClient()

	const {
		data: specialties = [],
		isError: specialtiesError,
		isPending: specialtiesPending,
	} = useQuery({
		queryKey: ['admin', 'supplierSpecialties', supplierId ?? ''],
		queryFn: () =>
			adminListSupplierSpecialties({ data: { supplierId: supplierId ?? '' } }),
		enabled: Boolean(supplierId),
	})

	const {
		data: categories = [],
		isError: categoriesError,
		isPending: categoriesPending,
	} = useQuery({
		queryKey: ['admin', 'categories'],
		queryFn: () => adminListCategories(),
	})

	const {
		data: products = [],
		isError: productsError,
		isPending: productsPending,
	} = useQuery({
		queryKey: ['admin', 'products'],
		queryFn: () => adminListProducts(),
	})

	const categoryNameBySlug = useMemo(
		() => new Map(categories.map((category) => [category.slug, category.name])),
		[categories],
	)
	const productNameBySlug = useMemo(
		() => new Map(products.map((product) => [product.slug, product.name])),
		[products],
	)
	const categoryOptions = useMemo(
		() => buildCategoryOptions(categories),
		[categories],
	)
	const activeCategoryOptions = useMemo(
		() =>
			buildCategoryOptions(categories.filter((category) => category.isActive)),
		[categories],
	)

	const invalidateSpecialties = () => {
		qc.invalidateQueries({
			queryKey: ['admin', 'supplierSpecialties', supplierId ?? ''],
		})
		qc.invalidateQueries({ queryKey: ['admin', 'suppliers'] })
		qc.invalidateQueries({ queryKey: ['inventory-overview'] })
		qc.invalidateQueries({ queryKey: ['stock-overview'] })
		qc.invalidateQueries({ queryKey: ['inventory-product-detail'] })
		qc.invalidateQueries({ queryKey: ['refill-product'] })
		qc.invalidateQueries({ queryKey: ['supplier-batch-price-options'] })
	}

	const addMutation = useMutation({
		mutationFn: (payload: {
			supplierId: string
			categorySlug: string
			productSlug: string | null
		}) => adminAddSupplierSpecialty({ data: payload }),
		onSuccess: invalidateSpecialties,
	})

	const updateMutation = useMutation({
		mutationFn: (payload: {
			id: string
			categorySlug: string
			productSlug: string | null
		}) => adminUpdateSupplierSpecialty({ data: payload }),
		onSuccess: invalidateSpecialties,
	})

	const removeMutation = useMutation({
		mutationFn: (id: string) => adminRemoveSupplierSpecialty({ data: { id } }),
		onSuccess: invalidateSpecialties,
	})

	const [adding, setAdding] = useState(false)
	const [addDraft, setAddDraft] = useState<SpecialtyDraft>({
		categorySlug: '',
		productSlug: null,
	})

	function startAdd() {
		setAddDraft({
			categorySlug: activeCategoryOptions[0]?.value ?? '',
			productSlug: null,
		})
		setAdding(true)
	}

	function commitAdd() {
		if (!supplierId || !addDraft.categorySlug) return
		if (hasDuplicateSpecialty(specialties, addDraft)) return
		addMutation.mutate(
			{
				supplierId,
				categorySlug: addDraft.categorySlug,
				productSlug: addDraft.productSlug,
			},
			{
				onSuccess: () => {
					setAdding(false)
				},
			},
		)
	}

	if (!supplierId) {
		return (
			<div className="py-2">
				<EmployeeStatusPill>{t('specialties.saveFirst')}</EmployeeStatusPill>
			</div>
		)
	}

	const catalogError = categoriesError || productsError
	const catalogPending = categoriesPending || productsPending

	return (
		<div className="space-y-3">
			{specialtiesError ? (
				<EmployeeStatusPill tone="danger">
					{t('specialties.error')}
				</EmployeeStatusPill>
			) : specialtiesPending ? (
				<EmployeeStatusPill>{t('specialties.loading')}</EmployeeStatusPill>
			) : specialties.length === 0 ? (
				<EmployeeStatusPill>{t('specialties.empty')}</EmployeeStatusPill>
			) : (
				<ul className="divide-y divide-black/[0.05] rounded-md border border-[var(--color-border)] dark:divide-white/[0.06]">
					{specialties.map((specialty) => (
						<SpecialtyRow
							key={specialty.id}
							specialty={specialty}
							categories={categories}
							products={products}
							categoryOptions={categoryOptions}
							categoryNameBySlug={categoryNameBySlug}
							productNameBySlug={productNameBySlug}
							readOnly={readOnly}
							isSaving={updateMutation.isPending}
							isRemoving={removeMutation.isPending}
							onUpdate={(patch) => {
								if (hasDuplicateSpecialty(specialties, patch, specialty.id)) {
									return
								}
								updateMutation.mutate({ id: specialty.id, ...patch })
							}}
							onRemove={() => {
								if (
									typeof window !== 'undefined' &&
									!window.confirm(t('specialties.confirmRemove'))
								) {
									return
								}
								removeMutation.mutate(specialty.id)
							}}
						/>
					))}
				</ul>
			)}

			{!readOnly && catalogError && (
				<EmployeeStatusPill tone="danger">
					{t('specialties.catalogError')}
				</EmployeeStatusPill>
			)}
			{!readOnly && catalogPending && (
				<EmployeeStatusPill>
					{t('specialties.catalogLoading')}
				</EmployeeStatusPill>
			)}

			{!readOnly && !catalogPending && !catalogError && (
				<div className="pt-2">
					{activeCategoryOptions.length === 0 ? (
						<EmployeeStatusPill>
							{t('specialties.noCategories')}
						</EmployeeStatusPill>
					) : adding ? (
						<SpecialtyAddForm
							draft={addDraft}
							setDraft={setAddDraft}
							categoryOptions={activeCategoryOptions}
							products={products}
							duplicate={hasDuplicateSpecialty(specialties, addDraft)}
							onCommit={commitAdd}
							onCancel={() => setAdding(false)}
							committing={addMutation.isPending}
						/>
					) : (
						<EmployeeActionButton
							onClick={startAdd}
							tone="primary"
							size="sm"
							leading={<Plus size={14} strokeWidth={2.2} />}
							fullWidthOnMobile
						>
							{t('specialties.add')}
						</EmployeeActionButton>
					)}
				</div>
			)}
		</div>
	)
}

function SpecialtyRow({
	specialty,
	categories,
	products,
	categoryOptions,
	categoryNameBySlug,
	productNameBySlug,
	readOnly,
	isSaving,
	isRemoving,
	onUpdate,
	onRemove,
}: {
	specialty: AdminSupplierSpecialtyRow
	categories: AdminCategoryRow[]
	products: AdminProduct[]
	categoryOptions: SelectOption[]
	categoryNameBySlug: Map<string, string>
	productNameBySlug: Map<string, string>
	readOnly: boolean
	isSaving: boolean
	isRemoving: boolean
	onUpdate: (patch: SpecialtyDraft) => void
	onRemove: () => void
}) {
	const { t } = useTranslation('admin')
	const productValue = specialty.productSlug ?? ALL_SCOPE
	const productOptions = buildProductOptions(
		products,
		specialty.categorySlug,
		specialty.productSlug,
		t('specialties.allProducts'),
	)
	const categoryOptionsWithCurrent = ensureOption(
		categoryOptions,
		specialty.categorySlug,
		categoryNameBySlug.get(specialty.categorySlug) ?? specialty.categorySlug,
	)
	const productOptionsWithCurrent = ensureOption(
		productOptions,
		productValue,
		specialty.productSlug
			? (productNameBySlug.get(specialty.productSlug) ?? specialty.productSlug)
			: t('specialties.allProducts'),
	)

	const category = categories.find(
		(candidate) => candidate.slug === specialty.categorySlug,
	)
	const product = specialty.productSlug
		? products.find((candidate) => candidate.slug === specialty.productSlug)
		: null
	const readLabel = `${category?.name ?? specialty.categorySlug} · ${
		product?.name ?? specialty.productSlug ?? t('specialties.allProducts')
	}`

	if (readOnly) {
		return (
			<li className="px-3 py-3">
				<span className="break-words font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-[var(--color-text)]">
					{readLabel}
				</span>
			</li>
		)
	}

	return (
		<li>
			<div className="grid gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
				<SelectControl
					value={specialty.categorySlug}
					onChange={(categorySlug) =>
						onUpdate({ categorySlug, productSlug: null })
					}
					options={categoryOptionsWithCurrent}
					readOnly={isSaving}
					ariaLabel={t('specialties.columns.category')}
				/>
				<SelectControl
					value={productValue}
					onChange={(value) =>
						onUpdate({
							categorySlug: specialty.categorySlug,
							productSlug: value === ALL_SCOPE ? null : value,
						})
					}
					options={productOptionsWithCurrent}
					readOnly={isSaving}
					ariaLabel={t('specialties.columns.product')}
				/>
				<button
					type="button"
					onClick={onRemove}
					aria-label={t('specialties.remove')}
					disabled={isRemoving}
					className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-600/20 bg-red-600/[0.05] text-red-700 outline-none transition-colors hover:bg-red-600/[0.09] disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-red-600/25 dark:text-red-300"
				>
					<X size={14} strokeWidth={2.1} />
				</button>
			</div>
		</li>
	)
}

function SpecialtyAddForm({
	draft,
	setDraft,
	categoryOptions,
	products,
	duplicate,
	onCommit,
	onCancel,
	committing,
}: {
	draft: SpecialtyDraft
	setDraft: (draft: SpecialtyDraft) => void
	categoryOptions: SelectOption[]
	products: AdminProduct[]
	duplicate: boolean
	onCommit: () => void
	onCancel: () => void
	committing: boolean
}) {
	const { t } = useTranslation('admin')
	const productValue = draft.productSlug ?? ALL_SCOPE
	const productOptions = buildProductOptions(
		products,
		draft.categorySlug,
		null,
		t('specialties.allProducts'),
	)

	return (
		<div className="space-y-3 rounded-md border border-[var(--color-border)] bg-black/[0.015] p-3 dark:bg-white/[0.02]">
			<div className="grid gap-3 sm:grid-cols-2">
				<SelectControl
					value={draft.categorySlug}
					onChange={(categorySlug) =>
						setDraft({ categorySlug, productSlug: null })
					}
					options={categoryOptions}
					ariaLabel={t('specialties.columns.category')}
				/>
				<SelectControl
					value={productValue}
					onChange={(value) =>
						setDraft({
							...draft,
							productSlug: value === ALL_SCOPE ? null : value,
						})
					}
					options={productOptions}
					readOnly={!draft.categorySlug}
					ariaLabel={t('specialties.columns.product')}
				/>
			</div>
			{duplicate && (
				<EmployeeStatusPill tone="danger">
					{t('specialties.duplicate')}
				</EmployeeStatusPill>
			)}
			<div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
				<LinkAction
					tone="primary"
					onClick={onCommit}
					disabled={committing || !draft.categorySlug || duplicate}
				>
					{t('specialties.add')}
				</LinkAction>
				<LinkAction onClick={onCancel}>{t('actions.cancel')}</LinkAction>
			</div>
		</div>
	)
}

function buildCategoryOptions(categories: AdminCategoryRow[]): SelectOption[] {
	return categories.map((category) => ({
		value: category.slug,
		label: category.name,
	}))
}

function buildProductOptions(
	products: AdminProduct[],
	categorySlug: string,
	currentProductSlug?: string | null,
	allLabel = 'All',
): SelectOption[] {
	const scoped = products.filter(
		(product) =>
			product.category === categorySlug &&
			(product.availability_status !== 'hidden' ||
				product.slug === currentProductSlug),
	)
	return [
		{ value: ALL_SCOPE, label: allLabel },
		...scoped.map((product) => ({
			value: product.slug,
			label: product.name,
		})),
	]
}

function ensureOption(
	options: SelectOption[],
	value: string,
	label: string,
): SelectOption[] {
	if (options.some((option) => option.value === value)) return options
	return [{ value, label }, ...options]
}

function specialtyKey(value: SpecialtyDraft): string {
	return `${value.categorySlug}:${value.productSlug ?? ALL_SCOPE}`
}

function hasDuplicateSpecialty(
	specialties: AdminSupplierSpecialtyRow[],
	value: SpecialtyDraft,
	ignoreId?: string,
): boolean {
	const key = specialtyKey(value)
	return specialties.some(
		(specialty) =>
			specialty.id !== ignoreId &&
			specialtyKey({
				categorySlug: specialty.categorySlug,
				productSlug: specialty.productSlug,
			}) === key,
	)
}

export function useSupplierSpecialtyCount(supplierId: string): number {
	const { data = [] } = useQuery({
		queryKey: ['admin', 'supplierSpecialties', supplierId],
		queryFn: () => adminListSupplierSpecialties({ data: { supplierId } }),
	})
	return (data as AdminSupplierSpecialtyRow[]).length
}
