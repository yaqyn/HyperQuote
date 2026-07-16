import { Command, PenLine, Play, Sparkles, WifiOff } from 'lucide-react'
import type { CommandPaletteData } from '../../lib/chat-types'
import { ActionButton } from './ActionButton'

interface CommandPaletteProps {
	data: CommandPaletteData
}

export function CommandPalette({ data }: CommandPaletteProps) {
	return (
		<section className="mt-3 w-full max-w-[720px] overflow-hidden rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] shadow-[var(--p-card-shadow)]">
			<div className="relative overflow-hidden border-b border-[var(--p-rule)] px-4 py-4 sm:px-5 sm:py-5">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 opacity-70"
					style={{
						background:
							'radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--p-accent) 13%, transparent), transparent 48%)',
					}}
				/>
				<div className="relative flex items-start gap-3">
					<span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--p-accent)] text-[var(--p-accent-contrast)] shadow-sm">
						<Command size={17} strokeWidth={1.9} />
					</span>
					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap items-center gap-2">
							<h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--p-text)] sm:text-[16px]">
								{data.title}
							</h3>
							<span className="inline-flex items-center gap-1 rounded-full border border-[var(--p-border)] bg-[var(--p-bg)] px-2 py-1 voice-mono text-[9px] uppercase tracking-[0.12em] text-[var(--p-text-muted)]">
								<WifiOff size={10} strokeWidth={1.8} />
								AI-safe fallback
							</span>
						</div>
						<p className="mt-1.5 max-w-[620px] text-[12px] leading-5 text-[var(--p-text-muted)] sm:text-[13px]">
							{data.description}
						</p>
					</div>
				</div>
			</div>

			<div className="grid gap-3 bg-[var(--p-surface-subtle)] p-3 sm:p-4">
				{data.groups.map((group) => {
					if (group.title === 'Start here') {
						return (
							<div key={group.title} className="min-w-0 pb-1">
								<div className="mb-2.5 flex items-center gap-2">
									<Sparkles
										size={13}
										strokeWidth={1.8}
										className="text-[var(--p-accent)]"
									/>
									<p className="voice-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-text-faint)]">
										{group.title}
									</p>
									<span
										className="h-px flex-1 bg-[var(--p-rule)]"
										aria-hidden
									/>
								</div>
								<div className="grid gap-2 md:grid-cols-2">
									{group.commands.map((command) => (
										<CommandCard key={command.command} command={command} />
									))}
								</div>
							</div>
						)
					}
					return (
						<details
							key={group.title}
							className="group rounded-xl border border-[var(--p-rule)] bg-[var(--p-card)] open:border-[var(--p-border)]"
						>
							<summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-3 py-2 text-[var(--p-text)] marker:hidden">
								<span className="voice-mono text-[10px] uppercase tracking-[0.16em]">
									{group.title}
								</span>
								<span className="rounded-full bg-[var(--p-hover)] px-2 py-0.5 voice-mono text-[9px] text-[var(--p-text-muted)]">
									{group.commands.length}
								</span>
								<span className="ms-auto text-[15px] text-[var(--p-text-faint)] transition-transform group-open:rotate-45">
									+
								</span>
							</summary>
							<div className="grid gap-1.5 border-t border-[var(--p-rule)] p-2">
								{group.commands.map((command) => (
									<CommandCard key={command.command} command={command} />
								))}
							</div>
						</details>
					)
				})}
			</div>
		</section>
	)
}

function CommandCard({
	command,
}: {
	command: CommandPaletteData['groups'][number]['commands'][number]
}) {
	return (
		<div
			className={`grid min-w-0 grid-cols-1 gap-3 rounded-xl border bg-[var(--p-card)] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${
				command.featured
					? 'border-[color-mix(in_srgb,var(--p-accent)_34%,var(--p-border))] shadow-sm'
					: 'border-[var(--p-rule)]'
			}`}
		>
			<div className="min-w-0">
				<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
					<span className="voice-mono break-all rounded-md bg-[var(--p-hover)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--p-text)]">
						{command.command}
					</span>
					<span className="text-[12px] font-semibold text-[var(--p-text)]">
						{command.title}
					</span>
					<span className="inline-flex items-center gap-1 voice-mono text-[9px] uppercase tracking-[0.12em] text-[var(--p-text-faint)]">
						{command.inputMode === 'prefill' ? (
							<PenLine size={10} strokeWidth={1.8} />
						) : (
							<Play size={9} strokeWidth={2} />
						)}
						{command.inputMode === 'prefill' ? 'Guided' : 'Run now'}
					</span>
				</div>
				<p className="mt-1 text-[12px] leading-4 text-[var(--p-text-muted)]">
					{command.description}
				</p>
				{command.example ? (
					<p className="mt-2 truncate voice-mono text-[10px] text-[var(--p-text-faint)]">
						Example · {command.example}
					</p>
				) : null}
			</div>
			<ActionButton
				data={{
					command: command.command,
					icon: command.inputMode === 'prefill' ? 'draft' : 'command',
					label: command.inputMode === 'prefill' ? 'Tell Lyon' : 'Run',
					labelAr: command.inputMode === 'prefill' ? 'اخبر ليون' : 'تشغيل',
				}}
			/>
		</div>
	)
}
