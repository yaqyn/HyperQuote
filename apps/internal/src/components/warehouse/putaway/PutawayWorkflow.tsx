import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { getPutawayTasks } from '../../../lib/server/warehouse-putaway'
import { PutawayTask } from './PutawayTask'
import type { PutawayTask as PutawayTaskType } from '../../../types/warehouse'

/**
 * "The Shelf" — Putaway workflow.
 * Airport departure board meets industrial control panel.
 * Each step fills the screen. Minimal chrome. Data IS the design.
 */
export function PutawayWorkflow() {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['warehouse', 'putaway-tasks'],
    queryFn: () => getPutawayTasks({ data: {} }),
    staleTime: 30_000,
  })

  const tasks = data?.tasks ?? []
  const activeTask = tasks.find((t) => t.id === activeTaskId)
  const activeIndex = tasks.findIndex((t) => t.id === activeTaskId)
  const nextTask =
    activeIndex >= 0 && activeIndex < tasks.length - 1
      ? tasks[activeIndex + 1]
      : null

  const completedCount = activeIndex >= 0 ? activeIndex : 0
  const progressPercent = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0

  const handleTaskComplete = () => {
    if (nextTask) {
      setActiveTaskId(nextTask.id)
    } else {
      setActiveTaskId(null)
    }
  }

  // ─── Single Task View (fills the screen) ────────────────
  if (activeTask) {
    return (
      <div className="flex min-h-[calc(100dvh-6rem)] flex-col">
        {/* Compact header bar */}
        <div className="flex items-center gap-4 border-b border-[var(--color-border)] pb-4 mb-6">
          <button
            type="button"
            onClick={() => setActiveTaskId(null)}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] active:scale-95 transition-all"
            aria-label="Back to task list"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Progress strip */}
          <div className="flex-1">
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-semibold text-[var(--color-text-primary)]">
                {activeTask.taskNumber}
              </span>
              <span className="text-xs text-[var(--color-text-secondary)]">
                of
              </span>
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-medium text-[var(--color-text-secondary)]">
                {activeTask.totalTasks}
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-[var(--color-border)]">
              <div
                className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
                style={{ width: `${(activeTask.taskNumber / activeTask.totalTasks) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTask.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 20,
            }}
            className="flex-1"
          >
            <PutawayTask task={activeTask} onComplete={handleTaskComplete} />
          </motion.div>
        </AnimatePresence>

        {/* Next task preview — muted, glanceable */}
        {nextTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 border-t border-[var(--color-border)] pt-4"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)] mb-2">
              Up Next
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">
                {nextTask.productName}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm text-[var(--color-text-secondary)]">
                  {nextTask.quantity}
                </span>
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-semibold text-[#2563EB]">
                  {nextTask.toLocation}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    )
  }

  // ─── Task List (departure board) ────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            Putaway
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Directed shelf placement
          </p>
        </div>
        {tasks.length > 0 && (
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold text-[var(--color-text-primary)]">
            {tasks.length}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="h-1 w-full rounded-full bg-[var(--color-border)]">
          <div
            className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[#2563EB]" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-base font-semibold text-[var(--color-text-primary)]">
            All clear
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            No putaway tasks pending
          </p>
        </div>
      )}

      {/* Task rows — departure board style */}
      <div className="flex flex-col">
        {tasks.map((task, i) => (
          <TaskRow
            key={task.id}
            task={task}
            index={i}
            onSelect={() => setActiveTaskId(task.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Task Row (departure board entry) ─────────────────────

function TaskRow({
  task,
  index,
  onSelect,
}: {
  task: PutawayTaskType
  index: number
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex items-center gap-4 border-b border-[var(--color-border)] px-2 py-4 text-start transition-colors hover:bg-black/[0.02] active:bg-black/[0.04] min-h-[72px]"
    >
      {/* Row number */}
      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-secondary)] w-5 shrink-0">
        {index + 1}
      </span>

      {/* Product + lot */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
          {task.productName}
        </p>
        <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-secondary)]">
          {task.lotNumber}
        </p>
      </div>

      {/* Quantity — large mono */}
      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-bold text-[var(--color-text-primary)] shrink-0">
        {task.quantity}
      </span>

      {/* Destination — HUGE blue location code */}
      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-bold text-[#2563EB] shrink-0 min-w-[80px] text-end">
        {task.toLocation}
      </span>

      {/* Expiry flag */}
      {task.expiryDate && (
        <span className="shrink-0 rounded-md bg-amber-50 px-2 py-0.5 font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] font-semibold text-amber-700">
          {new Date(task.expiryDate).toLocaleDateString()}
        </span>
      )}

      {/* Arrow */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
        <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
