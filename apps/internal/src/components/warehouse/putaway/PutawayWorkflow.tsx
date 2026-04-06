import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPutawayTasks } from '../../../lib/server/warehouse-putaway'
import { StepIndicator } from '../shared/StepIndicator'
import { PutawayTask } from './PutawayTask'
import type { PutawayTask as PutawayTaskType } from '../../../types/warehouse'

/**
 * Directed putaway workflow — task list with progress, drill into single task.
 * Per spec section 4.5: system-directed tasks, two-scan confirmation.
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
  const nextTask = activeIndex >= 0 && activeIndex < tasks.length - 1
    ? tasks[activeIndex + 1]
    : null

  const handleTaskComplete = () => {
    if (nextTask) {
      setActiveTaskId(nextTask.id)
    } else {
      setActiveTaskId(null)
    }
  }

  // Single task view
  if (activeTask) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTaskId(null)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] min-h-[48px] min-w-[48px]"
            aria-label="Back to task list"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1">
            <StepIndicator
              current={activeTask.taskNumber}
              total={activeTask.totalTasks}
              label="task"
            />
          </div>
        </div>

        <PutawayTask
          task={activeTask}
          onComplete={handleTaskComplete}
        />

        {/* Next task preview */}
        {nextTask && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 opacity-60">
            <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-1">
              Next Task
            </p>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              {nextTask.productName}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              <span className="font-mono">{nextTask.quantity}</span> units to {nextTask.toLocation}
            </p>
          </div>
        )}
      </div>
    )
  }

  // Task list view
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Putaway Tasks
        </h2>
        {tasks.length > 0 && (
          <span className="text-sm text-[var(--color-text-secondary)]">
            <span className="font-mono">{tasks.length}</span> pending
          </span>
        )}
      </div>

      {tasks.length > 0 && (
        <StepIndicator current={0} total={tasks.length} label="task" />
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[#2563EB]" />
        </div>
      )}

      {!isLoading && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-base font-medium text-[var(--color-text-primary)]">
            No putaway tasks
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            All items have been put away
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onSelect={() => setActiveTaskId(task.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Task Card ───────────────────────────────────────────

function TaskCard({
  task,
  onSelect,
}: {
  task: PutawayTaskType
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col gap-1.5 rounded-lg border border-[var(--color-border)] p-4 text-start hover:bg-[var(--color-bg-hover)] transition-colors min-h-[48px]"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {task.productName}
        </span>
        <span className="font-mono text-sm font-medium text-[var(--color-text-primary)]">
          {task.quantity}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
        <span>Lot <span className="font-mono">{task.lotNumber}</span></span>
        <span>{task.toLocation}</span>
      </div>
      {task.expiryDate && (
        <span className="text-xs font-mono text-amber-600">
          Expires {new Date(task.expiryDate).toLocaleDateString()}
        </span>
      )}
    </button>
  )
}
