import { useRef, type KeyboardEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { SearchResult } from '../../types/entity'

interface SearchResultRowProps {
  result: SearchResult
  isFocused: boolean
  onFocus: () => void
  onArrowUp: () => void
  onArrowDown: () => void
}

export function SearchResultRow({
  result,
  isFocused,
  onFocus,
  onArrowUp,
  onArrowDown,
}: SearchResultRowProps) {
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  function navigateToEntity() {
    navigate({ to: '/entity/$type/$id', params: { type: result.type, id: result.id } })
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      navigateToEntity()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      onArrowUp()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      onArrowDown()
    }
  }

  // Focus the element when isFocused changes
  if (isFocused && ref.current && document.activeElement !== ref.current) {
    ref.current.focus()
  }

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={isFocused}
      tabIndex={isFocused ? 0 : -1}
      onClick={navigateToEntity}
      onFocus={onFocus}
      onKeyDown={handleKeyDown}
      className="flex cursor-pointer flex-col gap-0.5 rounded-lg px-3 py-2.5 outline-none transition-colors hover:bg-[var(--color-surface)] focus-visible:bg-[var(--color-surface)]"
    >
      <span className="text-base font-medium text-[var(--color-text)]">
        {result.title}
      </span>
      <span className="text-sm text-[var(--color-text-muted)]">
        {result.subtitle}
      </span>
    </div>
  )
}
