import { useState, useEffect, useMemo } from 'react'

interface Prayer {
  name: string
  time: string
  passed: boolean
  isNext: boolean
}

// Mock prayer times for Cairo — will be replaced with Aladhan API
function getMockPrayerTimes(): Omit<Prayer, 'passed' | 'isNext'>[] {
  // Approximate Cairo prayer times (vary by season)
  const month = new Date().getMonth()
  const isSummer = month >= 4 && month <= 9

  return [
    { name: 'Fajr', time: isSummer ? '03:45' : '05:15' },
    { name: 'Dhuhr', time: isSummer ? '11:55' : '11:45' },
    { name: 'Asr', time: isSummer ? '15:30' : '14:45' },
    { name: 'Maghrib', time: isSummer ? '18:50' : '17:15' },
    { name: 'Isha', time: isSummer ? '20:20' : '18:45' },
  ]
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function getCountdown(targetTime: string): string {
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const targetMinutes = timeToMinutes(targetTime)
  let diff = targetMinutes - nowMinutes
  if (diff < 0) diff += 24 * 60

  const hours = Math.floor(diff / 60)
  const minutes = diff % 60

  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

export function PrayerTimes() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const prayers = useMemo(() => {
    const raw = getMockPrayerTimes()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()

    let foundNext = false
    return raw.map((p) => {
      const pMinutes = timeToMinutes(p.time)
      const passed = pMinutes <= nowMinutes
      const isNext = !passed && !foundNext
      if (isNext) foundNext = true
      return { ...p, passed, isNext }
    })
  }, [now])

  const nextPrayer = prayers.find((p) => p.isNext)
  const today = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  // Hijri date (approximate — will use proper Hijri calendar API)
  const hijriDate = now.toLocaleDateString('en-u-ca-islamic', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex flex-col h-full p-4 gap-6">
      {/* Date */}
      <div className="text-center">
        <p className="text-[13px] text-[var(--color-text)]">{today}</p>
        <p className="text-[11px] text-[var(--color-text-subtle)] mt-0.5">{hijriDate}</p>
      </div>

      {/* Next prayer countdown */}
      {nextPrayer && (
        <div className="text-center py-4">
          <p className="text-[10px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider">
            Next Prayer
          </p>
          <p className="text-2xl font-semibold text-[var(--color-text)] mt-1">
            {nextPrayer.name}
          </p>
          <p className="font-[family-name:var(--font-geist-mono)] text-3xl tabular-nums text-[var(--color-primary)] mt-1">
            {getCountdown(nextPrayer.time)}
          </p>
          <p className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-[var(--color-text-muted)] mt-1">
            {nextPrayer.time}
          </p>
        </div>
      )}

      {/* All prayers */}
      <div className="flex flex-col gap-0.5">
        {prayers.map((prayer) => (
          <div
            key={prayer.name}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
              prayer.isNext
                ? 'bg-[var(--color-primary)]/[0.06]'
                : prayer.passed
                  ? 'opacity-40'
                  : ''
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`w-1.5 h-1.5 rounded-full ${
                prayer.isNext
                  ? 'bg-[var(--color-primary)]'
                  : prayer.passed
                    ? 'bg-[var(--color-text-subtle)]'
                    : 'bg-black/10 dark:bg-white/10'
              }`} />
              <span className={`text-[13px] font-medium ${
                prayer.isNext ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'
              }`}>
                {prayer.name}
              </span>
            </div>
            <span className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-[var(--color-text-muted)]">
              {prayer.time}
            </span>
          </div>
        ))}
      </div>

      {/* Friday Jumu'ah note */}
      {now.getDay() === 5 && (
        <div className="px-3 py-2 rounded-lg bg-[var(--color-primary)]/[0.04] text-center">
          <p className="text-[11px] text-[var(--color-primary)]">
            Jumu'ah — No deliveries 11:30 AM - 1:30 PM
          </p>
        </div>
      )}
    </div>
  )
}
