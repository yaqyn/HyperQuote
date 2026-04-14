import { useRef, useEffect } from 'react'

// Simple 2D noise using layered sine waves — cheap but organic-looking
function noise2d(x: number, y: number): number {
  return (
    Math.sin(x * 1.2 + y * 0.9) * 0.5 +
    Math.sin(x * 0.7 - y * 1.3) * 0.3 +
    Math.sin(x * 2.1 + y * 0.4) * 0.2
  )
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  seed: number    // unique offset into noise field
  wanderX: number // slowly evolving noise coordinates
  wanderY: number
  glint: number           // 0 = off, 1 = peak brightness
  glintPhase: 'off' | 'rising' | 'hold' | 'falling'
  glintSpeed: number      // rate of change per frame
  holdFrames: number      // frames to hold at peak
}

const PARTICLE_COUNT = 60
const MAX_RADIUS = 1.8
const MIN_RADIUS = 0.4

function createParticle(w: number, h: number): Particle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.04,
    vy: -Math.random() * 0.03 - 0.005,
    radius: MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS),
    opacity: Math.random() * 0.35 + 0.05,
    seed: Math.random() * 1000,
    wanderX: Math.random() * 100,
    wanderY: Math.random() * 100,
    glint: 0,
    glintPhase: 'off' as const,
    glintSpeed: 0,
    holdFrames: 0,
  }
}

export function FloatingParticles({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)
  const reducedMotion = useRef(false)

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion.current) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas!.getBoundingClientRect()
      canvas!.width = rect.width * dpr
      canvas!.height = rect.height * dpr
      ctx!.scale(dpr, dpr)
    }

    resize()

    const rect = canvas.getBoundingClientRect()
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
      createParticle(rect.width, rect.height),
    )

    // Global glint: one particle at a time, long intervals
    let glintCooldown = Math.random() * 600 + 480 // 8-18 seconds at 60fps

    function animate() {
      const rect = canvas!.getBoundingClientRect()
      const w = rect.width
      const h = rect.height

      ctx!.clearRect(0, 0, w, h)

      // Pick one particle to glint when cooldown expires
      glintCooldown--
      if (glintCooldown <= 0) {
        const candidates = particlesRef.current.filter((p) => p.glint === 0)
        if (candidates.length > 0) {
          const chosen = candidates[Math.floor(Math.random() * candidates.length)]
          chosen.glint = 0
          chosen.glintPhase = 'rising'
          chosen.glintSpeed = 1 / 360 // 6 seconds at 60fps
          chosen.holdFrames = 60     // 1 second hold at peak
        }
        glintCooldown = Math.random() * 600 + 480
      }

      for (const p of particlesRef.current) {
        // Advance wander coordinates — slow crawl through noise field
        // Each particle crawls at slightly different speed for variety
        const crawlSpeed = 0.0015 + (p.seed % 10) * 0.00015
        p.wanderX += crawlSpeed
        p.wanderY += crawlSpeed * 0.7

        // Sample noise for this particle's current wander position
        const nx = noise2d(p.wanderX + p.seed, p.wanderY)
        const ny = noise2d(p.wanderX, p.wanderY + p.seed)

        // Nudge force — gentle but unpredictable
        const nudgeStrength = 0.02
        p.vx += nx * nudgeStrength
        p.vy += ny * nudgeStrength

        // Dampen velocity so particles don't accelerate forever
        p.vx *= 0.98
        p.vy *= 0.98

        // Subtle upward bias — dust rising in warm air
        p.vy -= 0.002

        // Apply velocity
        p.x += p.vx
        p.y += p.vy

        // Wrap around edges
        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
        if (p.y < -10) p.y = h + 10
        if (p.y > h + 10) p.y = -10

        // Glint — 6s rise, 1s hold, 6s fall
        if (p.glintPhase === 'rising') {
          p.glint = Math.min(1, p.glint + p.glintSpeed)
          if (p.glint >= 1) p.glintPhase = 'hold'
        } else if (p.glintPhase === 'hold') {
          p.holdFrames--
          if (p.holdFrames <= 0) p.glintPhase = 'falling'
        } else if (p.glintPhase === 'falling') {
          p.glint = Math.max(0, p.glint - p.glintSpeed)
          if (p.glint <= 0) p.glintPhase = 'off'
        }

        const drawOpacity = p.opacity + p.glint * (0.7 - p.opacity) // boost toward 0.7 at peak
        const drawRadius = p.radius + p.glint * 0.8 // swell slightly

        ctx!.beginPath()
        ctx!.arc(p.x, p.y, drawRadius, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(255, 255, 255, ${drawOpacity})`
        ctx!.fill()

        // Soft glow halo during glint
        if (p.glint > 0.1) {
          ctx!.beginPath()
          ctx!.arc(p.x, p.y, drawRadius * 3, 0, Math.PI * 2)
          ctx!.fillStyle = `rgba(255, 255, 255, ${p.glint * 0.08})`
          ctx!.fill()
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    const onResize = () => resize()
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%' }}
      aria-hidden="true"
    />
  )
}
