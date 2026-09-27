import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '@/lib/feedback'

interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
  spin: number
  color: string
}

const DURATION_MS = 2200
const GRAVITY = 0.00055

/**
 * Confeti con los colores del tema, una sola vez al montarse. Decorativo: no recibe toques, no lo
 * anuncia el lector de pantalla y no aparece si el sistema pide reducir movimiento.
 */
export function Confetti({ pieces = 110 }: { pieces?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext('2d')
    if (!element || !context || prefersReducedMotion()) return

    const ratio = window.devicePixelRatio || 1
    const width = window.innerWidth
    const height = window.innerHeight
    element.width = width * ratio
    element.height = height * ratio
    context.scale(ratio, ratio)

    const style = getComputedStyle(document.documentElement)
    const colors = ['--accent', '--ok', '--accent-soft', '--bad'].map((name) => style.getPropertyValue(name).trim())
    const particles: Piece[] = Array.from({ length: pieces }, (_, i) => ({
      x: width / 2 + (Math.random() - 0.5) * width * 0.3,
      y: height * 0.3,
      vx: (Math.random() - 0.5) * 0.9,
      vy: -0.35 - Math.random() * 0.55,
      size: 5 + Math.random() * 5,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.02,
      color: colors[i % colors.length] || '#4338ca',
    }))

    let frame = 0
    let previous = performance.now()
    const started = previous
    const draw = (time: number) => {
      const dt = Math.min(time - previous, 32)
      previous = time
      const elapsed = time - started
      context.clearRect(0, 0, width, height)
      context.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - DURATION_MS * 0.6) / (DURATION_MS * 0.4))
      for (const p of particles) {
        p.vy += GRAVITY * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rotation += p.spin * dt
        context.save()
        context.translate(p.x, p.y)
        context.rotate(p.rotation)
        context.fillStyle = p.color
        context.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        context.restore()
      }
      if (elapsed < DURATION_MS) frame = requestAnimationFrame(draw)
      else context.clearRect(0, 0, width, height)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [pieces])

  return <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 z-40 size-full" />
}
