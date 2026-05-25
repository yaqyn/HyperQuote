import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { WebsiteFooter } from '../components/layout/WebsiteFooter'
import { WebsiteHeader } from '../components/layout/WebsiteHeader'
import { websiteHead } from '../lib/seo'

export const Route = createFileRoute('/_website')({
	head: () =>
		websiteHead({
			title: 'HyperQuote — Building Materials Marketplace',
			description:
				'HyperQuote helps construction teams in Egypt source building materials, compare supplier quotes, and track delivery from request to handoff.',
			path: '/',
		}),
	component: WebsiteLayout,
})

function WebsiteLayout() {
	const [shadowOpacity, setShadowOpacity] = useState(1)

	useEffect(() => {
		function onScroll() {
			const scrollTop = window.scrollY
			const docHeight =
				document.documentElement.scrollHeight - window.innerHeight
			if (docHeight <= 0) {
				setShadowOpacity(0)
				return
			}
			const remaining = docHeight - scrollTop
			setShadowOpacity(Math.min(1, remaining / 800))
		}
		window.addEventListener('scroll', onScroll, { passive: true })
		onScroll()
		return () => window.removeEventListener('scroll', onScroll)
	}, [])

	return (
		<>
			<WebsiteHeader />
			<main
				id="main"
				className="relative z-10 bg-[var(--color-base)]"
				style={{
					boxShadow: `0 40px 100px rgba(0,0,0,${(0.5 * shadowOpacity).toFixed(3)})`,
				}}
			>
				<Outlet />
			</main>
			<WebsiteFooter />
		</>
	)
}
