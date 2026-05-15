import { LampContainer } from '@hyperquote/ui'
import { createFileRoute } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FloatingParticles } from '../../components/login/FloatingParticles'
import { PortalTitleRow } from '../../components/shell/PortalTitleRow'

export const Route = createFileRoute('/_portal/about')({
	component: AboutPage,
})

const APP_VERSION = '1.0.0'

function AboutPage() {
	const { t } = useTranslation('portal')
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
						className="h-[40vh] shrink-0"
					>
						<LampContainer className="h-full" />
					</motion.div>

					{/* Content */}
					<div className="flex-1 flex items-start justify-center px-6 max-md:px-4 -mt-12">
						<motion.div
							animate={{ opacity: lightsOff ? 0.55 : 1 }}
							transition={{ duration: 0.2, ease: 'easeOut' }}
							className="w-full max-w-[360px] flex flex-col items-center text-center fade-reveal-down"
						>
							{/* Logo — clickable light switch */}
							<button
								type="button"
								onClick={toggleLights}
								className="relative w-40 h-40 mb-6 cursor-pointer outline-none group"
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

							<PortalTitleRow title="HyperQuote" align="center" fixed />

							<p className="mt-1 text-[13px] font-mono text-[var(--p-text-muted)] tracking-wide">
								{t('about.version', 'Version')} {APP_VERSION}
							</p>

							{/* Links */}
							<div className="mt-8 w-full flex flex-col">
								{links.map((link) => (
									<a
										key={link.key}
										href={link.href}
										target={link.external ? '_blank' : undefined}
										rel={link.external ? 'noopener noreferrer' : undefined}
										className="flex items-center justify-between py-2.5 text-[13px] text-[var(--p-text-muted)] hover:text-[var(--p-text-secondary)] transition-colors"
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
							<p className="mt-8 text-[13px] text-[var(--p-text-muted)]">
								© {new Date().getFullYear()} HyperQuote
							</p>
						</motion.div>
					</div>
				</motion.div>
			)}
		</div>
	)
}
