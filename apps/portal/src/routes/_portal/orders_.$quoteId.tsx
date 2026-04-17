import { createFileRoute } from '@tanstack/react-router'
import { QuoteDetail } from '../../components/quote-detail/QuoteDetail'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'
import { getQuoteDetail } from '../../lib/server/quotes'

export const Route = createFileRoute('/_portal/orders_/$quoteId')({
	loader: async ({ params }) => {
		return getQuoteDetail({ data: { quoteId: params.quoteId } })
	},
	component: QuoteDetailRoute,
})

function QuoteDetailRoute() {
	const quote = Route.useLoaderData()
	return (
		<div className="flex-1 flex flex-col h-full min-h-0 overflow-auto">
			<div className="w-full max-w-[800px] mx-auto px-6 max-md:px-4 py-8 max-md:py-5">
				<div className="flex items-center gap-3 mb-6">
					<h1
						className="text-[22px] font-semibold tracking-tight font-mono"
						style={{
							background:
								'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.25) 100%)',
							WebkitBackgroundClip: 'text',
							WebkitTextFillColor: 'transparent',
							backgroundClip: 'text',
						}}
					>
						{quote.quoteNumber}
					</h1>
					<span className="text-sm text-[var(--p-text-muted)]">
						{quote.status}
					</span>
				</div>
				<QuoteDetail quote={quote} />
			</div>
			<FloatingAIButton />
		</div>
	)
}
