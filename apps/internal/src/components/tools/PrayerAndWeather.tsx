import { useState, useEffect, useMemo } from 'react'

// ─── Prayer Times ───────────────────────────────────────

interface Prayer {
  name: string
  time: string
  passed: boolean
  isNext: boolean
}

function getMockPrayerTimes(): Omit<Prayer, 'passed' | 'isNext'>[] {
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
  let diff = timeToMinutes(targetTime) - nowMinutes
  if (diff < 0) diff += 24 * 60
  const hours = Math.floor(diff / 60)
  const minutes = diff % 60
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

// ─── Weather ────────────────────────────────────────────

interface WeatherData {
  temp: number
  condition: string
  humidity: number
  windSpeed: number
  feelsLike: number
  icon: string
}

function getMockWeather(): WeatherData {
  const hour = new Date().getHours()
  const isDay = hour >= 6 && hour < 18
  return {
    temp: isDay ? 34 : 24,
    condition: 'Clear',
    humidity: 35,
    windSpeed: 15,
    feelsLike: isDay ? 36 : 23,
    icon: isDay ? '☀' : '🌙',
  }
}

// ─── Component ──────────────────────────────────────────

export function PrayerAndWeather() {
  const [now, setNow] = useState(() => new Date())
  const [weather] = useState(getMockWeather)

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
  const isKhamsin = weather.windSpeed > 30
  const isFriday = now.getDay() === 5

  const hijriDate = now.toLocaleDateString('en-u-ca-islamic', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-6" data-module-content>
      {/* Next prayer — hero */}
      {nextPrayer && (
        <div className="text-center py-2">
          <p className="text-[10px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider">
            Next Prayer
          </p>
          <p className="text-lg font-semibold text-[var(--color-text)] mt-1">
            {nextPrayer.name}
          </p>
          <p className="font-[family-name:var(--font-geist-mono)] text-2xl tabular-nums text-[var(--color-primary)] mt-0.5">
            {getCountdown(nextPrayer.time)}
          </p>
        </div>
      )}

      {/* All prayers */}
      <div className="flex flex-col gap-0.5">
        {prayers.map((prayer) => (
          <div
            key={prayer.name}
            className={`flex items-center justify-between px-3 py-2 rounded-lg ${
              prayer.isNext
                ? 'bg-[var(--color-primary)]/[0.06]'
                : prayer.passed
                  ? 'opacity-35'
                  : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${
                prayer.isNext ? 'bg-[var(--color-primary)]'
                  : prayer.passed ? 'bg-[var(--color-text-subtle)]'
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

      {/* Friday note */}
      {isFriday && (
        <p className="text-[11px] text-[var(--color-primary)] text-center px-3 py-1.5 rounded-lg bg-[var(--color-primary)]/[0.04]">
          Jumu'ah — No deliveries 11:30 AM - 1:30 PM
        </p>
      )}

      {/* Divider */}
      <div className="h-px bg-black/[0.04] dark:bg-white/[0.04]" />

      {/* Weather — compact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{weather.icon}</span>
          <div>
            <p className="font-[family-name:var(--font-geist-mono)] text-xl tabular-nums text-[var(--color-text)]">
              {weather.temp}°C
            </p>
            <p className="text-[11px] text-[var(--color-text-subtle)]">
              {weather.condition} · Feels {weather.feelsLike}°
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-[var(--color-text-muted)]">
            {weather.humidity}% humidity
          </p>
          <p className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-[var(--color-text-muted)]">
            {weather.windSpeed} km/h wind
          </p>
        </div>
      </div>

      {/* Khamsin warning */}
      {isKhamsin && (
        <div className="px-3 py-2 rounded-lg bg-red-500/10 text-center">
          <p className="text-[12px] font-medium text-red-600">
            Khamsin Warning — Cover sheet materials
          </p>
        </div>
      )}

      {/* Hijri date */}
      <p className="text-[11px] text-[var(--color-text-subtle)] text-center mt-auto">
        {hijriDate}
      </p>
    </div>
  )
}
