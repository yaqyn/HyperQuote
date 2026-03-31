import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_website/')({
	component: HomePage,
})

function HomePage() {
	return <div>Home page placeholder</div>
}
