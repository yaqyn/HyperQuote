# Phase 8: Portal AI Chat

## Goal
Customers can have a natural conversation with AI that understands their context and surfaces actionable product/order information inline.

## Dependencies
Phase 7 (Portal Auth + Shell must be complete).

## Requirements

- **PORT-03**: AI chat: streaming via `useChat()`, rich messages (product cards, status cards, action buttons), slash commands, conversation history overlay, quick action chips

## Success Criteria
1. Chat streams responses token-by-token via SSE using `useChat()`
2. Rich messages render inline: product cards (with "Add to Quote"), status cards, and action buttons
3. Slash commands (`/quote`, `/track`, `/price`, `/help`) trigger specialized flows
4. Conversation history overlay opens from History icon, showing past conversations

## What to Build
- `useChat()` from @tanstack/ai-react for SSE streaming
- Rich message types: text, product cards, status cards, action buttons, inline forms
- Quick action chips below input (contextual)
- Slash commands: `/quote`, `/track`, `/price`, `/help`
- Conversation history overlay (Elevated glass, accessed via History icon)
- Server function: `aiChat()` SSE proxy to Claude via Cloudflare AI Gateway
- AI fallback chain: Claude -> Groq -> GLM -> graceful degradation

## Spec References

### Server Function: `aiChat()` (SSE proxy)

There is no explicit `aiChat()` function in BACKEND.md Section 6. The closest server functions are:
- `parseWithAI` (POST, `{ text }` -> `{ parsedItems[] }`, customer auth, AI extraction pipeline)
- `askAI` (POST, `{ prompt, context, model? }` -> `{ response, confidence, sources[] }`, any internal, logs to ai_interactions)
- `getConversationHistory` (GET, `{ page, limit }` -> `{ conversations[] }`, customer auth)

**The `aiChat()` SSE proxy is a custom server function to implement for portal chat.** Spec based on the pattern described in this phase context:

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `aiChat` | POST (SSE) | `{ message, conversationId?, history[] (last 20) }` | SSE stream: `{ type: 'text'\|'product_card'\|'status_card'\|'action', content }` | customer or supplier | Log to ai_conversations + ai_messages, route via AI Gateway |

**Implementation pattern:**
1. Receive user message + conversation history (last 20 messages)
2. Build system prompt with customer context (name, company, tier, active orders) or supplier context (company, products, POs)
3. Route to Claude via Cloudflare AI Gateway (`portal_chat` use case)
4. Stream response tokens back via SSE
5. If Claude unavailable: fallback to Groq -> GLM -> graceful degradation message
6. Log request to `ai_request_log` table (provider, latency, tokens, fallback_used)

### AI Pipeline vs Fallback — Clarification

**These are two separate concepts that BOTH apply:**

**1. 4-Tier ROUTING (different models for different tasks):**

| Use Case | Primary | Fallback 1 | Fallback 2 | Timeout |
|---|---|---|---|---|
| `portal_chat` | claude-sonnet | groq-qwen3-32b | glm-4-flash | 5000ms |
| `ceo_analytics` | claude-sonnet | groq-qwen3-32b | -- | 8000ms |
| `intent_classification` | glm-4-flash | groq-qwen3-32b | -- | 2000ms |
| `ocr` | mistral-ocr | claude-vision | -- | 15000ms |

Each use case routes to the BEST model for that task. This is routing, not fallback.

**2. FALLBACK within each tier (degradation when primary model fails):**
Within each use case, if the primary model fails (timeout, rate limit, 500 error), the system cascades to Fallback 1, then Fallback 2, then graceful degradation message.

**For portal chat specifically:** Claude (primary, best quality) -> Groq Qwen3 32B (fast, good Arabic) -> GLM-4-Flash (budget, still functional) -> graceful degradation ("I'm having trouble connecting. Please try again in a moment.").

All routing goes through Cloudflare AI Gateway which provides caching, rate limiting, analytics, and automatic fallback routing.

