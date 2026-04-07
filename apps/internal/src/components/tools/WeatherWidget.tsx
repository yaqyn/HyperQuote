import { useState, useEffect } from 'react'

interface WeatherData {
  temp: number
  condition: string
  humidity: number
  windSpeed: number
  windDirection: string
  feelsLike: number
  city: string
  icon: string
}

// Mock weather for Cairo — will be replaced with OpenWeather API
function getMockWeather(): WeatherData {
  const hour = new Date().getHours()
  const isDay = hour >= 6 && hour < 18
  return {
    temp: isDay ? 34 : 24,
    condition: 'Clear',
    humidity: 35,
    windSpeed: 15,
    windDirection: 'NW',
    feelsLike: isDay ? 36 : 23,
    city: 'Cairo',
    icon: isDay ? '☀' : '🌙',
  }
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData>(getMockWeather)

  useEffect(() => {
    // Refresh every 10 minutes
    const id = setInterval(() => setWeather(getMockWeather()), 600_000)
    return () => clearInterval(id)
  }, [])

  const isKhamsin = weather.windSpeed > 30

  return (
    <div className="flex flex-col h-full p-4 gap-6">
      {/* City + condition */}
      <div className="text-center">
        <p className="text-[11px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider">
          {weather.city}
        </p>
        <p className="text-5xl mt-3 mb-2">{weather.icon}</p>
        <p className="text-[13px] text-[var(--color-text-muted)]">{weather.condition}</p>
      </div>

      {/* Temperature */}
      <div className="text-center">
        <p className="text-5xl font-medium font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">
          {weather.temp}°
        </p>
        <p className="text-[11px] text-[var(--color-text-subtle)] mt-1">
          Feels like {weather.feelsLike}°C
        </p>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Humidity" value={`${weather.humidity}%`} />
        <Stat label="Wind" value={`${weather.windSpeed} km/h`} />
        <Stat label="Direction" value={weather.windDirection} />
        <Stat label="Feels Like" value={`${weather.feelsLike}°C`} />
      </div>

      {/* Khamsin warning */}
      {isKhamsin && (
        <div className="px-3 py-2 rounded-lg bg-red-500/10 text-center">
          <p className="text-[12px] font-medium text-red-600">
            Khamsin Warning — High winds
          </p>
          <p className="text-[11px] text-red-500/70 mt-0.5">
            Outdoor operations may be affected. Cover sheet materials.
          </p>
        </div>
      )}

      {/* Construction impact notes */}
      <div className="mt-auto">
        <p className="text-[10px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider mb-2">
          Impact
        </p>
        <div className="flex flex-col gap-1">
          {weather.temp > 40 && (
            <ImpactNote text="Extreme heat — limit outdoor work hours" severity="high" />
          )}
          {weather.windSpeed > 20 && (
            <ImpactNote text="Strong winds — secure loose materials" severity="medium" />
          )}
          {weather.humidity > 70 && (
            <ImpactNote text="High humidity — protect cement/drywall" severity="medium" />
          )}
          {weather.temp <= 40 && weather.windSpeed <= 20 && weather.humidity <= 70 && (
            <ImpactNote text="No weather concerns for operations" severity="clear" />
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider">{label}</p>
      <p className="font-[family-name:var(--font-geist-mono)] text-[15px] tabular-nums text-[var(--color-text)] mt-0.5">{value}</p>
    </div>
  )
}

function ImpactNote({ text, severity }: { text: string; severity: 'high' | 'medium' | 'clear' }) {
  const color = severity === 'high' ? 'text-red-500' : severity === 'medium' ? 'text-yellow-600' : 'text-green-600'
  return (
    <p className={`text-[11px] ${color}`}>
      {severity === 'clear' ? '✓' : '⚠'} {text}
    </p>
  )
}
