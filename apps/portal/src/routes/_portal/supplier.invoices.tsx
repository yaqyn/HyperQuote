/**
 * Invoice submission route with 2 tabs: Submit New, Submitted Invoices.
 * Reads optional ?poId search param to pre-select PO in invoice form.
 */
import { createFileRoute } from '@tanstack/react-router'
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components/Tabs'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { InvoiceForm } from '../../components/supplier/InvoiceForm'
import { InvoiceListTable } from '../../components/supplier/InvoiceListTable'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'
import { WindowShell } from '../../components/windows/WindowShell'

const searchSchema = z.object({
	poId: z.string().optional(),
})

export const Route = createFileRoute('/_portal/supplier/invoices')({
	validateSearch: (search) => searchSchema.parse(search),
	component: SupplierInvoicesWindow,
})

function SupplierInvoicesWindow() {
	const { t, i18n } = useTranslation('portal')
	const locale = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as 'ar' | 'en'
	const { poId } = Route.useSearch()

	return (
		<>
			<WindowShell title={t('supplier.invoicesTitle')}>
				<div className="flex flex-col gap-4 p-6">
					<Tabs
						defaultSelectedKey={poId ? 'submitNew' : 'submitNew'}
						className="flex flex-col gap-4"
					>
						<TabList className="flex gap-1 border-b border-[var(--color-border)]">
							<StyledTab id="submitNew">{t('supplier.submitNew')}</StyledTab>
							<StyledTab id="submitted">
								{t('supplier.submittedInvoices')}
							</StyledTab>
						</TabList>

						<TabPanel id="submitNew">
							<InvoiceForm locale={locale} preselectedPoId={poId} />
						</TabPanel>
						<TabPanel id="submitted">
							<InvoiceListTable locale={locale} />
						</TabPanel>
					</Tabs>
				</div>
			</WindowShell>
			<FloatingAIButton />
		</>
	)
}

function StyledTab({
	id,
	children,
}: {
	id: string
	children: React.ReactNode
}) {
	return (
		<Tab
			id={id}
			className={({ isSelected }) =>
				[
					'px-4 py-2 text-sm cursor-pointer outline-none transition-colors -mb-px',
					isSelected
						? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] font-semibold'
						: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
				].join(' ')
			}
		>
			{children}
		</Tab>
	)
}
