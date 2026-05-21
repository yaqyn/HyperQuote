/**
 * DocumentTable: Sortable document table with view/download actions.
 * Desktop: React Aria Table with sortable columns.
 * Mobile: Card layout (one card per document).
 */

import { Download, Eye } from 'lucide-react'
import { Button } from 'react-aria-components/Button'
import {
	Cell,
	Column,
	Row,
	Table,
	TableBody,
	TableHeader,
} from 'react-aria-components/Table'
import { useTranslation } from 'react-i18next'
import type { Document } from '../../types/document'

interface DocumentTableProps {
	documents: Document[]
	onView: (doc: Document) => void
	onDownload: (doc: Document) => void
	sortBy?: 'date' | 'reference'
	sortDir?: 'asc' | 'desc'
	onSortChange?: (sortBy: 'date' | 'reference', sortDir: 'asc' | 'desc') => void
}

export function DocumentTable({
	documents,
	onView,
	onDownload,
	sortBy = 'date',
	sortDir = 'desc',
	onSortChange,
}: DocumentTableProps) {
	const { t, i18n } = useTranslation('portal')
	const isArabic = i18n.language === 'ar'
	const dateFormatter = new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-GB', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	})

	function handleSort(col: 'date' | 'reference') {
		if (!onSortChange) return
		if (sortBy === col) {
			onSortChange(col, sortDir === 'asc' ? 'desc' : 'asc')
		} else {
			onSortChange(col, 'desc')
		}
	}

	function sortIndicator(col: 'date' | 'reference') {
		if (sortBy !== col) return null
		return sortDir === 'asc' ? ' \u2191' : ' \u2193'
	}

	return (
		<div>
			{/* Desktop: React Aria Table */}
			<div className="hidden md:block">
				<Table
					aria-label={t('documents.tableLabel')}
					className="w-full text-sm"
				>
					<TableHeader>
						<Column
							isRowHeader
							className="text-start py-2 px-3 text-[13px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider"
						>
							<button
								type="button"
								onClick={() => handleSort('reference')}
								className="cursor-pointer hover:text-[var(--color-text)]"
							>
								{t('documents.colReference')}
								{sortIndicator('reference')}
							</button>
						</Column>
						<Column className="text-start py-2 px-3 text-[13px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
							{t('documents.colTitle')}
						</Column>
						<Column className="text-start py-2 px-3 text-[13px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
							<button
								type="button"
								onClick={() => handleSort('date')}
								className="cursor-pointer hover:text-[var(--color-text)]"
							>
								{t('documents.colDate')}
								{sortIndicator('date')}
							</button>
						</Column>
						<Column className="text-end py-2 px-3 text-[13px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
							{t('documents.colSize')}
						</Column>
						<Column className="text-end py-2 px-3 text-[13px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
							{t('documents.colActions')}
						</Column>
					</TableHeader>
					<TableBody>
						{documents.map((doc) => (
							<Row
								key={doc.id}
								className="border-t border-[var(--color-border)]"
							>
								<Cell className="py-3 px-3 font-mono text-sm text-[var(--color-primary)]">
									{doc.reference}
								</Cell>
								<Cell className="py-3 px-3 text-[var(--color-text)]">
									{doc.title}
								</Cell>
								<Cell className="py-3 px-3 font-mono text-[13px] text-[var(--color-text-muted)]">
									{dateFormatter.format(new Date(doc.date))}
								</Cell>
								<Cell className="py-3 px-3 text-end font-mono text-[13px] text-[var(--color-text-muted)]">
									{doc.fileSize}
								</Cell>
								<Cell className="py-3 px-3 text-end">
									<div className="flex items-center justify-end gap-2">
										<Button
											onPress={() => onView(doc)}
											className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
										>
											<Eye size={14} />
											{t('documents.view')}
										</Button>
										<Button
											onPress={() => onDownload(doc)}
											className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
										>
											<Download size={16} />
											{t('documents.download')}
										</Button>
									</div>
								</Cell>
							</Row>
						))}
					</TableBody>
				</Table>
			</div>

			{/* Mobile: Card layout */}
			<div className="flex md:hidden flex-col gap-3">
				{documents.map((doc) => (
					<div
						key={doc.id}
						className="rounded-xl border border-[var(--color-border)] p-4"
					>
						<div className="flex items-start justify-between mb-2">
							<span className="font-mono text-sm text-[var(--color-primary)]">
								{doc.reference}
							</span>
							<span className="font-mono text-[13px] text-[var(--color-text-muted)]">
								{doc.fileSize}
							</span>
						</div>
						<p className="text-sm text-[var(--color-text)] mb-1">{doc.title}</p>
						<p className="font-mono text-[13px] text-[var(--color-text-muted)] mb-3">
							{dateFormatter.format(new Date(doc.date))}
						</p>
						<div className="flex items-center gap-2">
							<Button
								onPress={() => onView(doc)}
								className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--color-primary)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
							>
								<Eye size={14} />
								{t('documents.view')}
							</Button>
							<Button
								onPress={() => onDownload(doc)}
								className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
							>
								<Download size={16} />
								{t('documents.download')}
							</Button>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
