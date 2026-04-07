import { useState, useCallback } from 'react'
import { Button } from 'react-aria-components'

export function ToolsCalculator() {
  const [display, setDisplay] = useState('0')
  const [expression, setExpression] = useState('')
  const [shouldReset, setShouldReset] = useState(false)

  const handleNumber = useCallback((num: string) => {
    if (shouldReset) {
      setDisplay(num)
      setShouldReset(false)
    } else {
      setDisplay((prev) => (prev === '0' ? num : prev + num))
    }
  }, [shouldReset])

  const handleOperator = useCallback((op: string) => {
    setExpression((prev) => prev + display + ' ' + op + ' ')
    setShouldReset(true)
  }, [display])

  const handleEquals = useCallback(() => {
    try {
      const fullExpr = expression + display
      // Safe eval using Function constructor (no user code injection risk — numeric only)
      const result = new Function(`return (${fullExpr})`)()
      const formatted = Number.isFinite(result)
        ? parseFloat(result.toFixed(8)).toString()
        : 'Error'
      setDisplay(formatted)
      setExpression('')
      setShouldReset(true)
    } catch {
      setDisplay('Error')
      setExpression('')
      setShouldReset(true)
    }
  }, [expression, display])

  const handleClear = useCallback(() => {
    setDisplay('0')
    setExpression('')
    setShouldReset(false)
  }, [])

  const handlePercent = useCallback(() => {
    const num = parseFloat(display)
    if (!isNaN(num)) {
      setDisplay((num / 100).toString())
    }
  }, [display])

  const handleDecimal = useCallback(() => {
    if (!display.includes('.')) {
      setDisplay((prev) => prev + '.')
    }
  }, [display])

  const buttons = [
    { label: 'C', action: handleClear, style: 'muted' },
    { label: '%', action: handlePercent, style: 'muted' },
    { label: '÷', action: () => handleOperator('/'), style: 'accent' },
    { label: '×', action: () => handleOperator('*'), style: 'accent' },
    { label: '7', action: () => handleNumber('7'), style: 'default' },
    { label: '8', action: () => handleNumber('8'), style: 'default' },
    { label: '9', action: () => handleNumber('9'), style: 'default' },
    { label: '−', action: () => handleOperator('-'), style: 'accent' },
    { label: '4', action: () => handleNumber('4'), style: 'default' },
    { label: '5', action: () => handleNumber('5'), style: 'default' },
    { label: '6', action: () => handleNumber('6'), style: 'default' },
    { label: '+', action: () => handleOperator('+'), style: 'accent' },
    { label: '1', action: () => handleNumber('1'), style: 'default' },
    { label: '2', action: () => handleNumber('2'), style: 'default' },
    { label: '3', action: () => handleNumber('3'), style: 'default' },
    { label: '=', action: handleEquals, style: 'primary' },
    { label: '0', action: () => handleNumber('0'), style: 'default', wide: true },
    { label: '.', action: handleDecimal, style: 'default' },
  ]

  const getButtonClass = (style: string) => {
    const base = 'flex items-center justify-center h-12 rounded-xl text-[15px] font-medium cursor-pointer outline-none transition-all duration-100 active:scale-95'
    switch (style) {
      case 'muted':
        return `${base} bg-black/[0.04] dark:bg-white/[0.06] text-[var(--color-text-muted)] hover:bg-black/[0.07] dark:hover:bg-white/[0.09]`
      case 'accent':
        return `${base} bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/15`
      case 'primary':
        return `${base} bg-[var(--color-primary)] text-white hover:opacity-90 row-span-2`
      default:
        return `${base} bg-black/[0.02] dark:bg-white/[0.03] text-[var(--color-text)] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]`
    }
  }

  return (
    <div className="flex flex-col h-full p-4">
      {/* Display */}
      <div className="mb-4 text-right">
        {expression && (
          <p className="text-[11px] text-[var(--color-text-subtle)] font-[family-name:var(--font-geist-mono)] tabular-nums mb-1 truncate">
            {expression}
          </p>
        )}
        <p className="text-3xl font-medium text-[var(--color-text)] font-[family-name:var(--font-geist-mono)] tabular-nums truncate">
          {display}
        </p>
      </div>

      {/* Button grid */}
      <div className="grid grid-cols-4 gap-1.5 flex-1">
        {buttons.map((btn) => (
          <Button
            key={btn.label}
            onPress={btn.action}
            className={`${getButtonClass(btn.style)} ${btn.wide ? 'col-span-2' : ''}`}
          >
            {btn.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
