import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { useLoginModal } from '../../hooks/useLoginModal'
import { useChatWidget } from '../../hooks/useChatWidget'
import { ContactForm } from '../support/ContactForm'
import { ContactInfo } from '../support/ContactInfo'
import { DOC_CATEGORIES, WIZARDS } from '../../content/registry'
import { DocsSearch as RealDocsSearch } from '../docs/DocsSearch'
import { useSharedChat } from '../../hooks/ChatProvider'
import { ArrowUp } from 'lucide-react'

const MAPS_URL = 'https://maps.google.com/?q=Arkan+Plaza+Sheikh+Zayed+Egypt'

type HeroMode = 'hero' | 'contact' | 'docs' | 'chat'

const transition = { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }

export function HeroSection() {
	const { t } = useTranslation('website')
	const { open: openLoginModal } = useLoginModal()
	const [stage, setStage] = useState(0)
	const [mode, setMode] = useState<HeroMode>('hero')
	const [chatInitialMessage, setChatInitialMessage] = useState('')

	const closeBubble = useChatWidget((s) => s.close)

	function openChat(initialMessage = '') {
		setChatInitialMessage(initialMessage)
		setMode('chat')
		closeBubble()
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	useEffect(() => {
		const t1 = setTimeout(() => setStage(1), 500)
		const t2 = setTimeout(() => setStage(2), 650)
		const t3 = setTimeout(() => setStage(3), 1200)
		return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
	}, [])

	const isExpanded = mode !== 'hero'

	return (
		<>
			{/* Intro overlay */}
			<div
				className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-base)]"
				style={{
					opacity: stage >= 2 ? 0 : 1,
					transition: 'opacity 0.6s ease-out',
					pointerEvents: stage >= 2 ? 'none' : 'auto',
				}}
			>
				<div className="overflow-hidden">
					<span
						className="block text-[56px] max-md:text-[40px] font-extrabold tracking-[-0.03em] text-[var(--color-text)]"
						style={{
							transform: stage >= 1 ? 'translateY(-120%)' : 'translateY(0)',
							transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
						}}
					>
						HyperQuote
					</span>
				</div>
			</div>

			{/* Hero section — 70vh default, 100vh when a mode is active */}
			<section
				className="relative flex flex-col bg-[var(--color-base)] overflow-hidden"
				style={{
					height: stage < 2 ? '100vh' : isExpanded ? '100vh' : '70vh',
					transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
				}}
			>
				{/* Rings */}
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
					<div className="relative w-[800px] h-[800px]">
						<div className="absolute inset-0 rounded-full border border-[var(--color-text)] opacity-[0.03]" style={{ animation: 'hero-ring 12s linear infinite' }} />
						<div className="absolute inset-0 rounded-full border border-[var(--color-text)] opacity-[0.03]" style={{ animation: 'hero-ring 12s linear infinite 4s' }} />
						<div className="absolute inset-0 rounded-full border border-[var(--color-text)] opacity-[0.03]" style={{ animation: 'hero-ring 12s linear infinite 8s' }} />
					</div>
				</div>

				{/* Content area */}
				<div className="flex-1 flex items-center justify-center relative">
					<AnimatePresence mode="wait">
						{mode === 'hero' && (
							<motion.div
								key="hero"
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -30 }}
								transition={transition}
								className="text-center"
							>
								<h1 className="text-[56px] lg:text-[80px] leading-[1.02] font-extrabold tracking-[-0.03em]">
									<span className="block overflow-hidden">
										<span
											className="block text-[var(--color-text)]"
											style={{
												transform: stage >= 2 ? 'translateY(0)' : 'translateY(110%)',
												transition: 'transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)',
											}}
										>
											{t('hero.headlinePart1')}
										</span>
									</span>
									<span className="block overflow-hidden">
										<span
											className="block bg-clip-text text-transparent"
											style={{
												backgroundImage: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #1D4ED8 100%)',
												transform: stage >= 2 ? 'translateY(0)' : 'translateY(110%)',
												transition: 'transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1) 0.15s',
											}}
										>
											{t('hero.headlinePart2')}
										</span>
									</span>
								</h1>

								{/* Mode buttons */}
								<div
									className="mt-8 flex items-center justify-center gap-1"
									style={{
										opacity: stage >= 3 ? 1 : 0,
										transform: stage >= 3 ? 'translateY(0)' : 'translateY(12px)',
										transition: 'opacity 0.5s ease-out 0.1s, transform 0.5s ease-out 0.1s',
									}}
								>
									<button type="button" onClick={() => { setMode('contact'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--color-surface)]">
										{t('support.sectionContact')}
									</button>
									<span className="text-[var(--color-border)] text-[10px]">|</span>
									<button type="button" onClick={() => { setMode('docs'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--color-surface)]">
										{t('nav.docs')}
									</button>
									<span className="text-[var(--color-border)] text-[10px]">|</span>
									<button type="button" onClick={() => openChat()} className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--color-subtle)]">
										Ask Lyon
									</button>
								</div>
							</motion.div>
						)}

						{mode === 'contact' && (
							<motion.div
								key="contact"
								initial={{ opacity: 0, y: 40 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -30 }}
								transition={transition}
								className="w-full h-full flex flex-col"
							>
								<div className="flex-1 overflow-y-auto">
									<div className="max-w-[1200px] mx-auto px-6 lg:px-12 pt-24 pb-12">
										{/* Header */}
										<div className="mb-12">
											<p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)] mb-2">{t('support.sectionContact')}</p>
											<h2 className="text-[32px] lg:text-[44px] font-extrabold text-[var(--color-text)] tracking-[-0.02em] leading-[1.05]">
												{t('support.formHeading')}
											</h2>
										</div>

										{/* Two-column: form + info */}
										<div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-16 lg:gap-24">
											<ContactForm />
											<ContactInfo />
										</div>
									</div>
								</div>
							</motion.div>
						)}

						{mode === 'docs' && (
							<motion.div
								key="docs"
								initial={{ opacity: 0, y: 40 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -30 }}
								transition={transition}
								className="w-full h-full flex flex-col items-center justify-center px-6"
							>
								<div className="w-full max-w-[600px] text-center">
									<h2 className="text-[48px] lg:text-[64px] font-extrabold tracking-[-0.03em] text-[var(--color-text)] leading-[1]">
										{t('docs.heading', { defaultValue: 'Documentation' })}
									</h2>
									<p className="mt-5 text-[16px] text-[var(--color-text-muted)] leading-relaxed mx-auto max-w-[440px]">
										{t('docs.subheading', { defaultValue: 'Everything you need to source materials, manage quotes, and track deliveries on HyperQuote.' })}
									</p>
									<p className="mt-2 font-mono text-[12px] text-[var(--color-text-subtle)] tracking-wide">
										{DOC_CATEGORIES.reduce((n, c) => n + c.articles.length, 0)} articles · {WIZARDS.length} guides
									</p>
									<div className="mt-10 flex justify-center">
										<div className="w-full max-w-[480px]">
											<RealDocsSearch onAskLyon={(q) => openChat(q)} />
										</div>
									</div>
								</div>
							</motion.div>
						)}

						{mode === 'chat' && (
							<motion.div
								key="chat"
								initial={{ opacity: 0, y: 40 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -30 }}
								transition={transition}
								className="w-full h-full flex flex-col"
							>
								<LyonChat initialMessage={chatInitialMessage} />
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				{/* Bottom bar */}
				<div
					className="w-full border-t border-[var(--color-border)] shrink-0"
					style={{
						opacity: stage >= 3 ? 1 : 0,
						transform: stage >= 3 ? 'translateY(0)' : 'translateY(8px)',
						transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
					}}
				>
					<div className="max-w-7xl mx-auto px-6 lg:px-12 py-5">
						<AnimatePresence mode="wait">
							{isExpanded ? (
								<motion.div
									key="expanded-bar"
									initial={{ opacity: 0, y: 6 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -6 }}
									transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
									className="flex items-center justify-between max-sm:flex-col max-sm:gap-4"
								>
									<button
										type="button"
										onClick={() => setMode('hero')}
										className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
									>
										← Back
									</button>
									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={() => { setMode('contact'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
											className={`text-[13px] px-3 py-1 rounded-lg transition-colors ${mode === 'contact' ? 'text-[var(--color-text)] font-semibold bg-[var(--color-surface)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
										>
											{t('support.sectionContact')}
										</button>
										<button
											type="button"
											onClick={() => { setMode('docs'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
											className={`text-[13px] px-3 py-1 rounded-lg transition-colors ${mode === 'docs' ? 'text-[var(--color-text)] font-semibold bg-[var(--color-surface)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
										>
											{t('nav.docs')}
										</button>
										<button
											type="button"
											onClick={() => openChat()}
											className={`text-[13px] px-3 py-1 rounded-lg transition-colors ${mode === 'chat' ? 'text-[var(--color-primary)] font-semibold bg-[var(--color-subtle)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'}`}
										>
											Ask Lyon
										</button>
									</div>
								</motion.div>
							) : (
								<motion.div
									key="default-bar"
									initial={{ opacity: 0, y: 6 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -6 }}
									transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
									className="flex items-center justify-between max-sm:flex-col max-sm:gap-4"
								>
									<div className="flex items-center gap-4">
										<Link to="/support" className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
											FAQ
										</Link>
										<AddressCycle />
									</div>
									<Link to="/market" className="text-[13px] font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors">
										{t('cta.browseMarket')}
									</Link>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</div>
			</section>
		</>
	)
}

/* ── Lyon AI Chat — shares messages with ChatWidget via useAIChat ── */
function LyonChat({ initialMessage = '' }: { initialMessage?: string }) {
	const { t } = useTranslation('website')
	const { messages, sendMessage, isLoading } = useSharedChat()
	const [input, setInput] = useState('')
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const messagesRef = useRef<HTMLDivElement>(null)
	const sentInitial = useRef(false)

	useEffect(() => { inputRef.current?.focus() }, [])

	useEffect(() => {
		if (!initialMessage || sentInitial.current) return
		sentInitial.current = true
		sendMessage(initialMessage)
	}, [initialMessage, sendMessage])

	useEffect(() => {
		if (!messagesRef.current) return
		messagesRef.current.scrollTop = messagesRef.current.scrollHeight
	}, [messages.length, isLoading])

	async function send() {
		const trimmed = input.trim()
		if (!trimmed || isLoading) return
		setInput('')
		if (inputRef.current) inputRef.current.style.height = 'auto'
		await sendMessage(trimmed)
	}

	function handleInput() {
		const el = inputRef.current
		if (!el) return
		el.style.height = 'auto'
		el.style.height = `${Math.min(el.scrollHeight, 160)}px`
	}

	const isEmpty = messages.length === 0

	return (
		<div className="flex-1 flex flex-col w-full">
			<div className="pt-20 shrink-0" />

			<div ref={messagesRef} className="flex-1 overflow-y-auto">
				{isEmpty && !isLoading ? (
					<div className="h-full flex flex-col items-center justify-center gap-3">
						<h2 className="text-[28px] lg:text-[40px] font-extrabold text-[var(--color-text)] tracking-[-0.03em]">
							Ask Lyon
						</h2>
						<p className="text-[15px] text-[var(--color-text-subtle)] max-w-[360px] text-center">
							Materials, pricing, delivery, orders — ask anything about HyperQuote.
						</p>
					</div>
				) : (
					<div className="max-w-[800px] w-full mx-auto px-6 py-6 flex flex-col gap-8">
						{messages.map((msg) => (
							<div key={msg.id}>
								{msg.role === 'user' ? (
									<div className="flex justify-end">
										<div className="bg-[var(--color-surface)] rounded-2xl rounded-br-sm px-5 py-3 max-w-[75%]">
											<p className="text-[15px] leading-[1.6] text-[var(--color-text)]">{msg.content}</p>
										</div>
									</div>
								) : (
									<div className="pe-12">
										<p className="text-[15px] leading-[1.8] text-[var(--color-text)]">{msg.content}</p>
									</div>
								)}
							</div>
						))}
						{isLoading && (
							<div className="pe-12">
								<div className="flex gap-1.5">
									<span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-subtle)] animate-pulse" />
									<span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-subtle)] animate-pulse [animation-delay:0.15s]" />
									<span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-subtle)] animate-pulse [animation-delay:0.3s]" />
								</div>
							</div>
						)}
					</div>
				)}
			</div>

			<div className="shrink-0 px-6 pb-6 pt-3">
				<div className="max-w-[800px] w-full mx-auto">
					<div className="flex items-end gap-3 bg-[var(--color-surface)] rounded-2xl px-4 py-3">
						<textarea
							ref={inputRef}
							value={input}
							onChange={(e) => { setInput(e.target.value); handleInput() }}
							onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
							placeholder={t('chat.inputPlaceholder')}
							rows={1}
							className="flex-1 min-h-[24px] max-h-[160px] bg-transparent text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none resize-none"
						/>
						<button
							type="button"
							onClick={send}
							disabled={!input.trim() || isLoading}
							className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all bg-[var(--color-text)] text-[var(--color-base)] disabled:opacity-10"
						>
							<ArrowUp size={16} />
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

/* ── Address Cycle ── */
function AddressCycle() {
	const { t } = useTranslation('website')
	const [index, setIndex] = useState(0)
	const [prevIndex, setPrevIndex] = useState(-1)
	const [ready, setReady] = useState(false)
	const items = [t('hero.address'), t('hero.visitUs', { defaultValue: 'Visit us ↗' })]

	// Delay cycle start so it doesn't animate during the bar's fade-in
	useEffect(() => {
		const delay = setTimeout(() => setReady(true), 600)
		return () => clearTimeout(delay)
	}, [])

	useEffect(() => {
		if (!ready) return
		const id = setInterval(() => {
			setIndex((p) => { setPrevIndex(p); return (p + 1) % items.length })
		}, 3000)
		return () => clearInterval(id)
	}, [items.length, ready])

	useEffect(() => {
		if (prevIndex === -1) return
		const timeout = setTimeout(() => setPrevIndex(-1), 500)
		return () => clearTimeout(timeout)
	}, [prevIndex])

	return (
		<a
			href={MAPS_URL}
			target="_blank"
			rel="noopener noreferrer"
			className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors relative h-5 overflow-hidden inline-flex items-center"
		>
			{items.map((text, i) => {
				const isActive = i === index
				const isLeaving = i === prevIndex
				let y = '100%'
				let t2 = 'none'
				if (isActive) { y = '0%'; t2 = 'transform 0.5s ease-in-out' }
				else if (isLeaving) { y = '-100%'; t2 = 'transform 0.5s ease-in-out' }
				return (
					<span key={text} className={`block ${i === 0 ? '' : 'absolute inset-x-0'}`} style={{ transform: `translateY(${y})`, transition: t2 }}>
						{text}
					</span>
				)
			})}
		</a>
	)
}
