import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button, TextField, Input, TextArea, Label } from 'react-aria-components'
import { getCustomer360 } from '../../../lib/server/sales-customers'

interface NotesTabProps {
  customerId: string
  enabled: boolean
}

const TAG_STYLES: Record<string, string> = {
  'quote-related': 'bg-[#2563EB]/10 text-[#2563EB]',
  'order-related': 'bg-[#22c55e]/10 text-[#22c55e]',
  general: 'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60',
}

export function NotesTab({ customerId, enabled }: NotesTabProps) {
  const { t } = useTranslation('internal')
  const [newNote, setNewNote] = useState('')
  const [selectedTag, setSelectedTag] = useState<'quote-related' | 'order-related' | 'general'>('general')

  const { data, isLoading } = useQuery({
    queryKey: ['customer-360', 'notes', customerId],
    queryFn: () => getCustomer360({ customerId }),
    staleTime: 120_000,
    enabled,
    select: (d) => d.notes,
  })

  if (!enabled) return null
  if (isLoading) return <TabSkeleton />

  const handleAddNote = () => {
    if (!newNote.trim()) return
    // TODO: Call addInternalNote server function
    setNewNote('')
  }

  return (
    <div className="p-4 space-y-4">
      {/* Add Note Form */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 p-4 space-y-3">
        <TextField value={newNote} onChange={setNewNote}>
          <Label className="text-sm font-medium text-black/70 dark:text-white/70">
            {t('sales.customer360.notes.addNote')}
          </Label>
          <TextArea
            placeholder={t('sales.customer360.notes.placeholder')}
            rows={3}
            className="w-full mt-1.5 px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 resize-none"
          />
        </TextField>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {(['general', 'quote-related', 'order-related'] as const).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selectedTag === tag
                    ? 'border-[#2563EB] text-[#2563EB] bg-[#2563EB]/5'
                    : 'border-black/10 dark:border-white/10 text-black/50 dark:text-white/50'
                }`}
              >
                {t(`sales.customer360.notes.tags.${tag}`)}
              </button>
            ))}
          </div>

          <Button
            onPress={handleAddNote}
            isDisabled={!newNote.trim()}
            className="px-4 py-1.5 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-[#2563EB]/90 disabled:opacity-40 outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[focus-visible]:ring-offset-2"
          >
            {t('sales.customer360.notes.save')}
          </Button>
        </div>
      </div>

      {/* Notes List */}
      {(!data || data.length === 0) ? (
        <div className="flex items-center justify-center h-24 text-sm text-black/40 dark:text-white/40">
          {t('sales.customer360.notes.noNotes')}
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-black/5 dark:border-white/5 bg-white/40 dark:bg-black/30 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#2563EB]/10 flex items-center justify-center">
                    <span className="text-xs font-medium text-[#2563EB]">
                      {note.author.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-black dark:text-white">
                    {note.author}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${TAG_STYLES[note.tag] ?? TAG_STYLES.general}`}>
                    {note.tag}
                  </span>
                </div>
                <span className="text-xs font-[family-name:var(--font-geist-mono)] text-black/40 dark:text-white/40">
                  {new Date(note.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-black/70 dark:text-white/70 whitespace-pre-wrap">
                {note.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TabSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="h-32 rounded-xl bg-black/5 dark:bg-white/5" />
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="h-24 rounded-lg bg-black/5 dark:bg-white/5" />
      ))}
    </div>
  )
}
