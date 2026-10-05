import { PortfolioShell } from '@hyperquote/ui/navigation/PortfolioShell'
import { registerServiceWorker } from '@hyperquote/ui/pwa/service-worker'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './lib/i18n'
import './styles.css'
import { router } from './router'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			staleTime: 15_000,
		},
	},
})

const root = document.getElementById('root')

if (!root) throw new Error('Driver app root was not found.')

createRoot(root).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<PortfolioShell app="driver" env={import.meta.env}>
				<RouterProvider router={router} />
			</PortfolioShell>
		</QueryClientProvider>
	</StrictMode>,
)

if (import.meta.env.PROD) registerServiceWorker()
