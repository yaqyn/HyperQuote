# Phase 8: Portal AI Chat - Research

**Researched:** 2026-04-01
**Domain:** AI chat streaming, rich message rendering, conversation management
**Confidence:** HIGH

## Summary

Phase 8 builds the full AI chat experience for the portal. Phase 7 created the canvas with `AIChatInput` (placeholder, no streaming) and `FloatingAIButton` (mini panel shell, no chat logic). Phase 6 established the pattern for the website: `useAIChat` abstraction over `@tanstack/ai-react`'s `useChat` + `stream()` adapter, with a server function returning AG-UI `StreamChunk[]` arrays (mock responses, real AI in Phase 30).

The portal chat is significantly more complex than the website widget: rich message types (product cards, status cards, action buttons), slash commands with autocomplete, quick action chips, conversation history overlay, voice input, file upload, AbortController cancellation, and dual customer/supplier modes with separate conversation stores.

**Primary recommendation:** Extend the website's proven `useAIChat` + `stream()` + AG-UI pattern. Create a portal-specific `usePortalChat` hook that wraps `useAIChat` with Zustand persistence, role-keyed conversations, rate limiting, and rich message parsing. Keep the server function mock-based (Phase 30 wires real AI) but expand AG-UI events to include `CUSTOM` type for structured data (product cards, status cards, action buttons).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PORT-03 | AI chat: streaming via `useChat()`, rich messages (product cards, status cards, action buttons), slash commands, conversation history overlay, quick action chips | Full pattern established by Phase 6 website chat. Extend with rich message types via AG-UI `CUSTOM` events, Zustand persistence, slash command parser, history overlay component |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Three colors only (white/black/blue #2563EB). Semantic status colors for DATA only.
- React Aria Components for ALL interactive elements (buttons, inputs, forms).
- Motion v12 for animations. Spring enter, tween exit.
- Geist Mono for ALL numbers in AI responses.
- Arabic-Indic numerals when locale is Arabic.
- `.inputValidator()` not `.validator()` for server functions.
- `useWatch()` never `watch()`.
- Colors in `:root {}` never `@theme`.
- Bun, NOT npm.
- Logical properties only (`ps-4` not `pl-4`).
- Import from `motion/react` NOT `framer-motion`.

## Standard Stack

### Core (already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/ai | ^0.9.2 | Core AI SDK, StreamChunk types, AG-UI protocol | Already used in website chat |
| @tanstack/ai-react | ^0.7.6 | `useChat()` hook, `stream()` adapter | Already used in website chat |
| zustand | ^5.0.12 | Conversation state + sessionStorage persist | Already in portal |
| react-aria-components | ^1.16.0 | All interactive elements in chat UI | Already in portal |
| motion | ^12.38.0 | Rich message entrance animations | Already in portal |
| lucide-react | ^1.7.0 | Icons (Sparkles, Mic, Paperclip, History, ArrowUp, Square, Send) | Already in portal |

### To Add

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/ai | ^0.9.2 | Add to portal package.json (currently only in website) | Chat server function + hook |
| @tanstack/ai-react | ^0.7.6 | Add to portal package.json (currently only in website) | `useChat()` + `stream()` |

### Not Needed Yet

| Library | Version | Purpose | When |
|---------|---------|---------|------|
| @cloudflare/tanstack-ai | ^0.1.6 | Workers AI + AI Gateway adapter | Phase 30 (real AI backend) |

**Installation:**
```bash
cd apps/portal && bun add @tanstack/ai@^0.9.2 @tanstack/ai-react@^0.7.6
```

## Architecture Patterns

