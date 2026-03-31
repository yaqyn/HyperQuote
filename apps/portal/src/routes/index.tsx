import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
	component: () => (
		<div style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>HyperQuote Portal</h1>
		</div>
	),
})
