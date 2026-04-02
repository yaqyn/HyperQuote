export function getTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light'
  return (
    (document.documentElement.getAttribute('data-theme') as
      | 'light'
      | 'dark') ?? 'light'
  )
}

export function setTheme(theme: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', theme)
}

export function toggleTheme() {
  const current = getTheme()
  setTheme(current === 'dark' ? 'light' : 'dark')
}

export function initTheme() {
  if (typeof window === 'undefined') return
  const stored = localStorage.getItem('hq-theme')
  if (stored === 'dark' || stored === 'light') {
    setTheme(stored)
  } else {
    // Default to light — no system preference detection
    setTheme('light')
  }
}

export function persistTheme(theme: 'light' | 'dark') {
  localStorage.setItem('hq-theme', theme)
  setTheme(theme)
}
