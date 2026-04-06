import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { motion } from 'motion/react'
import { useCallback, useState } from 'react'
import { LionMark } from '@hyperquote/ui/brand/LionMark'
import { SearchBar } from '../../components/home/SearchBar'
import { GreetingText } from '../../components/home/GreetingText'
import { AttentionBadge } from '../../components/home/AttentionBadge'
import { getCEOAttentionItems } from '../../lib/server/attention'

// ============================================================================
// Server function: compute time of day in Cairo timezone (avoids hydration mismatch)
// ============================================================================

const getHomeData = createServerFn({ method: 'GET' }).handler(async () => {
  const cairoHour = new Date().toLocaleString('en-US', {
    timeZone: 'Africa/Cairo',
    hour: 'numeric',
    hour12: false,
  })
  const hour = parseInt(cairoHour, 10)

  let timeOfDay: 'morning' | 'afternoon' | 'evening'
  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning'
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = 'afternoon'
  } else {
    timeOfDay = 'evening'
  }

  const { count: attentionCount } = await getCEOAttentionItems()

  return { timeOfDay, attentionCount }
})

// ============================================================================
// Route
// ============================================================================

export const Route = createFileRoute('/_ceo/')({
  loader: () => getHomeData(),
  component: CEOHome,
})

// ============================================================================
// Component
// ============================================================================

function CEOHome() {
  const { timeOfDay, attentionCount } = Route.useLoaderData()
  const { name } = Route.useRouteContext()
  const navigate = useNavigate()
  const [searchValue, setSearchValue] = useState('')

  const handleSearchSubmit = useCallback(
    (q: string) => {
      navigate({ to: '/_ceo/search', search: { q } })
    },
    [navigate],
  )

  const handleAttentionClick = useCallback(() => {
    navigate({ to: '/_ceo/attention' })
  }, [navigate])

  return (
    <div className="relative flex flex-col items-center justify-center h-dvh px-4">
      {/* Lion watermark -- centered, behind content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <LionMark className="w-64 h-64" opacity={0.04} />
      </div>

      {/* Content -- above watermark */}
      <div className="relative z-10 flex flex-col items-center gap-6 w-full">
        {/* Greeting */}
        <GreetingText timeOfDay={timeOfDay} name={name ?? ''} />

        {/* Search bar with subtle spring entrance */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-full flex justify-center"
        >
          <SearchBar
            value={searchValue}
            onChange={setSearchValue}
            onSubmit={handleSearchSubmit}
          />
        </motion.div>

        {/* Attention badge -- conditional */}
        <AttentionBadge
          count={attentionCount}
          onClick={handleAttentionClick}
        />

        {/* Digest / Insight links -- typography emphasis only, no accent */}
        <div className="flex gap-4 text-sm">
          <button
            type="button"
            onClick={() => navigate({ to: '/_ceo/digest' })}
            className="font-semibold text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors"
          >
            View today's digest
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: '/_ceo/insight' })}
            className="font-semibold text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors"
          >
            View weekly insight
          </button>
        </div>
      </div>
    </div>
  )
}
