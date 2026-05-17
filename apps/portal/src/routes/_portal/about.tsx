import { LampContainer } from '@hyperquote/ui/brand/LampEffect'
import { createFileRoute } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FloatingParticles } from '../../components/login/FloatingParticles'
import { PortalTitleRow } from '../../components/shell/PortalTitleRow'
import { SidebarTitleButton } from '../../components/shell/SidebarTitleButton'
import { usePortalThemeSnapshot } from '../../hooks/usePortalThemeSnapshot'

export const Route = createFileRoute('/_portal/about')({
	component: AboutPage,
})

const APP_VERSION = '1.0.0'

function AboutPage() {
	const { t } = useTranslation('portal')
	const theme = usePortalThemeSnapshot()

	const links = [
		{
			key: 'about.terms',
			fallback: 'Terms of Use',
			href: 'https://www.hyperquote.net/docs/legal/terms-of-service',
			external: true,
		},
		{
			key: 'about.privacy',
			fallback: 'Privacy Policy',
			href: 'https://www.hyperquote.net/docs/legal/privacy-policy',
			external: true,
		},
		{
			key: 'about.support',
			fallback: 'Support',
			href: 'https://www.hyperquote.net/docs/support',
			external: true,
		},
		{
			key: 'about.website',
			fallback: 'hyperquote.net',
			href: 'https://www.hyperquote.net',
			external: true,
		},
	]

	return (
		<div
			className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative"
			style={{ background: 'var(--p-bg)' }}
		>
			<AboutSidebarHeader />
			{theme === 'light' ? (
				<LightAboutContent links={links} t={t} />
			) : (
				<DarkAboutContent links={links} t={t} />
			)}
		</div>
	)
}

function AboutSidebarHeader() {
	return (
		<div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6 sm:pt-5 lg:px-8">
			<div className="pointer-events-auto flex items-center">
				<SidebarTitleButton className="-ms-2" />
			</div>
		</div>
	)
}

