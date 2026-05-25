import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './lib/i18n'
import './styles.css'
import { registerDriverServiceWorker } from './lib/pwa'
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
			<RouterProvider router={router} />
		</QueryClientProvider>
	</StrictMode>,
)

if (import.meta.env.PROD) registerDriverServiceWorker()
