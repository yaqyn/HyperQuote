import { Command } from 'lucide-react'
import type { CommandPaletteData } from '../../lib/chat-types'
import { ActionButton } from './ActionButton'

interface CommandPaletteProps {
	data: CommandPaletteData
}

export function CommandPalette({ data }: CommandPaletteProps) {
	return (
		<section className="mt-3 w-full max-w-[660px] border border-[var(--p-rule)] bg-[var(--p-surface-subtle)] px-3 py-3">
			<div className="flex items-start gap-3 border-b border-[var(--p-rule)] pb-3">
				<span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--p-border)] bg-[var(--p-card)] text-[var(--p-text)]">
					<Command size={15} strokeWidth={1.8} />
				</span>
				<div className="min-w-0">
					<h3 className="text-[14px] font-semibold text-[var(--p-text)]">
						{data.title}
					</h3>
					<p className="mt-1 text-[12px] leading-5 text-[var(--p-text-muted)]">
						{data.description}
					</p>
				</div>
			</div>

			<div className="mt-3 grid gap-3">
				{data.groups.map((group) => (
					<div key={group.title} className="min-w-0">
						<p className="voice-mono mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--p-text-faint)]">
							{group.title}
						</p>
						<div className="grid gap-1.5">
							{group.commands.map((command) => (
								<div
									key={command.command}
									className="grid min-w-0 grid-cols-1 gap-2 border border-[var(--p-rule)] bg-[var(--p-card)] px-2.5 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
								>
									<div className="min-w-0">
										<div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
											<span className="voice-mono break-all text-[12px] font-semibold text-[var(--p-text)]">
												{command.command}
											</span>
											<span className="text-[12px] font-semibold text-[var(--p-text)]">
												{command.title}
											</span>
											<span className="voice-mono text-[9px] uppercase tracking-[0.14em] text-[var(--p-text-faint)]">
												{command.scope}
											</span>
										</div>
										<p className="mt-1 text-[12px] leading-4 text-[var(--p-text-muted)]">
											{command.description}
										</p>
									</div>
									<ActionButton
										data={{
											command: command.command,
											icon:
												command.inputMode === 'prefill' ? 'draft' : 'command',
											label:
												command.inputMode === 'prefill' ? 'Prepare' : 'Run',
											labelAr:
												command.inputMode === 'prefill' ? 'جهز' : 'تشغيل',
										}}
									/>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</section>
	)
}
