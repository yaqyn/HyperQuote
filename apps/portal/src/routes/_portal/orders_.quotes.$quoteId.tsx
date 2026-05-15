import { createFileRoute } from '@tanstack/react-router'
import { QuoteDetail } from '../../components/quote-detail/QuoteDetail'
import { PortalTitleRow } from '../../components/shell/PortalTitleRow'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'
import { getQuoteDetail } from '../../lib/server/quotes'

export const Route = createFileRoute('/_portal/orders_/quotes/$quoteId')({
	loader: async ({ params }) => {
		return getQuoteDetail({ data: { quoteId: params.quoteId } })
	},
	component: QuoteDetailRoute,
})

function QuoteDetailRoute() {
	const quote = Route.useLoaderData()
	return (
		<div className="flex-1 flex flex-col h-full min-h-0 overflow-auto">
			<div className="w-full max-w-[800px] mx-auto px-4 pb-8 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6 sm:pt-5">
				<PortalTitleRow
					title={quote.quoteNumber}
					subtitle={quote.status}
					fixed
					className="-mx-4 mb-6 px-4 sm:-mx-6 sm:px-6"
				/>
				<QuoteDetail quote={quote} />
			</div>
			<FloatingAIButton />
		</div>
	)
}