function DarkAboutContent({
	links,
	t,
}: {
	links: AboutLink[]
	t: ReturnType<typeof useTranslation<'portal'>>['t']
}) {
	const [stage, setStage] = useState<'dark' | 'reveal'>('dark')
	const [lightsOff, setLightsOff] = useState(false)
	const [flickering, setFlickering] = useState(false)

	useEffect(() => {
		const t1 = setTimeout(() => setStage('reveal'), 100)
		return () => clearTimeout(t1)
	}, [])

	function toggleLights() {
		if (flickering) return
		const turningOff = !lightsOff
		if (turningOff) {
			setLightsOff(true)
		} else {
			// Turning on — random flicker like a lamp warming up
			setFlickering(true)
			const count = 2 + Math.floor(Math.random() * 2) // 2-3 flickers
			let delay = 0
			for (let i = 0; i < count; i++) {
				const gap = 30 + Math.floor(Math.random() * 120)
				delay += gap
				const on = i % 2 === 0
				setTimeout(() => setLightsOff(!on), delay)
			}
			setTimeout(
				() => {
					setLightsOff(false)
					setFlickering(false)
				},
				delay + 40 + Math.floor(Math.random() * 80),
			)
		}
	}

	return (
		<>
			{/* Dust particles — fade with lights */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: stage === 'reveal' && !lightsOff ? 1 : 0 }}
				transition={{
					duration: lightsOff ? 0.3 : 9,
					delay: lightsOff ? 0 : 0.5,
					ease: 'easeOut',
				}}
				className="absolute inset-0 z-[1] pointer-events-none"
				style={{
					maskImage:
						'linear-gradient(180deg, white 0%, rgba(255,255,255,0.5) 40%, transparent 75%)',
					WebkitMaskImage:
						'linear-gradient(180deg, white 0%, rgba(255,255,255,0.5) 40%, transparent 75%)',
				}}
			>
				<FloatingParticles className="absolute inset-0" />
			</motion.div>

			{stage === 'reveal' && (
				<motion.div
					key="reveal"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.8, ease: 'easeOut' }}
					className="flex flex-col h-full w-full"
				>
					{/* Lamp — fades out when lights off */}
					<motion.div
						animate={{ opacity: lightsOff ? 0 : 1 }}
						transition={{ duration: 0.15, ease: 'easeOut' }}
						className="h-[34vh] shrink-0 lg:h-[40vh]"
					>
						<LampContainer className="h-full" />
					</motion.div>

					{/* Content */}
					<div className="flex-1 flex items-start justify-center px-6 max-md:px-4 -mt-8 lg:-mt-12">
						<motion.div
							animate={{ opacity: lightsOff ? 0.55 : 1 }}
							transition={{ duration: 0.2, ease: 'easeOut' }}
							className="w-full max-w-[340px] flex flex-col items-center text-center fade-reveal-down lg:max-w-[360px]"
						>
							{/* Logo — clickable light switch */}
							<button
								type="button"
								onClick={toggleLights}
								className="relative mb-4 h-32 w-32 cursor-pointer outline-none group sm:h-36 sm:w-36 lg:mb-6 lg:h-40 lg:w-40"
								aria-label="Toggle lights"
							>
								<motion.img
									src="/brand/LyonWhite.svg"
									alt="HyperQuote"
									className="w-full h-full object-contain"
									draggable={false}
									animate={{ opacity: lightsOff ? 0.25 : 1 }}
									transition={{ duration: 0.15, ease: 'easeOut' }}
									style={{ filter: 'brightness(0)' }}
								/>
							</button>

							<PortalTitleRow
								title="HyperQuote"
								align="center"
								fixed
								showSidebarButton={false}
							/>

							<p className="mt-1 text-[13px] font-mono text-[var(--p-text-muted)] tracking-wide">
								{t('about.version', 'Version')} {APP_VERSION}
							</p>

							{/* Links */}
							<div className="mt-5 w-full flex flex-col lg:mt-8">
								{links.map((link) => (
									<a
										key={link.key}
										href={link.href}
										target={link.external ? '_blank' : undefined}
										rel={link.external ? 'noopener noreferrer' : undefined}
										className="flex items-center justify-between py-2 text-[13px] text-[var(--p-text-muted)] hover:text-[var(--p-text-secondary)] transition-colors lg:py-2.5"
									>
										<span>{t(link.key, link.fallback)}</span>
										{link.external && (
											<ExternalLink
												size={13}
												strokeWidth={1.5}
												className="text-[var(--p-text-muted)]"
											/>
										)}
									</a>
								))}
							</div>

							{/* Copyright */}
							<p className="mt-5 text-[13px] text-[var(--p-text-muted)] lg:mt-8">
								© {new Date().getFullYear()} HyperQuote
							</p>
						</motion.div>
					</div>
				</motion.div>
			)}
		</>
	)
}

function LightAboutContent({
	links,
	t,
}: {
	links: AboutLink[]
	t: ReturnType<typeof useTranslation<'portal'>>['t']
}) {
	return (
		<div className="flex h-full w-full items-center justify-center px-6 max-md:px-4">
			<div className="w-full max-w-[340px] flex flex-col items-center text-center lg:max-w-[360px]">
				<img
					src="/brand/LyonBlack.svg"
					alt="HyperQuote"
					width={160}
					height={160}
					className="mb-4 h-32 w-32 object-contain sm:h-36 sm:w-36 lg:mb-6 lg:h-40 lg:w-40"
					draggable={false}
				/>

				<h1 className="text-xl font-semibold tracking-normal text-black lg:text-2xl">
					HyperQuote
				</h1>

				<p className="mt-1 text-[13px] font-mono tracking-wide text-black/60">
					{t('about.version', 'Version')} {APP_VERSION}
				</p>

				<div className="mt-5 w-full flex flex-col lg:mt-8">
					{links.map((link) => (
						<a
							key={link.key}
							href={link.href}
							target={link.external ? '_blank' : undefined}
							rel={link.external ? 'noopener noreferrer' : undefined}
							className="flex items-center justify-between py-2 text-[13px] text-black/60 transition-colors hover:text-black lg:py-2.5"
						>
							<span>{t(link.key, link.fallback)}</span>
							{link.external && (
								<ExternalLink
									size={13}
									strokeWidth={1.5}
									className="text-black/50"
								/>
							)}
						</a>
					))}
				</div>

				<p className="mt-5 text-[13px] text-black/60 lg:mt-8">
					© {new Date().getFullYear()} HyperQuote
				</p>
			</div>
		</div>
	)
}

interface AboutLink {
	key: string
	fallback: string
	href: string
	external: boolean
}