### Recommended Project Structure
```
apps/portal/src/
  components/
    chat/
      ChatContainer.tsx         # Orchestrates full chat (canvas mode)
      ChatMessages.tsx          # Message list with auto-scroll
      ChatInput.tsx             # Multi-line input, file/voice/send buttons
      ChatBubble.tsx            # User/assistant bubble rendering
      RichMessage.tsx           # Dispatcher: text | product_card | status_card | action
      ProductCard.tsx           # Inline product card with "Add to Quote"
      StatusCard.tsx            # Order/quote status with timeline
      ActionButton.tsx          # Blue outline action button
      QuickActionChips.tsx      # Contextual chips below input
      SlashCommandPalette.tsx   # Autocomplete overlay for /commands
      TypingIndicator.tsx       # "HyperQuote is thinking..." animation
      ConversationHistory.tsx   # Elevated glass overlay for past conversations
      VoiceInput.tsx            # Web Speech API mic button
      FileUpload.tsx            # Paperclip button + file picker
    canvas/
      AIChatInput.tsx           # UPGRADE: wire to actual chat, expand to multi-line
    windows/
      FloatingAIButton.tsx      # UPGRADE: wire mini chat panel to usePortalChat
  hooks/
    usePortalChat.ts            # Portal-specific chat hook wrapping useAIChat
    useVoiceInput.ts            # Web Speech API feature detection + recording
    useSlashCommands.ts         # Slash command detection + routing
  lib/
    chat.ts                     # Server function: chatStreamFn (mock, Phase 30 real)
    chat-types.ts               # Rich message types, slash command types
    chat-context.ts             # System prompt builder (customer vs supplier context)
  stores/
    chat.ts                     # Zustand store: messages, conversations, role-keyed
```

### Pattern 1: AG-UI CUSTOM Events for Rich Messages

**What:** Use the AG-UI `CUSTOM` event type to transmit structured data (product cards, status cards, action buttons) alongside text streaming.
**When to use:** When AI response contains structured content that should render as interactive UI elements.

```typescript
// Rich message types
type RichMessageType = 'text' | 'product_card' | 'status_card' | 'action_button' | 'inline_form'

interface ProductCardData {
  id: string
  name: string
  nameAr: string
  image?: string
  priceRange: string
  specs: Record<string, string>
  available: boolean
}

interface StatusCardData {
  entityType: 'order' | 'quote'
  entityId: string
  displayNumber: string  // Geist Mono
  status: string
  statusColor: 'green' | 'yellow' | 'red'
  timeline: { label: string; date: string; done: boolean }[]
}

// Server emits CUSTOM event after text streaming completes
yield {
  type: 'CUSTOM' as const,
  timestamp: Date.now(),
  name: 'rich_message',
  value: {
    type: 'product_card',
    data: { id: 'prod-123', name: 'Portland Cement OPC 42.5N', ... }
  }
}
```

### Pattern 2: Zustand Chat Store with Role-Keyed Conversations

**What:** Separate conversation state per role (customer vs supplier) using Zustand with `persist` middleware to `sessionStorage`.
**When to use:** Portal chat where switching customer/supplier mode must preserve each mode's conversation.

```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface Conversation {
  id: string
  messages: ChatMessage[]
  createdAt: string
  preview: string
  entityRef?: string  // "Quote #QR-2026-00042"
  pinned: boolean
}

interface ChatStore {
  // Per-role active conversation
  customerMessages: ChatMessage[]
  supplierMessages: ChatMessage[]
  customerConversations: Conversation[]
  supplierConversations: Conversation[]
  activeConversationId: Record<'customer' | 'supplier', string | null>
  // Actions
  addMessage: (role: 'customer' | 'supplier', msg: ChatMessage) => void
  loadConversation: (role: 'customer' | 'supplier', id: string) => void
  clearActive: (role: 'customer' | 'supplier') => void
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({ /* ... */ }),
    {
      name: 'hq-portal-chat',
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,  // SSR safe
    }
  )
)
```

### Pattern 3: Slash Command Detection and Routing

**What:** Detect `/` prefix in input, show autocomplete palette, route to specialized server functions.
**When to use:** When user types `/quote`, `/track`, `/price`, `/help`.

```typescript
const SLASH_COMMANDS = [
  { command: '/quote', labelKey: 'slash.quote', descKey: 'slash.quoteDesc', icon: FileText },
  { command: '/track', labelKey: 'slash.track', descKey: 'slash.trackDesc', icon: MapPin },
  { command: '/price', labelKey: 'slash.price', descKey: 'slash.priceDesc', icon: DollarSign },
  { command: '/help', labelKey: 'slash.help', descKey: 'slash.helpDesc', icon: HelpCircle },
] as const

// In useSlashCommands hook:
// 1. Detect if input starts with '/'
// 2. Filter commands by typed prefix
// 3. Show autocomplete overlay (React Aria ListBox)
// 4. On select: inject command context into message, send to server
```