### Supplier Mode AI Intents

When the portal role is toggled to Supplier, the AI chat context switches entirely. Different system prompt, different data access, different intents:

| Intent | Example Input | AI Response |
|--------|--------------|-------------|
| Stock queries | "How much Portland cement do I have listed?" | Shows current stock levels from supplier's published inventory |
| PO status | "Any new purchase orders?" | Lists pending POs with quantities, dates. "Confirm" / "Reject" action buttons |
| Price updates | "Update my rebar price to EGP 45,000/ton" | Confirms the update, shows affected active quotes (if any) |
| Catalog help | "I uploaded a new price list" | Triggers catalog parsing pipeline, shows extraction progress |
| Delivery coordination | "When should I deliver PO-2026-00123?" | Shows delivery schedule, warehouse receiving hours |
| Payment inquiries | "When will I get paid for PO-2026-00089?" | Shows payment status, expected dates based on payment terms |
| Analytics | "How are my products performing?" | Shows quote inclusion rate, win rate, revenue from HyperQuote |

Supplier conversations are preserved separately in Zustand (keyed by role). Switching back to Customer mode restores the customer conversation.

### Voice Input

- **Browser (portal PWA):** Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`). Supports Arabic (`ar-EG` locale). Activated via Lucide `Mic` button (mobile primarily). Shows waveform indicator while recording. Transcribed text appears in input field for review before sending.
- **Native (Capacitor — future Driver App):** Capacitor Speech Recognition plugin (`@capacitor-community/speech-recognition`). Same UX pattern.
- Voice input is optional / progressive enhancement — not all browsers support Web Speech API. Feature-detect and hide the Mic button if unsupported.

### File Upload Handling

- **Storage:** Cloudflare R2 bucket at `/{tenant_id}/attachments/`
- **Size limit:** 10MB per file
- **Supported types:** Images (JPG, PNG), PDFs, CSVs, Excel (XLSX)
- **CSV triggers material list parsing:** When a CSV file is uploaded, the system automatically invokes `parseUploadedFile()` which reads and extracts structured product data (name, quantity, unit). The parsed items appear as an editable table in the chat.
- **Upload flow:** File attachment button (Lucide `Paperclip`) -> native file picker -> upload to R2 via presigned URL -> AI processes file -> structured results shown inline in chat.
- **AI processing:** CSVs and Excel files go through `parseUploadedFile()`. Free-text and images go through `parseWithAI()`. PDFs may go through Mistral OCR pipeline depending on content.

### 2.3 Portal -- AI Chat Capabilities (Detailed)

**The AI chat is the PRIMARY interaction point. It replaces traditional navigation for users who prefer it.**

**Supported intents (customer mode):**

| Intent | Example Input | AI Response |
|--------|--------------|-------------|
| Product search | "Do you have portland cement?" | Product card(s) with specs, price range, availability. "Add to Quote" button. |
| Simple order | "I need 500 bags of OPC cement and 200 bundles of 12mm rebar" | Parses into structured material list. Shows editable table. "Submit as Quote Request" button. |
| Reorder | "Reorder my last purchase" | Pulls previous order, shows items as editable list. "Submit as Quote Request" button. |
| AI estimation | "I'm building a 3-floor apartment, 200sqm per floor" | Asks clarifying questions. Generates material list with DISCLAIMER. |
| Order status | "Where's my order?" or "Status of QR-2026-00042" | Order status card with timeline, ETA. Link to Orders window. |
| Invoice lookup | "Show me my invoices" | List with status badges. Amounts in Geist Mono. Link to Documents. |
| Quote status | "Any updates on my cement quote?" | Quote status with timeline. |
| Support | "I received damaged cement" | Creates support ticket. Photo upload. Or WhatsApp redirect. |
| General | "What are your delivery areas?" | Informational response from knowledge base. |

**AI guardrails:**
- Never reveals exact supplier prices, margin data, or internal cost information.
- Estimation tool always includes disclaimer text. User must acknowledge before submitting.
- Large quantity flag: AI asks confirmation for abnormally large quantities.
- All AI-drafted material lists are EDITABLE before submission.
- AI never auto-submits anything. Every action requires explicit user confirmation.

**Rich message types (inline in AI responses):**
- Text (markdown rendered)
- Product cards: image, name, specs, price range, "Add to Quote" button
- Price comparison tables: formatted tabular data
- Status cards: mini order tracker with timeline
- Action buttons: "Create Quote", "Track Order #847", "View Invoice"
- Inline forms: structured field entry for complex requests
- File attachments: PDFs, images with preview

**Quick action chips (below input, contextual):**
- Home state: "Get a quote" | "Track my order" | "Check prices" | "Upload material list"
- After product discussion: "Add to quote" | "Check stock" | "See alternatives" | "Compare prices"
- Chips change based on conversation stage. Reduce typing, show AI capabilities.

**Input design:**
- Multi-line text input (1 line default, auto-expand to max 6 before scroll)
- File attachment button (Lucide `Paperclip`): upload images, PDFs, CSVs, Excel
- Voice input button (Lucide `Mic`, mobile): voice transcription
- Send button: Enter to send, Shift+Enter for new line
- Slash commands: `/quote`, `/track`, `/price`, `/help` -- trigger command palette with autocomplete

**Conversation history (accessed via Lucide `History` icon button above chat input):**
- Opens as Elevated glass overlay (NOT a sidebar -- preserves spatial philosophy).
- Grouped by date: "Today", "Yesterday", "This Week", month names.
- Each thread: first message preview + key entity (Quote #, Order #).
- Pin important conversations. Search across all conversations.
- Click thread to resume (overlay closes, chat loads thread).
- On mobile: full-screen overlay with back button.

**AI streaming UI:**
- Uses @tanstack/ai-react `useChat()` hook.
- SSE connection to server function which proxies to Claude via Cloudflare AI Gateway.
- Conversation stored in Zustand (sessionStorage persist). Survives page refresh within session.
- Conversation history sent with each request (sliding window, last 20 messages) for context.
- Rate limit: 30 messages per minute. Warning message if exceeded.

### AI Infrastructure

**Cloudflare AI Gateway routing:**
- 4-tier pipeline: GLM classifier -> Groq fast chat -> Mistral OCR -> Claude reasoning
- For portal chat: primarily Claude, with Groq fallback for fast responses
- `@cloudflare/tanstack-ai` adapter for Workers AI + AI Gateway support

**Server function pattern:**
```
aiChat() SSE proxy:
1. Receive user message + conversation history (last 20)
2. Build system prompt with customer context (name, company, tier, active orders)
3. Route to Claude via Cloudflare AI Gateway
4. Stream response tokens back via SSE
5. If Claude unavailable: fallback to Groq -> GLM -> graceful degradation message
```

**AI safety guardrails:**
- Never reveal supplier costs, margin data, internal pricing
- Never auto-submit anything -- every action needs user confirmation
- Rate limit: 30 messages/minute per user
- Estimation tool always includes disclaimer
- Large quantity detection: flag abnormal quantities for confirmation

### Chat Message Rendering

**User messages:**
- `var(--color-primary)` bg, white text, rounded-2xl, rounded-br-md (rounded-bl-md in RTL).
- Max-width 80%. p-12px 16px. Inter 400 14px. Aligned inline-end.

**AI messages:**
- `var(--color-card)` bg, border 1px, rounded-2xl, rounded-bl-md (rounded-br-md in RTL).
- Max-width 85%. p-16px. Inter 400 14px.
- Streaming: text appears word-by-word. Structured content (cards, tables) appears after streaming with spring animation.

**Product cards (inline):**
- Compact: image 48px, name, price range (Geist Mono), "Add to Quote" button (blue outline, h-32px).

**Status cards (inline):**
- Order number in Geist Mono, status badge (semantic color), key dates.

**Action buttons (inline):**
- Blue outline, h-32px. Trigger portal actions when clicked.

**Typing indicator:**
- "HyperQuote is thinking..." -- Inter 400 12px muted, 3-dot animation.

**Cancellation:**
- While streaming, send button becomes stop button (Square icon, red tint).
- Click aborts via AbortController.

### Portal-Wide AI Context

**Floating AI button (when windows are open):**
- 44px circle, blue bg, Sparkles 20px. Bottom-right (bottom-left RTL). Spring entrance.
- Opens mini AI chat as Elevated glass panel (380px, 60vh).
- Context-aware: "I see you're looking at Order #847 -- need help?"
- `Ctrl+J` toggles from anywhere.

**Supplier mode AI:**
- When role toggled to Supplier: AI context switches. Different system prompt, different data access.
- Conversations per role preserved in Zustand (keyed by role).

### Package Versions for AI

| Package | Version | Notes |
|---------|---------|-------|
| @tanstack/ai | ^0.9.1 | 0.x -- wrap behind abstraction |
| @tanstack/ai-react | ^0.7.5 | 0.x -- `useChat()` for streaming |
| @cloudflare/tanstack-ai | ^0.1.6 | 0.x -- Workers AI + AI Gateway |

**ALL 0.x packages. Wrap behind abstraction layer for swapability.**

## Non-Negotiable Rules
1. **AI never reveals supplier costs, margin data, or internal pricing.**
2. **AI never auto-submits anything.** Every action requires explicit user confirmation.
3. **Geist Mono for ALL numbers** in AI responses -- order numbers, prices, quantities.
4. **Arabic-Indic numerals** when locale is Arabic.
5. **React Aria Components** for all interactive elements within chat (buttons, forms, inputs).
6. **Motion v12** for rich message entrance animations. Spring for cards appearing.
7. **Zustand + sessionStorage** for conversation persistence. Survives page refresh within session.
8. **`.inputValidator()`, NOT `.validator()`** for the aiChat server function.
9. **Rate limit: 30 messages/minute.** Show warning, not hard block.
10. **Estimation disclaimer mandatory.** "This is an estimate. Verify with your engineer before ordering."

## Known Risks & Gotchas

### 0.x AI Packages
- @tanstack/ai (0.9.1), @tanstack/ai-react (0.7.5), @cloudflare/tanstack-ai (0.1.6) are ALL 0.x.
- Wrap behind thin abstraction layer. APIs may change.
- Test SSE streaming reliability -- connection drops need graceful recovery.

### Streaming Edge Cases
- Long responses may hit timeout limits on Workers.
- AbortController must properly clean up SSE connection.
- Partial structured content (product cards, tables) -- buffer until complete before rendering.

### Context Management
- Sliding window: last 20 messages sent with each request.
- Customer context (name, company, tier, active orders) injected into system prompt.
- Avoid sending sensitive data (exact prices, internal notes) in AI context.

### Slash Commands
- `/quote`, `/track`, `/price`, `/help` -- trigger specialized flows.
- Need autocomplete UI when user types `/`.
- Must work in both English and Arabic (detect language, same functionality).

### Conversation History
- Stored in Zustand with sessionStorage persist.
- History overlay is Elevated glass (NOT a sidebar) -- spatial philosophy.
- Conversations must be resumable -- clicking a thread loads its messages.

## Tips
- AI never reveals supplier costs, margin data, or internal pricing
- AI never auto-submits anything -- every action needs user confirmation
- Rate limit: 30 messages/minute
- Conversation stored in Zustand (sessionStorage persist)
- Rich messages: text streams word-by-word, then structured content (cards) appears with spring animation
- Quick action chips change based on conversation stage -- contextual
- History overlay is Elevated glass, NOT a sidebar -- preserves spatial philosophy
- Slash commands trigger command palette with autocomplete
- AbortController for stream cancellation is critical
- Wrap all 0.x AI packages behind abstraction for swapability
