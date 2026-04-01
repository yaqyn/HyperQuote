import { createFileRoute } from '@tanstack/react-router'
import { getQuoteDetail } from '../../lib/server/quotes'
import { WindowShell } from '../../components/windows/WindowShell'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'
import { QuoteDetail } from '../../components/quote-detail/QuoteDetail'

export const Route = createFileRoute('/_portal/orders_/$quoteId')({
  loader: async ({ params }) => {
    return getQuoteDetail({ data: { quoteId: params.quoteId } })
  },
  component: QuoteDetailRoute,
})

function QuoteDetailRoute() {
  const quote = Route.useLoaderData()
  return (
    <>
      <WindowShell title={quote.quoteNumber} subtitle={quote.status}>
        <QuoteDetail quote={quote} />
      </WindowShell>
      <FloatingAIButton />
    </>
  )
}
