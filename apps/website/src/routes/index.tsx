import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

const getHello = createServerFn().handler(async () => {
	return {
		message: 'HyperQuote is running on Workers',
		timestamp: Date.now(),
		environment:
			typeof globalThis.caches !== 'undefined' ? 'workers' : 'node',
	}
})

export const Route = createFileRoute('/')({
	loader: () => getHello(),
	component: HomePage,
})

function HomePage() {
	const data = Route.useLoaderData()
	return (
		<div style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>{data.message}</h1>
			<p>Timestamp: {data.timestamp}</p>
			<p>Environment: {data.environment}</p>
		</div>
	)
}
