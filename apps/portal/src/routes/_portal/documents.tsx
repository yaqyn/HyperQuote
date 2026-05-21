import { createFileRoute } from '@tanstack/react-router'
import type { ParseKeys } from 'i18next'
import { Search, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Input } from 'react-aria-components/Input'
import { Label } from 'react-aria-components/Label'
import { SearchField } from 'react-aria-components/SearchField'
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components/Tabs'
import { useTranslation } from 'react-i18next'
import { DocumentTable } from '../../components/documents/DocumentTable'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'
import { WindowShell } from '../../components/windows/WindowShell'
import { downloadInvoicePDF, getDocuments } from '../../lib/server/documents'
import type { Document, DocumentType } from '../../types/document'

export const Route = createFileRoute('/_portal/documents')({
	component: DocumentsWindow,
})

type TabKey = 'invoices' | 'delivery_notes' | 'quotes' | 'certificates' | 'all'

const TAB_TYPE_MAP: Record<TabKey, DocumentType | undefined> = {
	invoices: 'invoice',
	delivery_notes: 'delivery_note',
	quotes: 'quote_pdf',
	certificates: 'certificate',
	all: undefined,
}

const TAB_OPTIONS = [
	{ id: 'invoices', labelKey: 'documents.tabInvoices' },
	{ id: 'delivery_notes', labelKey: 'documents.tabDeliveryNotes' },
	{ id: 'quotes', labelKey: 'documents.tabQuotes' },
	{ id: 'certificates', labelKey: 'documents.tabCertificates' },
	{ id: 'all', labelKey: 'documents.tabAll' },
] satisfies ReadonlyArray<{
	id: TabKey
	labelKey: ParseKeys<'portal'>
}>

function DocumentsWindow() {
	const { t } = useTranslation('portal')
	const [activeTab, setActiveTab] = useState<TabKey>('invoices')
	const [search, setSearch] = useState('')
	const [sortBy, setSortBy] = useState<'date' | 'reference'>('date')
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
	const [documents, setDocuments] = useState<Document[]>([])
	const [_total, setTotal] = useState(0)
	const [loading, setLoading] = useState(true)

	// Fetch documents when tab, search, or sort changes
	const fetchDocuments = useCallback(
		async (
			tab: TabKey,
			searchQuery: string,
			sort: 'date' | 'reference',
			dir: 'asc' | 'desc',
		) => {
			setLoading(true)
			try {
				const result = await getDocuments({
					data: {
						type: TAB_TYPE_MAP[tab],
						search: searchQuery || undefined,
						page: 1,
						limit: 20,
						sortBy: sort,
						sortDir: dir,
					},
				})
				setDocuments(result.documents)
				setTotal(result.total)
			} catch {
				setDocuments([])
				setTotal(0)
			} finally {
				setLoading(false)
			}
		},
		[],
	)

	// Initial load and re-fetch on changes
	useState(() => {
		fetchDocuments(activeTab, search, sortBy, sortDir)
	})

	function handleTabChange(key: string | number) {
		const tab = key as TabKey
		setActiveTab(tab)
		fetchDocuments(tab, search, sortBy, sortDir)
	}

	function handleSearchChange(value: string) {
		setSearch(value)
		fetchDocuments(activeTab, value, sortBy, sortDir)
	}

	function handleSearchClear() {
		setSearch('')
		fetchDocuments(activeTab, '', sortBy, sortDir)
	}

	function handleSortChange(
		newSortBy: 'date' | 'reference',
		newSortDir: 'asc' | 'desc',
	) {
		setSortBy(newSortBy)
		setSortDir(newSortDir)
		fetchDocuments(activeTab, search, newSortBy, newSortDir)
	}

	function handleView(doc: Document) {
		if (doc.downloadUrl) {
			window.open(doc.downloadUrl, '_blank', 'noopener,noreferrer')
		}
	}

	async function handleDownload(doc: Document) {
		try {
			const result = await downloadInvoicePDF({
				data: { invoiceId: doc.id },
			})
			if (result.url) {
				window.open(result.url, '_blank', 'noopener,noreferrer')
			}
		} catch {
			// Keep the document list stable when a download URL cannot be generated.
		}
	}

	return (
		<>
			<WindowShell title={t('documents.windowTitle')}>
				<div className="flex flex-col gap-4">
					{/* Search field */}
					<div className="px-1">
						<SearchField
							value={search}
							onChange={handleSearchChange}
							onClear={handleSearchClear}
							aria-label={t('documents.searchLabel')}
							className="relative w-full max-w-sm"
						>
							<Label className="sr-only">{t('documents.searchLabel')}</Label>
							<div className="relative">
								<Search
									size={16}
									className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
								/>
								<Input
									placeholder={t('documents.searchPlaceholder')}
									className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] ps-9 pe-9 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
								/>
								{search && (
									<button
										type="button"
										onClick={handleSearchClear}
										className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
									>
										<X size={14} />
									</button>
								)}
							</div>
						</SearchField>
					</div>

					{/* Tabs */}
					<Tabs selectedKey={activeTab} onSelectionChange={handleTabChange}>
						<TabList
							aria-label={t('documents.windowTitle')}
							className="flex border-b border-[var(--color-border)] overflow-x-auto"
						>
							{TAB_OPTIONS.map((tab) => (
								<DocumentTab key={tab.id} id={tab.id}>
									{t(tab.labelKey)}
								</DocumentTab>
							))}
						</TabList>

						{/* All tabs share the same content panel */}
						{TAB_OPTIONS.map(({ id: tabId }) => (
							<TabPanel key={tabId} id={tabId} className="pt-4">
								{loading ? (
									<div className="flex flex-col gap-3">
										{['a', 'b', 'c', 'd', 'e'].map((slot) => (
											<div
												key={`skeleton-${tabId}-${slot}`}
												className="h-12 rounded-lg bg-[var(--color-surface)] animate-pulse"
											/>
										))}
									</div>
								) : documents.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-16 gap-3">
										<p className="text-lg font-semibold text-[var(--color-text)]">
											{t('documents.emptyHeading')}
										</p>
										<p className="text-sm text-[var(--color-text-muted)]">
											{t('documents.emptyBody')}
										</p>
									</div>
								) : (
									<DocumentTable
										documents={documents}
										onView={handleView}
										onDownload={handleDownload}
										sortBy={sortBy}
										sortDir={sortDir}
										onSortChange={handleSortChange}
									/>
								)}
							</TabPanel>
						))}
					</Tabs>
				</div>
			</WindowShell>
			<FloatingAIButton />
		</>
	)
}

function DocumentTab({
	id,
	children,
}: {
	id: TabKey
	children: React.ReactNode
}) {
	return (
		<Tab
			id={id}
			className={({ isSelected }) =>
				`px-4 py-2.5 text-sm whitespace-nowrap cursor-pointer outline-none transition-colors ${
					isSelected
						? 'text-[var(--color-text)] border-b-2 border-[var(--color-primary)] font-medium'
						: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
				}`
			}
		>
			{children}
		</Tab>
	)
}
