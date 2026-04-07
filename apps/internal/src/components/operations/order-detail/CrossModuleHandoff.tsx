import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useMutation } from '@tanstack/react-query'
import { HANDOFF_STAGES, type HandoffStatus, type HandoffStage } from '../../../types/operations'
import { nudgeHandoff } from '../../../lib/server/operations-actions'

interface CrossModuleHandoffProps {
  orderId: string
  handoff: HandoffStatus
}

function getStageState(
  stage: HandoffStage,
  currentStage: HandoffStage,
  completedStages: HandoffStage[],
): 'completed' | 'current' | 'future' {
  if (completedStages.includes(stage)) return 'completed'
  if (stage === currentStage) return 'current'
  return 'future'
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000))
  if (hours < 1) return '<1h'
  if (hours === 1) return '1h'
  return `${hours}h`
}

/**
 * Visual handoff indicator — shows which module owns the order now and what's next.
 * Arrow between module icons. Compact inline, expandable for detail.
 */
export function CrossModuleHandoff({ orderId, handoff }: CrossModuleHandoffProps) {
  const [expanded, setExpanded] = useState(false)

  const nudgeMutation = useMutation({
    mutationFn: () =>
      nudgeHandoff({
        data: { orderId, targetStage: handoff.currentStage },
      }),
    onSuccess: (result) => {
      console.info(`Notification sent to ${result.notifiedUser}`)
    },
  })

  const isBreached = handoff.timeInStage > handoff.slaMs
  const slaHours = Math.floor(handoff.slaMs / (60 * 60 * 1000))

  return (
    <div>
      {/* Compact header — always visible */}
      <button
        type="button"
        className="flex w-full items-center gap-3 outline-none group"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-[10px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
          Handoff
        </span>

        {/* Inline mini-dots for quick glance */}
        <div className="flex items-center gap-1">
          {HANDOFF_STAGES.map((stageInfo) => {
            const state = getStageState(stageInfo.stage, handoff.currentStage, handoff.completedStages)
            return (
              <div
                key={stageInfo.stage}
                className={`w-1.5 h-1.5 rounded-full ${
                  state === 'completed'
                    ? 'bg-[#2563EB]'
                    : state === 'current'
                      ? isBreached ? 'bg-red-500' : 'bg-[#2563EB] ring-2 ring-[#2563EB]/20'
                      : 'bg-black/10 dark:bg-white/10'
                }`}
              />
            )
          })}
        </div>

        <span className="text-[12px] text-black/40 dark:text-white/40">
          {handoff.currentOwner}
        </span>

        {isBreached && (
          <span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-red-600">
            {formatDuration(handoff.timeInStage)} (SLA: {slaHours}h)
          </span>
        )}

        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`text-black/25 dark:text-white/25 transition-transform ms-auto ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {expanded && (
        <div className="mt-4">
          {/* SLA breach warning */}
          {isBreached && (
            <div className="mb-4 rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-2">
              <p className="text-[13px] text-red-600 dark:text-red-400">
                Waiting on{' '}
                <span className="font-medium capitalize">{handoff.currentStage}</span> for{' '}
                <span className="font-[family-name:var(--font-geist-mono)]">{formatDuration(handoff.timeInStage)}</span>
                {' '}(SLA: <span className="font-[family-name:var(--font-geist-mono)]">{slaHours}h</span>)
              </p>
            </div>
          )}

          {/* Horizontal pipeline */}
          <div className="flex items-center">
            {HANDOFF_STAGES.map((stageInfo, index) => {
              const state = getStageState(stageInfo.stage, handoff.currentStage, handoff.completedStages)

              return (
                <div key={stageInfo.stage} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    {/* Dot */}
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        state === 'completed'
                          ? 'bg-[#2563EB]'
                          : state === 'current'
                            ? isBreached
                              ? 'bg-red-500 ring-4 ring-red-500/10'
                              : 'bg-[#2563EB] ring-4 ring-[#2563EB]/10'
                            : 'border-[1.5px] border-black/15 dark:border-white/15'
                      }`}
                    />
                    {/* Label */}
                    <span
                      className={`text-[10px] font-medium whitespace-nowrap ${
                        state === 'current'
                          ? isBreached ? 'text-red-600' : 'text-[#2563EB]'
                          : state === 'completed'
                            ? 'text-black/50 dark:text-white/50'
                            : 'text-black/25 dark:text-white/25'
                      }`}
                    >
                      {stageInfo.label}
                    </span>
                  </div>

                  {/* Connecting line */}
                  {index < HANDOFF_STAGES.length - 1 && (
                    <div
                      className={`h-px flex-1 mx-2 ${
                        state === 'completed'
                          ? 'bg-[#2563EB]'
                          : 'bg-black/8 dark:bg-white/8'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Current owner + Nudge */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-medium">{handoff.currentOwner}</span>
              <span className="font-[family-name:var(--font-geist-mono)] text-[12px] text-black/35 dark:text-white/35">
                {formatDuration(handoff.timeInStage)} in {handoff.currentStage}
              </span>
            </div>

            <Button
              className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-black/50 dark:text-white/50 outline-none
                data-[hovered]:bg-black/[0.04] dark:data-[hovered]:bg-white/[0.04]
                data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/40
                data-[disabled]:opacity-40"
              onPress={() => nudgeMutation.mutate()}
              isDisabled={nudgeMutation.isPending}
            >
              Nudge
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
