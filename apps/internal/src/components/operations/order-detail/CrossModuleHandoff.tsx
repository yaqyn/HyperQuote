import { useState } from 'react'
import { Button } from 'react-aria-components'
import { Bell, ChevronDown, ChevronUp, Check } from 'lucide-react'
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
  if (hours < 1) return 'Less than 1 hour'
  if (hours === 1) return '1 hour'
  return `${hours} hours`
}

/**
 * Horizontal step indicator showing which department currently owns the order.
 * Expandable section with 6 handoff stages, SLA breach warning, and Nudge button.
 */
export function CrossModuleHandoff({ orderId, handoff }: CrossModuleHandoffProps) {
  const [expanded, setExpanded] = useState(false)

  const nudgeMutation = useMutation({
    mutationFn: () =>
      nudgeHandoff({
        data: { orderId, targetStage: handoff.currentStage },
      }),
    onSuccess: (result) => {
      // Toast: "Notification sent to [name]"
      // Will use toast store when integrated
      console.info(`Notification sent to ${result.notifiedUser}`)
    },
  })

  const isBreached = handoff.timeInStage > handoff.slaMs
  const slaHours = Math.floor(handoff.slaMs / (60 * 60 * 1000))

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      {/* Toggle header */}
      <button
        type="button"
        className="flex w-full items-center justify-between"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-sm font-medium">Handoff Status</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-black/40 dark:text-white/40" />
        ) : (
          <ChevronDown className="h-4 w-4 text-black/40 dark:text-white/40" />
        )}
      </button>

      {expanded && (
        <div className="mt-4">
          {/* SLA breach warning */}
          {isBreached && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2">
              <p className="text-sm text-red-700 dark:text-red-300">
                Waiting on{' '}
                <span className="font-medium capitalize">{handoff.currentStage}</span> for{' '}
                <span className="font-geist-mono">{formatDuration(handoff.timeInStage)}</span>{' '}
                (SLA: <span className="font-geist-mono">{slaHours} hours</span>)
              </p>
            </div>
          )}

          {/* Horizontal pipeline */}
          <div className="flex items-center gap-0">
            {HANDOFF_STAGES.map((stageInfo, index) => {
              const state = getStageState(stageInfo.stage, handoff.currentStage, handoff.completedStages)

              return (
                <div key={stageInfo.stage} className="flex items-center flex-1 last:flex-none">
                  {/* Stage circle + label */}
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full ${
                        state === 'completed'
                          ? 'bg-green-500 text-white'
                          : state === 'current'
                            ? 'bg-[#2563EB] text-white'
                            : 'border-2 border-black/20 dark:border-white/20'
                      }`}
                    >
                      {state === 'completed' && <Check className="h-4 w-4" />}
                    </div>
                    <span
                      className={`text-[13px] whitespace-nowrap ${
                        state === 'current'
                          ? 'font-semibold'
                          : state === 'completed'
                            ? 'text-black/70 dark:text-white/70'
                            : 'text-black/40 dark:text-white/40'
                      }`}
                    >
                      {stageInfo.label}
                    </span>
                  </div>

                  {/* Connecting line */}
                  {index < HANDOFF_STAGES.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-1 ${
                        state === 'completed'
                          ? 'bg-green-500'
                          : state === 'current'
                            ? 'bg-[#2563EB]'
                            : 'bg-black/10 dark:bg-white/10'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Current owner + Nudge */}
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                Current owner: {handoff.currentOwner}
              </p>
              <p className="font-geist-mono text-[13px] text-black/50 dark:text-white/50">
                {formatDuration(handoff.timeInStage)} in {handoff.currentStage}
              </p>
            </div>

            <Button
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 text-sm font-medium
                outline-none data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
                dark:data-[hovered]:bg-white/10"
              onPress={() => nudgeMutation.mutate()}
              isDisabled={nudgeMutation.isPending}
            >
              <Bell className="h-4 w-4" />
              Nudge
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
