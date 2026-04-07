import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Button, Popover, DialogTrigger } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { Bell, MoreHorizontal, User, LogOut } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { hasPermission, type AuthSession } from '@hyperquote/auth'
import { MODULES } from '../../lib/modules'
import { useInternalStore } from '../../stores/internal'
import { useNotificationStore } from '../../stores/notifications'

// Height per icon button (40px) + gap (4px)
const ICON_SLOT = 44
// Reserved slots at bottom: notifications + profile + gaps
const RESERVED_BOTTOM = 2
// Minimum vertical padding (top + bottom)
const RAIL_PADDING = 24

interface SidebarProps {
  auth: AuthSession
  onNotificationsPress: () => void
}

export function Sidebar({ auth, onNotificationsPress }: SidebarProps) {
  const { t } = useTranslation('internal')
  const activeModule = useInternalStore((s) => s.activeModule)
  const setActiveModule = useInternalStore((s) => s.setActiveModule)
  const unreadCount = useNotificationStore((s) => s.unreadCount)

  const [isHovered, setIsHovered] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [maxVisible, setMaxVisible] = useState<number>(Infinity)
  const [overflowOpen, setOverflowOpen] = useState(false)
  const railRef = useRef<HTMLElement>(null)
  const overflowTriggerRef = useRef<HTMLButtonElement>(null)

  const allowedModules = useMemo(
    () => MODULES.filter((m) => hasPermission(auth, m.permission)),
    [auth],
  )

  // Calculate how many module icons fit
  const calculateFit = useCallback(() => {
    if (!railRef.current) return
    const available = railRef.current.clientHeight - RAIL_PADDING
    // Total slots needed = modules + reserved bottom (notifications + profile)
    const totalNeeded = allowedModules.length + RESERVED_BOTTOM
    const canFit = Math.floor(available / ICON_SLOT)

    if (canFit >= totalNeeded) {
      setMaxVisible(Infinity)
    } else {
      // Reserve 1 slot for the "more" button + reserved bottom slots
      setMaxVisible(Math.max(0, canFit - RESERVED_BOTTOM - 1))
    }
  }, [allowedModules.length])

  useEffect(() => {
    calculateFit()
    const observer = new ResizeObserver(calculateFit)
    if (railRef.current) observer.observe(railRef.current)
    return () => observer.disconnect()
  }, [calculateFit])

  const visibleModules = maxVisible === Infinity
    ? allowedModules
    : allowedModules.slice(0, maxVisible)

  const overflowModules = maxVisible === Infinity
    ? []
    : allowedModules.slice(maxVisible)

  const hasOverflow = overflowModules.length > 0
  const sidebarOpen = useInternalStore((s) => s.sidebarOpen)
  const sidebarFocusIndex = useInternalStore((s) => s.sidebarFocusIndex)
  const isVisible = isHovered || isPinned || sidebarOpen

  const name = auth.user?.user_metadata?.name ?? 'User'
  const initials = name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  function handleModulePress(id: string) {
    setActiveModule(activeModule === id ? null : id)
  }

  return (
    <>
      {/* Hover trigger zone — invisible strip at screen edge */}
      <div
        className="fixed inset-y-0 left-0 z-50 w-3"
        onMouseEnter={() => setIsHovered(true)}
      />

      {/* Sidebar rail */}
      <AnimatePresence>
        {isVisible && (
          <motion.nav
            ref={railRef}
            initial={{ x: -56, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -56, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
              setIsHovered(false)
              if (!overflowOpen) setIsPinned(false)
            }}
            className="fixed inset-y-0 left-0 z-50 flex flex-col items-center w-14 py-3 max-md:hidden"
            style={{
              background: 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(24px) saturate(1.8)',
              WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
              borderRight: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '4px 0 24px rgba(0,0,0,0.03)',
            }}
            aria-label="Main navigation"
          >
            {/* Module icons — top section */}
            <div className="flex flex-col items-center gap-1 flex-1 min-h-0">
              {visibleModules.map((mod, i) => {
                const isActive = activeModule === mod.id
                const isFocused = sidebarOpen && sidebarFocusIndex === i
                return (
                  <SidebarIcon
                    key={mod.id}
                    icon={<mod.icon size={20} strokeWidth={1.5} />}
                    label={t(mod.labelKey)}
                    hotkey={mod.hotkey}
                    isActive={isActive}
                    isFocused={isFocused}
                    onPress={() => handleModulePress(mod.id)}
                  />
                )
              })}

              {/* Overflow "more" button */}
              {hasOverflow && (
                <DialogTrigger isOpen={overflowOpen} onOpenChange={(open) => {
                  setOverflowOpen(open)
                  if (open) setIsPinned(true)
                  else setTimeout(() => setIsPinned(false), 100)
                }}>
                  <Button
                    ref={overflowTriggerRef}
                    aria-label="More modules"
                    className="flex items-center justify-center w-10 h-10 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-150 cursor-pointer"
                  >
                    <MoreHorizontal size={20} strokeWidth={1.5} />
                  </Button>
                  <Popover
                    placement="end"
                    offset={8}
                    className="rounded-2xl p-2 min-w-[200px] outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.85)',
                      backdropFilter: 'blur(24px) saturate(1.8)',
                      WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div className="flex flex-col gap-0.5">
                      {/* Overflow module items */}
                      {overflowModules.map((mod) => {
                        const isActive = activeModule === mod.id
                        return (
                          <Button
                            key={mod.id}
                            onPress={() => {
                              handleModulePress(mod.id)
                              setOverflowOpen(false)
                            }}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer outline-none ${
                              isActive
                                ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/8'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-black/5'
                            }`}
                          >
                            <mod.icon size={18} strokeWidth={1.5} />
                            <span>{t(mod.labelKey)}</span>
                            <span className="ml-auto text-xs text-[var(--color-text-subtle)] font-[family-name:var(--font-geist-mono)]">
                              {mod.hotkey}
                            </span>
                          </Button>
                        )
                      })}

                      {/* Divider */}
                      <div className="h-px bg-black/6 my-1.5" />

                      {/* Notifications in overflow */}
                      <Button
                        onPress={() => {
                          onNotificationsPress()
                          setOverflowOpen(false)
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-black/5 transition-all duration-150 cursor-pointer outline-none"
                      >
                        <div className="relative">
                          <Bell size={18} strokeWidth={1.5} />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                          )}
                        </div>
                        <span>Notifications</span>
                        {unreadCount > 0 && (
                          <span className="ml-auto text-xs font-[family-name:var(--font-geist-mono)] text-[var(--color-primary)]">
                            {unreadCount}
                          </span>
                        )}
                      </Button>

                      {/* Profile in overflow */}
                      <Button
                        onPress={() => setOverflowOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-black/5 transition-all duration-150 cursor-pointer outline-none"
                      >
                        <User size={18} strokeWidth={1.5} />
                        <span>{name}</span>
                      </Button>
                    </div>
                  </Popover>
                </DialogTrigger>
              )}
            </div>

            {/* Bottom section — always visible when no overflow */}
            <div className="flex flex-col items-center gap-1 mt-auto pt-2">
              {/* Separator line */}
              <div className="w-6 h-px bg-black/8 dark:bg-white/8 mb-1" />

              {/* Notifications */}
              <SidebarIcon
                icon={
                  <div className="relative">
                    <Bell size={20} strokeWidth={1.5} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--color-primary)] ring-2 ring-white/65" />
                    )}
                  </div>
                }
                label={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                isActive={false}
                onPress={onNotificationsPress}
              />

              {/* Profile avatar */}
              <Button
                aria-label={`Profile: ${name}`}
                onPress={() => {}}
                className="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-[10px] font-semibold text-[var(--color-primary)] group-hover:bg-[var(--color-primary)]/15 transition-colors">
                  {initials}
                </div>
              </Button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  )
}

// --- SidebarIcon ---

interface SidebarIconProps {
  icon: React.ReactNode
  label: string
  hotkey?: string
  isActive: boolean
  isFocused?: boolean
  onPress: () => void
}

function SidebarIcon({ icon, label, hotkey, isActive, isFocused, onPress }: SidebarIconProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const hoverTimeout = useRef<ReturnType<typeof setTimeout>>(null)

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        hoverTimeout.current = setTimeout(() => setShowTooltip(true), 400)
      }}
      onMouseLeave={() => {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
        setShowTooltip(false)
      }}
    >
      <Button
        aria-label={label}
        onPress={onPress}
        className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 cursor-pointer ${
          isFocused
            ? 'ring-2 ring-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10'
            : isActive
            ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-black/5 dark:hover:bg-white/5'
        }`}
      >
        {icon}
      </Button>

      {/* Active indicator dot */}
      {isActive && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-0.5 w-1 h-4 rounded-full bg-[var(--color-primary)]"
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none z-[60]"
            style={{
              background: 'rgba(15,23,42,0.9)',
              color: '#fff',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span>{label}</span>
            {hotkey && (
              <span className="ml-2 opacity-50 font-[family-name:var(--font-geist-mono)]">
                {hotkey}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
