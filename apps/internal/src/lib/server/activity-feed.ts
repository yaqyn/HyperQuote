import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { ActivityEntry, HandoffStatus, MentionTarget } from '../../components/activity-feed/types'

/**
 * Fetch activity entries for a given entity.
 * Will query activity_logs table with entity_type + entity_id filter when Supabase is connected.
 */
export const getActivityEntries = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      entityType: z.string(),
      entityId: z.string(),
    }),
  )
  .handler(async ({ data: input }): Promise<ActivityEntry[]> => {
    const now = new Date()
    const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString()

    // Mock: 5 sample entries mixing types
    return [
      {
        id: 'act-1',
        entityType: input.entityType,
        entityId: input.entityId,
        type: 'system',
        actorId: 'system',
        actorName: 'System',
        body: 'Quote request created and assigned to Sales team',
        createdAt: minutesAgo(120),
      },
      {
        id: 'act-2',
        entityType: input.entityType,
        entityId: input.entityId,
        type: 'comment_internal',
        actorId: 'user-1',
        actorName: 'Ahmed Hassan',
        actorRole: 'Sales Manager',
        body: 'Contacted supplier for pricing. Expecting response within 1 hour.',
        createdAt: minutesAgo(90),
      },
      {
        id: 'act-3',
        entityType: input.entityType,
        entityId: input.entityId,
        type: 'comment_external',
        actorId: 'user-2',
        actorName: 'Mohamed Ali',
        actorRole: 'Customer',
        body: 'Can you expedite this? We need delivery by Thursday.',
        createdAt: minutesAgo(60),
      },
      {
        id: 'act-4',
        entityType: input.entityType,
        entityId: input.entityId,
        type: 'mention',
        actorId: 'user-1',
        actorName: 'Ahmed Hassan',
        actorRole: 'Sales Manager',
        body: '@[Fatma Nour](user-3) please review the pricing for this order',
        createdAt: minutesAgo(30),
      },
      {
        id: 'act-5',
        entityType: input.entityType,
        entityId: input.entityId,
        type: 'system',
        actorId: 'system',
        actorName: 'System',
        body: 'Quote #QR-2024-0847 sent to customer',
        createdAt: minutesAgo(5),
      },
    ]
  })

/**
 * Post a comment on an entity.
 * Will INSERT into activity_logs + create notification for each @mentioned user when Supabase is connected.
 */
export const postComment = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      entityType: z.string(),
      entityId: z.string(),
      body: z.string().min(1),
      isInternal: z.boolean(),
    }),
  )
  .handler(async ({ data: input }): Promise<ActivityEntry> => {
    // Parse @mentions from body
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    const mentions: Array<{ name: string; userId: string }> = []
    let match: RegExpExecArray | null = mentionRegex.exec(input.body)
    while (match !== null) {
      mentions.push({ name: match[1], userId: match[2] })
      match = mentionRegex.exec(input.body)
    }

    const hasMentions = mentions.length > 0

    return {
      id: `act-${Date.now()}`,
      entityType: input.entityType,
      entityId: input.entityId,
      type: hasMentions ? 'mention' : input.isInternal ? 'comment_internal' : 'comment_external',
      actorId: 'current-user',
      actorName: 'Current User',
      actorRole: 'Staff',
      body: input.body,
      createdAt: new Date().toISOString(),
      metadata: hasMentions ? { mentions } : undefined,
    }
  })

/**
 * Search internal users for @mention autocomplete.
 * Will query internal_users table filtered by name ILIKE when Supabase is connected.
 */
export const searchMentionTargets = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      query: z.string(),
    }),
  )
  .handler(async ({ data: input }): Promise<MentionTarget[]> => {
    const allTargets: MentionTarget[] = [
      { id: 'user-1', name: 'Ahmed Hassan', role: 'Sales Manager', department: 'Sales' },
      { id: 'user-3', name: 'Fatma Nour', role: 'Procurement Lead', department: 'Procurement' },
      { id: 'user-4', name: 'Omar Khalil', role: 'Finance Manager', department: 'Finance' },
      { id: 'user-5', name: 'Sara Ibrahim', role: 'Dispatch Lead', department: 'Dispatch' },
      { id: 'user-6', name: 'Youssef Mostafa', role: 'Warehouse Manager', department: 'Warehouse' },
    ]

    const q = input.query.toLowerCase()
    return allTargets.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 5)
  })

/**
 * Get Hot Potato handoff status for an entity.
 * Will check activity_logs for unacknowledged handoff entries when Supabase is connected.
 */
export const getHandoffStatus = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      entityType: z.string(),
      entityId: z.string(),
    }),
  )
  .handler(async ({ data: _input }): Promise<HandoffStatus | null> => {
    // Mock: no active handoff
    return null
  })

/**
 * Acknowledge a Hot Potato handoff assignment.
 * Will update activity_logs handoff entry with acknowledged_at when Supabase is connected.
 */
export const acknowledgeHandoff = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      entityType: z.string(),
      entityId: z.string(),
    }),
  )
  .handler(async ({ data: _input }): Promise<{ success: boolean }> => {
    return { success: true }
  })
