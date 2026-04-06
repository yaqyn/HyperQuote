interface SparklineSVGProps {
  data: number[]
  width?: number
  height?: number
  color?: string
}

/**
 * Lightweight inline SVG sparkline.
 * Pure SVG polyline, no chart library.
 * Renders 6-month aging trend as a simple line.
 */
export function SparklineSVG({
  data,
  width = 80,
  height = 24,
  color = '#2563EB',
}: SparklineSVGProps) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const padding = 2
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const points = data
    .map((value, i) => {
      const x = padding + (i / (data.length - 1)) * chartWidth
      const y = padding + chartHeight - ((value - min) / range) * chartHeight
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}
