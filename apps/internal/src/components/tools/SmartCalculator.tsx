import { useState, useCallback } from 'react'
import { Button } from 'react-aria-components'

// ─── Currency Rates (EGP base) ──────────────────────────

const CURRENCIES = [
  { code: 'EGP', symbol: 'ج.م' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'SAR', symbol: 'ر.س' },
  { code: 'AED', symbol: 'د.إ' },
  { code: 'CNY', symbol: '¥' },
  { code: 'TRY', symbol: '₺' },
  { code: 'INR', symbol: '₹' },
] as const

const RATES: Record<string, number> = {
  EGP: 1, USD: 0.0204, EUR: 0.0188, GBP: 0.0161,
  SAR: 0.0766, AED: 0.075, CNY: 0.148, TRY: 0.66, INR: 1.71,
}

type Mode = 'calc' | 'convert'

// ─── Component ──────────────────────────────────────────

export function SmartCalculator() {
  return (
    <div className="flex flex-col h-full overflow-y-auto" data-module-content>
      <CalcView />
      <div className="h-px mx-4 bg-black/[0.04] dark:bg-white/[0.04]" />
      <ConvertView />
    </div>
  )
}

// ─── Calculator ─────────────────────────────────────────

function CalcView() {
  const [display, setDisplay] = useState('0')
  const [expression, setExpression] = useState('')
  const [shouldReset, setShouldReset] = useState(false)

  const input = useCallback((char: string) => {
    if (shouldReset) {
      setDisplay(char)
      setShouldReset(false)
    } else {
      setDisplay((p) => (p === '0' ? char : p + char))
    }
  }, [shouldReset])

  const op = useCallback((o: string) => {
    setExpression((p) => p + display + ` ${o} `)
    setShouldReset(true)
  }, [display])

  const equals = useCallback(() => {
    try {
      const result = new Function(`return (${expression + display})`)()
      setDisplay(Number.isFinite(result) ? parseFloat(result.toFixed(8)).toString() : 'Error')
    } catch { setDisplay('Error') }
    setExpression('')
    setShouldReset(true)
  }, [expression, display])

  const clear = useCallback(() => {
    setDisplay('0')
    setExpression('')
    setShouldReset(false)
  }, [])

  // Keyboard support
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation()
    const key = e.key
    if (key >= '0' && key <= '9') input(key)
    else if (key === '.') { if (!display.includes('.')) setDisplay((p) => p + '.') }
    else if (key === '+') op('+')
    else if (key === '-') op('-')
    else if (key === '*') op('*')
    else if (key === '/') { e.preventDefault(); op('/') }
    else if (key === '%') { const n = parseFloat(display); if (!isNaN(n)) setDisplay((n / 100).toString()) }
    else if (key === 'Enter' || key === '=') equals()
    else if (key === 'Escape' || key === 'c' || key === 'C') clear()
    else if (key === 'Backspace') setDisplay((p) => p.length > 1 ? p.slice(0, -1) : '0')
  }, [input, op, equals, clear, display])

  const buttons = [
    { l: 'C', a: clear, s: 'fn' },
    { l: '±', a: () => setDisplay((p) => p.startsWith('-') ? p.slice(1) : '-' + p), s: 'fn' },
    { l: '%', a: () => { const n = parseFloat(display); if (!isNaN(n)) setDisplay((n / 100).toString()) }, s: 'fn' },
    { l: '÷', a: () => op('/'), s: 'op' },
    { l: '7', a: () => input('7') },
    { l: '8', a: () => input('8') },
    { l: '9', a: () => input('9') },
    { l: '×', a: () => op('*'), s: 'op' },
    { l: '4', a: () => input('4') },
    { l: '5', a: () => input('5') },
    { l: '6', a: () => input('6') },
    { l: '−', a: () => op('-'), s: 'op' },
    { l: '1', a: () => input('1') },
    { l: '2', a: () => input('2') },
    { l: '3', a: () => input('3') },
    { l: '+', a: () => op('+'), s: 'op' },
    { l: '0', a: () => input('0'), w: true },
    { l: '.', a: () => { if (!display.includes('.')) setDisplay((p) => p + '.') } },
    { l: '=', a: equals, s: 'eq' },
  ]

  const btnClass = (s?: string, w?: boolean) => {
    const base = 'flex items-center justify-center h-11 rounded-xl text-[14px] font-medium cursor-pointer outline-none transition-all duration-100 active:scale-[0.96]'
    const col = w ? ' col-span-2' : ''
    const style = s === 'fn' ? ' bg-black/[0.05] dark:bg-white/[0.07] text-[var(--color-text-muted)]'
      : s === 'op' ? ' text-[var(--color-primary)] bg-[var(--color-primary)]/[0.06]'
        : s === 'eq' ? ' bg-[var(--color-primary)] text-white'
          : ' text-[var(--color-text)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
    return base + col + style
  }

  return (
    <div
      className="flex flex-col p-4 gap-2 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Display */}
      <div className="text-right px-1 py-2 mb-1">
        {expression && (
          <p className="text-[11px] text-[var(--color-text-subtle)] font-[family-name:var(--font-geist-mono)] tabular-nums truncate mb-0.5">
            {expression}
          </p>
        )}
        <p className="text-[28px] font-medium text-[var(--color-text)] font-[family-name:var(--font-geist-mono)] tabular-nums truncate leading-tight">
          {display}
        </p>
      </div>

      {/* Compact grid — fixed height, not flex-1 */}
      <div className="grid grid-cols-4 gap-1.5">
        {buttons.map((b) => (
          <Button key={b.l} onPress={b.a} className={btnClass(b.s, b.w)}>
            {b.l}
          </Button>
        ))}
      </div>

      {/* Keyboard hint */}
      <p className="text-[10px] text-[var(--color-text-subtle)] text-center mt-2 opacity-50">
        Type to calculate · Enter = equals · Esc = clear
      </p>
    </div>
  )
}