### Pattern 4: stream() Adapter with TanStack Start Server Functions

**What:** Reuse the Phase 6 pattern: `stream()` adapter wrapping a server function that returns `StreamChunk[]`.
**Why:** TanStack Start v1.167 lacks API file routes. Server functions serialize return values, so SSE must be simulated by returning the full chunk array which the client yields as `AsyncIterable`.

```typescript
// hooks/usePortalChat.ts
import { useChat, stream } from '@tanstack/ai-react'
import type { StreamChunk } from '@tanstack/ai'
import { portalChatFn } from '../lib/chat'

export function usePortalChat(role: 'customer' | 'supplier') {
  const chat = useChat({
    connection: stream(async function* (messages) {
      const chunks = await portalChatFn({
        data: {
          messages: messages.map(m => ({
            role: m.role,
            content: m.parts?.filter(p => p.type === 'text').map(p => p.text).join('') ?? ''
          })),
          role,
          conversationId: null,  // new conversation
        }
      })
      yield* arrayToAsyncIterable(chunks)
    }),
    onError: (err) => console.error('[portal-chat]', err),
  })
  return chat
}
```

### Pattern 5: Conversation History Overlay (Elevated Glass)

**What:** Full-screen or panel overlay with Elevated glass styling for browsing past conversations.
**When to use:** User clicks History icon.

```typescript
// Elevated glass: backdrop-blur-2xl bg-white/90 dark:bg-black/90
// Grouped by date: "Today", "Yesterday", "This Week", month names
// Each thread: preview text + entity ref (Geist Mono for numbers)
// Click to resume -> overlay closes, chat loads thread
// Mobile: full-screen overlay with back button
```

### Anti-Patterns to Avoid

- **Do NOT use fetchServerSentEvents():** TanStack Start lacks API file routes. Use `stream()` adapter with server function returning `StreamChunk[]` (established Phase 6 pattern).
- **Do NOT stream structured content mid-text:** Buffer structured content (cards, tables). Text streams word-by-word, then cards appear after text ends with spring animation.
- **Do NOT import @tanstack/ai-react directly in components:** All chat logic goes through `usePortalChat` hook (abstraction for 0.x swapability).
- **Do NOT use Zustand for server state:** Chat history fetched from server uses TanStack Query. Zustand only for current session messages.
- **Do NOT mix customer/supplier conversations:** Key everything by `activeRole`. Switching roles swaps the entire conversation context.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE streaming | Custom EventSource + state management | `useChat()` + `stream()` from @tanstack/ai-react | Handles reconnection, abort, message state |
| Speech-to-text | Custom WebSocket to STT service | Web Speech API (`SpeechRecognition`) | Built into browsers, supports `ar-EG` locale |
| Rich text rendering | Custom markdown parser | Simple split-and-render on AG-UI event types | Structured data, not markdown |
| Autocomplete overlay | Custom dropdown | React Aria `ListBox` + `Popover` | Keyboard nav, RTL, accessibility |
| Session persistence | localStorage wrapper | Zustand `persist` middleware | Built-in serialization, SSR-safe with skipHydration |

## Common Pitfalls

### Pitfall 1: Zustand Hydration Mismatch
**What goes wrong:** SSR renders empty chat state, client hydrates with sessionStorage data, React throws hydration error.
**Why it happens:** Zustand `persist` loads stored state on mount, which differs from SSR state.
**How to avoid:** Use `skipHydration: true` in persist config. Call `useChatStore.persist.rehydrate()` in a `useEffect`.
**Warning signs:** Console hydration warnings, flash of empty chat.

### Pitfall 2: Structured Content During Streaming
**What goes wrong:** Product cards try to render while text is still streaming, causing layout jumps.
**Why it happens:** AG-UI CUSTOM events arrive interleaved with TEXT_MESSAGE_CONTENT.
**How to avoid:** Buffer CUSTOM events. Only render structured content after TEXT_MESSAGE_END. Use spring animation for card entrance.
**Warning signs:** Cards flickering in/out, layout shifts.

