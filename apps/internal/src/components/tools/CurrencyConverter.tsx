import { useState, useMemo } from 'react'
import { Button } from 'react-aria-components'

// Common currencies for Egyptian B2B construction
const CURRENCIES = [
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م', flag: '🇪🇬' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', flag: '🇸🇦' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
] as const

// Mock rates (EGP base) — will be replaced with live API
const MOCK_RATES: Record<string, number> = {
  EGP: 1,
  USD: 0.0204,
  EUR: 0.0188,
  GBP: 0.0161,
  SAR: 0.0766,
  AED: 0.075,
  CNY: 0.148,
  TRY: 0.66,
  INR: 1.71,
  JPY: 3.13,
}

export function CurrencyConverter() {
  const [amount, setAmount] = useState('1000')
  const [fromCurrency, setFromCurrency] = useState('EGP')
  const [toCurrency, setToCurrency] = useState('USD')

  const converted = useMemo(() => {
    const num = parseFloat(amount) || 0
    const fromRate = MOCK_RATES[fromCurrency] ?? 1
    const toRate = MOCK_RATES[toCurrency] ?? 1
    // Convert: amount in FROM → EGP → TO
    const inEGP = num / fromRate
    return inEGP * toRate
  }, [amount, fromCurrency, toCurrency])

  const swap = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }

  const fromInfo = CURRENCIES.find((c) => c.code === fromCurrency)!
  const toInfo = CURRENCIES.find((c) => c.code === toCurrency)!

  return (
    <div className="flex flex-col h-full p-4 gap-5">
      {/* Amount input */}
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

      {/* From currency */}
      <div>
        <label className="text-[10px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider">
          From
        </label>
        <div className="flex flex-wrap gap-1 mt-2">
          {CURRENCIES.map((c) => (
            <Button
              key={c.code}
              onPress={() => setFromCurrency(c.code)}
              className={`px-2.5 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer outline-none transition-all duration-100 ${
                fromCurrency === c.code
                  ? 'bg-[var(--color-text)] text-[var(--color-surface)]'
                  : 'text-[var(--color-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
              }`}
            >
              {c.code}
            </Button>
          ))}
        </div>
      </div>

      {/* Swap button */}
      <div className="flex justify-center">
        <Button
          onPress={swap}
          className="text-[11px] font-medium text-[var(--color-primary)] hover:underline cursor-pointer outline-none"
        >
          ↕ Swap
        </Button>
      </div>

      {/* To currency */}
      <div>
        <label className="text-[10px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider">
          To
        </label>
        <div className="flex flex-wrap gap-1 mt-2">
          {CURRENCIES.map((c) => (
            <Button
              key={c.code}
              onPress={() => setToCurrency(c.code)}
              className={`px-2.5 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer outline-none transition-all duration-100 ${
                toCurrency === c.code
                  ? 'bg-[var(--color-text)] text-[var(--color-surface)]'
                  : 'text-[var(--color-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
              }`}
            >
              {c.code}
            </Button>
          ))}
        </div>
      </div>

      {/* Result */}
      <div className="mt-auto pt-4 border-t border-black/[0.04] dark:border-white/[0.04]">
        <p className="text-[11px] text-[var(--color-text-subtle)] mb-1">
          {fromInfo.symbol} {parseFloat(amount || '0').toLocaleString()} {fromCurrency} =
        </p>
        <p className="text-2xl font-medium font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">
          {toInfo.symbol} {converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-[13px] text-[var(--color-text-muted)] ml-1.5">{toCurrency}</span>
        </p>
        <p className="text-[10px] text-[var(--color-text-subtle)] mt-2">
          Rate: 1 {fromCurrency} = {(MOCK_RATES[toCurrency]! / MOCK_RATES[fromCurrency]!).toFixed(4)} {toCurrency}
        </p>
      </div>
    </div>
  )
}
