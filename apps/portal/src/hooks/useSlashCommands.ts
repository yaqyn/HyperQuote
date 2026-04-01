/**
 * useSlashCommands -- Hook for slash command detection and filtering.
 *
 * Detects `/` at start of input, filters SLASH_COMMANDS by typed prefix,
 * manages keyboard navigation index. Consumer renders SlashCommandPalette.
 */
import { useMemo, useState, useCallback } from 'react'
import { SLASH_COMMANDS, type SlashCommand } from '../lib/chat-types'

interface UseSlashCommandsReturn {
  /** Whether the slash command palette should be visible */
  isActive: boolean
  /** Filtered commands matching the typed prefix */
  filteredCommands: SlashCommand[]
  /** Currently highlighted command index */
  selectedIndex: number
  /** Set highlighted index (for mouse hover) */
  setSelectedIndex: (index: number) => void
  /** Get the full command string for the selected command */
  selectCommand: (cmd: SlashCommand) => string
  /** Move selection up */
  moveUp: () => void
  /** Move selection down */
  moveDown: () => void
}

export function useSlashCommands(inputValue: string): UseSlashCommandsReturn {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const isActive = inputValue.startsWith('/')

  const filteredCommands = useMemo(() => {
    if (!isActive) return []
    const prefix = inputValue.toLowerCase()
    return SLASH_COMMANDS.filter((cmd) =>
      cmd.command.toLowerCase().startsWith(prefix),
    )
  }, [inputValue, isActive])

  // Reset index when filtered results change
  const safeIndex = Math.min(selectedIndex, Math.max(0, filteredCommands.length - 1))

  const moveUp = useCallback(() => {
    setSelectedIndex((prev) =>
      prev <= 0 ? filteredCommands.length - 1 : prev - 1,
    )
  }, [filteredCommands.length])

  const moveDown = useCallback(() => {
    setSelectedIndex((prev) =>
      prev >= filteredCommands.length - 1 ? 0 : prev + 1,
    )
  }, [filteredCommands.length])

  const selectCommand = useCallback((cmd: SlashCommand): string => {
    setSelectedIndex(0)
    return `${cmd.command} `
  }, [])

  return {
    isActive,
    filteredCommands,
    selectedIndex: safeIndex,
    setSelectedIndex,
    selectCommand,
    moveUp,
    moveDown,
  }
}