### Pitfall 3: AbortController Cleanup
**What goes wrong:** User navigates away during streaming, SSE connection stays open, zombie responses arrive.
**Why it happens:** `stream()` adapter creates internal connections that need explicit abort.
**How to avoid:** Use `chat.stop()` from useChat return. Call on route change and component unmount. The `stream()` adapter + `useChat` handle AbortController internally.
**Warning signs:** Console errors after navigation, stale messages appearing.

### Pitfall 4: RTL Chat Bubble Rounding
**What goes wrong:** Message bubbles have wrong corner rounding in Arabic mode.
**Why it happens:** Hardcoded `rounded-br-md` instead of logical `rounded-ee-md`.
**How to avoid:** Use RTL class toggles: `rtl:rounded-tr-xl rtl:rounded-tl-sm` for user messages (as established in website ChatMessages). CONTEXT.md spec: user = `rounded-2xl rounded-br-md` (LTR) / `rounded-bl-md` (RTL).
**Warning signs:** Visual mismatch when switching languages.

### Pitfall 5: Voice Input Browser Compatibility
**What goes wrong:** Mic button shows on browsers without Web Speech API, click does nothing.
**Why it happens:** Not all browsers support `SpeechRecognition`.
**How to avoid:** Feature-detect `window.SpeechRecognition || window.webkitSpeechRecognition`. Hide button if unsupported. This is progressive enhancement.
**Warning signs:** Mic button with no response on click.

### Pitfall 6: Geist Mono for Numbers in AI Text
**What goes wrong:** AI response text has numbers rendered in Inter (default font), not Geist Mono.
**Why it happens:** AI streams plain text; numbers aren't automatically wrapped in Geist Mono spans.
**How to avoid:** Post-process rendered text: regex-match numbers and wrap in `<span className="font-[family-name:var(--font-geist-mono)]">`. Also convert to Arabic-Indic numerals when locale is Arabic.
**Warning signs:** Numbers in chat looking like regular text instead of monospace.

### Pitfall 7: Rate Limit UX
**What goes wrong:** User hits 30 msg/min limit and gets hard-blocked with no feedback.
**Why it happens:** Server rejects but client doesn't show why.
**How to avoid:** Track message count client-side. Show warning toast at 25/min. At 30/min, disable send button with countdown. Server-side rate limit via KV as backup.
**Warning signs:** Silent message failures.

## Code Examples

### AG-UI Mock Server Function with Rich Messages

```typescript
// apps/portal/src/lib/chat.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { StreamChunk } from '@tanstack/ai'

const portalChatInput = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
  role: z.enum(['customer', 'supplier']),
  conversationId: z.string().nullable(),
})

async function* mockPortalStream(
  userMessage: string,
  role: 'customer' | 'supplier'
): AsyncGenerator<StreamChunk> {
  const runId = crypto.randomUUID()
  const messageId = crypto.randomUUID()

  yield { type: 'RUN_STARTED', timestamp: Date.now(), runId }
  yield { type: 'TEXT_MESSAGE_START', timestamp: Date.now(), messageId, role: 'assistant' }

  // Stream text tokens
  const words = getResponse(userMessage, role).split(' ')
  for (const word of words) {
    yield { type: 'TEXT_MESSAGE_CONTENT', timestamp: Date.now(), messageId, delta: word + ' ' }
    await new Promise(r => setTimeout(r, 50 + Math.random() * 50))
  }

  yield { type: 'TEXT_MESSAGE_END', timestamp: Date.now(), messageId }

  // Emit structured content after text (if applicable)
  if (userMessage.toLowerCase().includes('cement')) {
    yield {
      type: 'CUSTOM',
      timestamp: Date.now(),
      name: 'rich_message',
      value: {
        type: 'product_card',
        data: {
          id: 'prod-opc-425n',
          name: 'Portland Cement OPC 42.5N',
          nameAr: 'اسمنت بورتلاندي عادي ٤٢.٥',
          priceRange: 'EGP 1,800 - 2,200/ton',
          available: true,
        }
      }
    }
  }

  yield { type: 'RUN_FINISHED', timestamp: Date.now(), runId, finishReason: 'stop' }
}

export const portalChatFn = createServerFn()
  .inputValidator(portalChatInput)
  .handler(async ({ data: input }): Promise<StreamChunk[]> => {
    const lastMessage = input.messages[input.messages.length - 1]
    const chunks: StreamChunk[] = []
    for await (const chunk of mockPortalStream(lastMessage?.content ?? '', input.role)) {
      chunks.push(chunk)
    }
    return chunks
  })
```

