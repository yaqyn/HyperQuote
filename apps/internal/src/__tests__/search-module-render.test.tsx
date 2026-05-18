import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SearchModule } from '../components/search/SearchModule'

describe('SearchModule first render', () => {
	it('renders the search input immediately without an access-key gate', () => {
		const queryClient = new QueryClient()
		const html = renderToStaticMarkup(
			<QueryClientProvider client={queryClient}>
				<SearchModule />
			</QueryClientProvider>,
		)

		expect(html).toContain('aria-label="Search internal database"')
		expect(html).toContain('placeholder="Query"')
		expect(html).not.toContain('Executive access key')
		expect(html).not.toContain('Welcome back, executive.')
	})
})
