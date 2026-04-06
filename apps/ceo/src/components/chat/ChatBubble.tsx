import { useNavigate } from '@tanstack/react-router'
import type { ChatMessage } from '../../types/chat'
import { SimpleBarChart } from './SimpleBarChart'
import { CitationLink } from './CitationLink'

interface ChatBubbleProps {
  message: ChatMessage
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const navigate = useNavigate()
  const isUser = message.role === 'user'

  return (
    <div
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] space-y-2 ${
          isUser
            ? 'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-end'
            : 'text-start'
        }`}
      >
        {/* Message text */}
        <p className="whitespace-pre-wrap text-sm text-[var(--color-text)]">
          {message.content}
        </p>

        {/* Charts */}
        {message.charts?.map((chart, i) => (
          <SimpleBarChart key={i} chart={chart} />
        ))}

        {/* Entity links */}
        {message.entityLinks && message.entityLinks.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {message.entityLinks.map((link) => (
              <button
                key={`${link.type}-${link.id}`}
                type="button"
                onClick={() =>
                  navigate({
                    to: '/entity/$entityType/$entityId',
                    params: { entityType: link.type, entityId: link.id },
                  })
                }
                className="inline-flex items-center rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)]"
              >
                {link.label}
              </button>
            ))}
          </div>
        )}

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-1">
            {message.citations.map((citation, i) => (
              <CitationLink key={i} citation={citation} index={i} />
            ))}
          </div>
        )}

        {/* Source line (AI only) */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <p className="pt-1 text-xs text-[var(--color-text-muted)]">
            Source: {message.citations[0].source}{' '}
            <button
              type="button"
              className="text-xs text-[var(--color-text-subtle)] underline"
            >
              Report issue
            </button>
          </p>
        )}

        {/* Timestamp */}
        <p className="font-mono text-xs text-[var(--color-text-muted)]">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>

        {/* Export actions (AI only) */}
        {!isUser && (
          <div className="flex gap-4 pt-1">
            <button
              type="button"
              className="text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
            >
              Export as PDF
            </button>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(message.content)}
              className="text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
            >
              Copy to clipboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