### usePortalChat Hook

```typescript
// apps/portal/src/hooks/usePortalChat.ts
import { useChat, stream } from '@tanstack/ai-react'
import type { UIMessage, StreamChunk } from '@tanstack/ai'
import { portalChatFn } from '../lib/chat'
import { usePortalStore } from '../stores/portal'
import { useChatStore } from '../stores/chat'

async function* arrayToAsyncIterable(chunks: StreamChunk[]): AsyncIterable<StreamChunk> {
  for (const chunk of chunks) yield chunk
}

export function usePortalChat() {
  const activeRole = usePortalStore(s => s.activeRole)

  const chat = useChat({
    connection: stream(async function* (messages) {
      const simpleMessages = (messages as UIMessage[]).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.parts?.filter(p => p.type === 'text').map(p => p.text).join('') ?? '',
      }))

      const chunks = await portalChatFn({
        data: { messages: simpleMessages, role: activeRole, conversationId: null }
      })

      yield* arrayToAsyncIterable(chunks)
    }),
  })

  return {
    messages: chat.messages,
    sendMessage: chat.sendMessage,
    isLoading: chat.isLoading,
    stop: chat.stop,
    clear: chat.clear,
    error: chat.error,
  }
}
```

### Rich Message Renderer

```typescript
// apps/portal/src/components/chat/RichMessage.tsx
import { motion } from 'motion/react'
import { ProductCard } from './ProductCard'
import { StatusCard } from './StatusCard'
import { ActionButton } from './ActionButton'

interface RichMessageProps {
  type: string
  data: unknown
}

export function RichMessage({ type, data }: RichMessageProps) {
  const Component = {
    product_card: ProductCard,
    status_card: StatusCard,
    action_button: ActionButton,
  }[type]

  if (!Component) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <Component data={data} />
    </motion.div>
  )
}
```

### Quick Action Chips

