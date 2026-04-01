/**
 * Quote draft persistence utilities.
 * Manages localStorage save/restore with timestamps for conflict resolution.
 */
import type { QuoteItem } from '../stores/quote-builder'

// ============================================================================
// Types
// ============================================================================

export interface DraftData {
  items: QuoteItem[]
  projectId: string | null
  deliveryAddressId: string | null
  deliveryDate: string | null
  notes: string
  draftId: string | null
  updatedAt: number
}

// ============================================================================
// Constants
// ============================================================================

const DRAFT_KEY = 'quote-draft-data'

// ============================================================================
// localStorage Operations
// ============================================================================

export function saveDraftToLocal(data: Omit<DraftData, 'updatedAt'>): void {
  try {
    const draft: DraftData = {
      ...data,
      updatedAt: Date.now(),
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // localStorage full or unavailable -- silently fail
    console.warn('[quote-draft] Failed to save to localStorage')
  }
}

export function loadDraftFromLocal(): DraftData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DraftData
    // Validate shape
    if (!Array.isArray(parsed.items) || typeof parsed.updatedAt !== 'number') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearLocalDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Ignore
  }
}

/**
 * Check if a draft exists and is recent (less than 24 hours old).
 */
export function hasRecentDraft(): boolean {
  const draft = loadDraftFromLocal()
  if (!draft) return false
  const age = Date.now() - draft.updatedAt
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
  return age < TWENTY_FOUR_HOURS && draft.items.length > 0
}
