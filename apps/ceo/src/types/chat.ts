import type { EntityType } from './entity'

export interface ChartData {
  type: 'bar'
  label: string
  data: { label: string; value: number }[]
}

export interface Citation {
  text: string
  source: string
}

export interface EntityLink {
  type: EntityType
  id: string
  label: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  charts?: ChartData[]
  citations?: Citation[]
  entityLinks?: EntityLink[]
}
