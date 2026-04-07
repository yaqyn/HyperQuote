import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button, TextField, TextArea, Label } from 'react-aria-components'
import { getCustomer360 } from '../../../lib/server/sales-customers'
import { addInternalNote } from '../../../lib/server/sales-activity'

interface NotesTabProps {
  customerId: string
  enabled: boolean
}

export function NotesTab({ customerId, enabled }: NotesTabProps) {
  const { t } = useTranslation('internal')
  const queryClient = useQueryClient()
  const [newNote, setNewNote] = useState('')
  const [selectedTag, setSelectedTag] = useState<'quote-related' | 'order-related' | 'general'>('general')

  const noteMutation = useMutation({
    mutationFn: (input: { entityType: string; entityId: string; note: string }) =>
      addInternalNote({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-360', 'notes', customerId] })
      setNewNote('')
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['customer-360', 'notes', customerId],
    queryFn: () => getCustomer360({ data: { customerId } }),
    staleTime: 120_000,
    enabled,
    select: (d) => d.notes,
  })

  if (!enabled) return null
  if (isLoading) return <TabSkeleton />

  const handleAddNote = () => {
    if (!newNote.trim()) return
    noteMutation.mutate({
      entityType: 'customer',
      entityId: customerId,
      note: `[${selectedTag}] ${newNote}`,
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Thread-style notes */}
      {(!data || data.length === 0) ? (
        <div className="flex items-center justify-center h-16 text-[13px] text-black/25 dark:text-white/25">
          {t('sales.customer360.notes.noNotes')}
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((note) => {
            const initials = note.author
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()

            return (
              <div key={note.id} className="flex items-start gap-3">
                {/* Author avatar — initials circle */}
                <div className="w-7 h-7 rounded-full bg-[#2563EB]/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-semibold text-[#2563EB]">{initials}</span>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Author + timestamp */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-medium text-[var(--color-text)] dark:text-white">
                      {note.author}
                    </span>
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-black/25 dark:text-white/25">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                    {note.tag !== 'general' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2563EB]/[0.06] text-[#2563EB] font-medium">
                        {note.tag}
                      </span>
                    )}
                  </div>

                  {/* Note body */}
                  <p className="text-[13px] text-black/60 dark:text-white/60 whitespace-pre-wrap leading-relaxed">
                    {note.body}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New note input — at bottom, like a chat input */}
      <div className="border-t border-black/[0.04] dark:border-white/[0.04] pt-4">
        <TextField value={newNote} onChange={setNewNote}>
          <Label className="sr-only">{t('sales.customer360.notes.addNote')}</Label>
          <TextArea
            placeholder={t('sales.customer360.notes.placeholder')}
            rows={2}
            className="w-full px-3 py-2 text-[13px] rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border-none text-[var(--color-text)] dark:text-white placeholder:text-black/20 dark:placeholder:text-white/20 outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/40 resize-none"
          />
        </TextField>

        <div className="flex items-center justify-between mt-2">
          {/* Tag selector */}
          <div className="flex gap-1">
            {(['general', 'quote-related', 'order-related'] as const).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`text-[11px] px-2 py-1 rounded-md transition-colors ${
                  selectedTag === tag
                    ? 'bg-[#2563EB]/[0.08] text-[#2563EB] font-medium'
                    : 'text-black/30 dark:text-white/30 hover:text-black/50 dark:hover:text-white/50'
                }`}
              >
                {t(`sales.customer360.notes.tags.${tag}`)}
              </button>
            ))}
          </div>

          <Button
            onPress={handleAddNote}
            isDisabled={!newNote.trim() || noteMutation.isPending}
            className="px-4 py-1.5 text-[13px] font-medium text-white bg-[#2563EB] rounded-lg hover:bg-[#2563EB]/90 disabled:opacity-40 outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/40 data-[focus-visible]:ring-offset-2"
          >
            {t('sales.customer360.notes.save')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function TabSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-black/[0.03] dark:bg-white/[0.03]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 rounded bg-black/[0.03] dark:bg-white/[0.03]" />
            <div className="h-12 rounded bg-black/[0.03] dark:bg-white/[0.03]" />
          </div>
        </div>
      ))}
    </div>
  )
}