// ─── Currency Converter ─────────────────────────────────

function ConvertView() {
  const [amount, setAmount] = useState('1000')
  const [from, setFrom] = useState('EGP')
  const [to, setTo] = useState('USD')

  const result = (() => {
    const num = parseFloat(amount) || 0
    return (num / (RATES[from] ?? 1)) * (RATES[to] ?? 1)
  })()

  const fromInfo = CURRENCIES.find((c) => c.code === from)!
  const toInfo = CURRENCIES.find((c) => c.code === to)!
  const rate = (RATES[to] ?? 1) / (RATES[from] ?? 1)

  return (
    <div className="flex flex-col flex-1 p-4 gap-4">
      {/* Amount */}
      <div>
        <label className="text-[10px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider">
          Amount
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          className="w-full mt-1 text-2xl font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)] bg-transparent border-b border-black/[0.08] dark:border-white/[0.08] pb-2 outline-none focus:border-[var(--color-primary)] transition-colors"
        />
      </div>

      {/* From */}
      <CurrencyPicker label="From" selected={from} onSelect={setFrom} />

      {/* Swap */}
      <div className="flex justify-center">
        <Button
          onPress={() => { setFrom(to); setTo(from) }}
          className="text-[11px] font-medium text-[var(--color-primary)] hover:underline cursor-pointer outline-none"
        >
          ↕ Swap
        </Button>
      </div>

      {/* To */}
      <CurrencyPicker label="To" selected={to} onSelect={setTo} />

      {/* Result */}
      <div className="mt-auto pt-4 border-t border-black/[0.04] dark:border-white/[0.04]">
        <p className="text-[11px] text-[var(--color-text-subtle)]">
          {fromInfo.symbol} {parseFloat(amount || '0').toLocaleString()} {from} =
        </p>
        <p className="text-2xl font-medium font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)] mt-0.5">
          {toInfo.symbol} {result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-[13px] text-[var(--color-text-muted)] ml-1.5">{to}</span>
        </p>
        <p className="text-[10px] text-[var(--color-text-subtle)] mt-1.5">
          1 {from} = {rate.toFixed(4)} {to}
        </p>
      </div>
    </div>
  )
}

function CurrencyPicker({ label, selected, onSelect }: { label: string; selected: string; onSelect: (code: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider">
        {label}
      </label>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {CURRENCIES.map((c) => (
          <Button
            key={c.code}
            onPress={() => onSelect(c.code)}
            className={`px-2 py-1 rounded-lg text-[11px] font-medium cursor-pointer outline-none transition-all duration-100 ${
              selected === c.code
                ? 'bg-[var(--color-text)] text-[var(--color-surface)]'
                : 'text-[var(--color-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
            }`}
          >
            {c.code}
          </Button>
        ))}
      </div>
    </div>
  )
}