```typescript
// Contextual chips based on conversation stage
const CHIP_SETS = {
  home: ['chat.chip.getQuote', 'chat.chip.trackOrder', 'chat.chip.checkPrices', 'chat.chip.uploadList'],
  afterProduct: ['chat.chip.addToQuote', 'chat.chip.checkStock', 'chat.chip.alternatives', 'chat.chip.compare'],
} as const

// Render as horizontal scroll of React Aria Button components
// h-32px, blue outline style, rounded-full
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| fetchServerSentEvents() | stream() adapter | Phase 6 decision | TanStack Start lacks API routes; stream() works with server functions |
| Vercel AI SDK | @tanstack/ai-react | 2025-2026 | Native TanStack integration, AG-UI protocol |
| Custom SSE parser | useChat() hook | @tanstack/ai-react 0.7+ | Handles all streaming state management |
| framer-motion | motion/react v12 | 2025 | Same API, new import path |

## Open Questions

1. **CUSTOM event handling in useChat**
   - What we know: AG-UI protocol defines `CUSTOM` event type. useChat processes text events natively.
   - What's unclear: Whether useChat passes CUSTOM events through to consumers or drops them. May need to handle via raw stream interception.
   - Recommendation: Test with mock server. If useChat drops CUSTOM events, parse them in the `stream()` generator and side-channel to Zustand store.

2. **Conversation history persistence**
   - What we know: CONTEXT says "Conversation stored in Zustand (sessionStorage persist)". History overlay shows past conversations.
   - What's unclear: Where past conversations (beyond current session) are stored. Supabase tables `ai_conversations` + `ai_messages` don't exist yet (Phase 30 / DB phases).
   - Recommendation: For Phase 8, persist conversations in sessionStorage via Zustand. Show only current-session conversations in history overlay. Full server-side history deferred to Phase 30.

3. **File upload implementation scope**
   - What we know: CONTEXT describes R2 upload, presigned URLs, CSV parsing.
   - What's unclear: Whether file upload is Phase 8 scope or deferred (R2 bucket setup, presigned URL generation require infrastructure).
   - Recommendation: Build the UI (Paperclip button, file picker, upload progress), but mock the upload. Show uploaded file as a message attachment. Real R2 upload deferred.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| @tanstack/ai | Chat streaming | Needs install in portal | ^0.9.2 | -- |
| @tanstack/ai-react | useChat hook | Needs install in portal | ^0.7.6 | -- |
| Web Speech API | Voice input | Browser-dependent | -- | Hide mic button if unsupported |
| Cloudflare KV | Rate limiting | Available in Workers | -- | Allow all in dev (existing pattern) |

**Missing dependencies with no fallback:** None (AI packages just need `bun add`).

**Missing dependencies with fallback:**
- Web Speech API: progressive enhancement, hide button if unsupported.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 (browser mode for React Aria) |
| Config file | Needs setup in portal (Wave 0) |
| Quick run command | `bun run vitest run --project portal` |
| Full suite command | `bun run vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PORT-03a | Chat streams responses token-by-token | unit | `bun vitest run apps/portal/src/hooks/usePortalChat.test.ts -x` | Wave 0 |
| PORT-03b | Rich messages render: product cards | unit | `bun vitest run apps/portal/src/components/chat/RichMessage.test.tsx -x` | Wave 0 |
| PORT-03c | Slash commands trigger flows | unit | `bun vitest run apps/portal/src/hooks/useSlashCommands.test.ts -x` | Wave 0 |
| PORT-03d | Conversation history overlay | unit | `bun vitest run apps/portal/src/components/chat/ConversationHistory.test.tsx -x` | Wave 0 |
| PORT-03e | Quick action chips render contextually | unit | `bun vitest run apps/portal/src/components/chat/QuickActionChips.test.tsx -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun vitest run --project portal`
- **Per wave merge:** `bun vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Vitest config for portal app (may exist from Phase 7, verify)
- [ ] Test utilities for mocking server functions
- [ ] Test fixtures for AG-UI StreamChunk mock data

## Sources

### Primary (HIGH confidence)
- Existing codebase: `apps/website/src/hooks/useAIChat.ts` - established streaming pattern
- Existing codebase: `apps/website/src/lib/chat.ts` - AG-UI mock server function pattern
- Existing codebase: `apps/portal/src/` - Phase 7 portal shell, stores, components
- [GitHub TanStack/ai types.ts](https://github.com/TanStack/ai/blob/main/packages/typescript/ai/src/types.ts) - AG-UI event types verified
- npm registry: @tanstack/ai 0.9.2, @tanstack/ai-react 0.7.6, @cloudflare/tanstack-ai 0.1.6

### Secondary (MEDIUM confidence)
- [TanStack AI SSE Protocol docs](https://tanstack.com/ai/latest/docs/protocol/sse-protocol)
- [TanStack AI Streaming guide](https://tanstack.com/ai/latest/docs/guides/streaming)
- [TanStack AI Connection Adapters](https://tanstack.com/ai/latest/docs/guides/connection-adapters)
- [Cloudflare AI Gateway TanStack adapter](https://tanstack.com/ai/latest/docs/community-adapters/cloudflare)
- [BetterStack TanStack AI guide](https://betterstack.com/community/guides/ai/tanstack-ai/)

### Tertiary (LOW confidence)
- Web Speech API `ar-EG` locale support - browser-dependent, needs runtime testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - same packages already used in website, versions verified against npm
- Architecture: HIGH - extending established Phase 6 patterns, well-documented in CONTEXT.md
- Pitfalls: HIGH - most pitfalls from direct codebase experience (hydration, RTL, streaming)
- AG-UI CUSTOM events: MEDIUM - protocol supports it but unclear how useChat handles them

**Research date:** 2026-04-01
**Valid until:** 2026-04-30 (0.x packages may change, but pattern is stable)
