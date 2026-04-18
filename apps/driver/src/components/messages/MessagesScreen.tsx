/**
 * Messages screen. Three threads (Warehouse, Drivers, Dispatch) selected
 * via segmented control at the top. Bubble-style modern chat below,
 * composer pinned at the bottom.
 */

import { useQuery } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatRelativeMinutes } from '../../lib/format'
import { getMessages, getThreads } from '../../lib/mock'
import type { Message } from '../../lib/types'
import { useAuth } from '../../stores/auth'
import { useApp } from '../../stores/cockpit'

export function MessagesScreen() {
	const { t } = useTranslation()
	const lang = useApp((s) => s.lang)
	const threadId = useApp((s) => s.threadId)
	const setThreadId = useApp((s) => s.setThreadId)
	const session = useAuth((s) => s.session)

	const { data: threads } = useQuery({
		queryKey: ['threads'],
		queryFn: getThreads,
	})
	const { data: initial } = useQuery({
		queryKey: ['messages', threadId],
		queryFn: () => getMessages(threadId),
	})

	const [drafts, setDrafts] = useState<Record<string, string>>({})
	const [extras, setExtras] = useState<Record<string, Message[]>>({})
	const feedRef = useRef<HTMLOListElement>(null)

	const all = useMemo(() => {
		const seed = initial ?? []
		return [...seed, ...(extras[threadId] ?? [])]
	}, [initial, extras, threadId])

	useEffect(() => {
		const el = feedRef.current
		if (!el || all.length === 0) return
		el.scrollTop = el.scrollHeight
	}, [all.length])

	const send = () => {
		const body = drafts[threadId]?.trim()
		if (!body || !session) return
		const msg: Message = {
			id: `m-${Date.now()}`,
			threadId,
			authorId: session.driverId,
			authorName: 'You',
			body,
			minutesAgo: 0,
			self: true,
		}
		setExtras((prev) => ({
			...prev,
			[threadId]: [...(prev[threadId] ?? []), msg],
		}))
		setDrafts((prev) => ({ ...prev, [threadId]: '' }))
	}

	return (
		<div className="flex h-full flex-col overflow-hidden bg-[var(--bg)]">
			{/* Segmented thread switcher */}
			<div className="shrink-0 border-b border-[var(--line)] bg-[var(--surface)] p-3">
				<div className="grid grid-cols-3 gap-1 rounded-[var(--r-md)] bg-[var(--surface-2)] p-1">
					{(threads ?? []).map((thread) => {
						const active = thread.id === threadId
						return (
							<button
								key={thread.id}
								type="button"
								onClick={() => setThreadId(thread.id)}
								className="relative flex flex-col items-start gap-0.5 rounded-[var(--r-sm)] px-3 py-2 text-start transition-colors"
								style={{
									background: active ? 'var(--surface)' : 'transparent',
									boxShadow: active ? '0 1px 2px rgba(15,17,22,0.06)' : 'none',
								}}
							>
								<span className="flex w-full items-center justify-between gap-2">
									<span
										className="text-[13px] font-medium"
										style={{ color: active ? 'var(--ink)' : 'var(--ink-2)' }}
									>
										{lang === 'ar' ? thread.nameAr : thread.name}
									</span>
									{thread.unread > 0 ? (
										<span
											className="grid h-4 w-4 place-items-center rounded-full text-[9.5px] font-semibold"
											style={{
												background: 'var(--accent)',
												color: 'var(--accent-fg)',
											}}
										>
											{thread.unread}
										</span>
									) : null}
								</span>
								<span className="flex items-center gap-1.5 text-[11.5px] text-[var(--ink-3)]">
									{thread.online ? (
										<span
											className="inline-block h-1.5 w-1.5 rounded-full"
											style={{ background: 'var(--good)' }}
										/>
									) : null}
									<span className="truncate">
										{lang === 'ar' ? thread.subtitleAr : thread.subtitle}
									</span>
								</span>
							</button>
						)
					})}
				</div>
			</div>

			{/* Feed */}
			<ol ref={feedRef} className="flex-1 overflow-y-auto py-3">
				{all.map((msg, i) => {
					const prev = all[i - 1]
					const sameAuthor = prev?.authorId === msg.authorId && !msg.system
					const showHeader = !sameAuthor && !msg.self && !msg.system
					const initials = msg.authorName.slice(0, 1)
					return (
						<li
							key={msg.id}
							className="msg-row"
							data-self={msg.self || undefined}
							data-system={msg.system || undefined}
						>
							{!msg.self && !msg.system ? (
								sameAuthor ? (
									<span aria-hidden />
								) : (
									<span className="msg-avatar">{initials}</span>
								)
							) : null}
							<div className="flex flex-col">
								{showHeader ? (
									<div className="mb-1 ms-1 text-[11.5px] font-medium text-[var(--ink-2)]">
										{msg.authorName}
									</div>
								) : null}
								<div className="msg-bubble">
									{lang === 'ar' && msg.bodyAr ? msg.bodyAr : msg.body}
								</div>
								<div className="msg-meta">
									{formatRelativeMinutes(msg.minutesAgo, lang)}
								</div>
							</div>
						</li>
					)
				})}
				{all.length === 0 ? (
					<li className="grid place-items-center px-6 py-12 text-center text-[var(--ink-3)]">
						<span className="text-[14px]">{t('messages.empty')}</span>
					</li>
				) : null}
			</ol>

			{/* Composer */}
			<form
				className="composer"
				onSubmit={(e) => {
					e.preventDefault()
					send()
				}}
			>
				<input
					type="text"
					className="composer__input"
					placeholder={t('messages.composerPlaceholder')}
					value={drafts[threadId] ?? ''}
					onChange={(e) =>
						setDrafts((prev) => ({ ...prev, [threadId]: e.target.value }))
					}
				/>
				<button
					type="submit"
					className="btn btn--primary btn--icon"
					aria-label={t('messages.send')}
					disabled={!drafts[threadId]?.trim().length}
				>
					<Send size={16} strokeWidth={1.8} />
				</button>
			</form>
		</div>
	)
}
