'use client'

import { useEffect, useRef } from 'react'

const COLORS = ['#FFD700', '#FF3B30', '#0A84FF', '#34C759', '#FF9500', '#AF52DE', '#FFFFFF', '#EC4899']

type Shape = 'rect' | 'circle' | 'strip'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  shape: Shape
  rotation: number
  rotationSpeed: number
  tilt: number
  tiltSpeed: number
  wobble: number
  wobbleSpeed: number
  opacity: number
  gravity: number
  drag: number
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function pickShape(): Shape {
  const r = Math.random()
  if (r < 0.4) return 'rect'
  if (r < 0.7) return 'strip'
  return 'circle'
}

function makeCannonParticle(originX: number, originY: number, direction: 1 | -1): Particle {
  const spread = 0.55
  const angle = -Math.PI / 2 + randomBetween(-spread, spread) * direction
  const speed = randomBetween(9, 19)
  return {
    x: originX,
    y: originY,
    vx: Math.cos(angle) * speed * (direction === -1 ? -1 : 1),
    vy: Math.sin(angle) * speed,
    size: randomBetween(6, 13),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: pickShape(),
    rotation: randomBetween(0, Math.PI * 2),
    rotationSpeed: randomBetween(-0.25, 0.25),
    tilt: randomBetween(0, Math.PI * 2),
    tiltSpeed: randomBetween(0.06, 0.18),
    wobble: randomBetween(0, Math.PI * 2),
    wobbleSpeed: randomBetween(0.03, 0.09),
    opacity: 1,
    gravity: randomBetween(0.18, 0.32),
    drag: randomBetween(0.006, 0.016),
  }
}

function makeShowerParticle(width: number) {
  return {
    x: randomBetween(0, width),
    y: randomBetween(-40, -10),
    vx: randomBetween(-1.2, 1.2),
    vy: randomBetween(0.8, 2.4),
    size: randomBetween(5, 11),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: pickShape(),
    rotation: randomBetween(0, Math.PI * 2),
    rotationSpeed: randomBetween(-0.2, 0.2),
    tilt: randomBetween(0, Math.PI * 2),
    tiltSpeed: randomBetween(0.04, 0.1),
    wobble: randomBetween(0, Math.PI * 2),
    wobbleSpeed: randomBetween(0.02, 0.06),
    opacity: 1,
    gravity: randomBetween(0.05, 0.12),
    drag: randomBetween(0.002, 0.008),
  } as Particle
}

export default function ConfettiIntro() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem('fpr-confetti-shown')) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    sessionStorage.setItem('fpr-confetti-shown', '1')
    if (reduceMotion) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    ctx.scale(dpr, dpr)

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      ctx.scale(dpr, dpr)
    }
    window.addEventListener('resize', resize)

    const particles: Particle[] = []
    for (let i = 0; i < 110; i++) particles.push(makeCannonParticle(width * 0.06, height * 0.98, 1))
    for (let i = 0; i < 110; i++) particles.push(makeCannonParticle(width * 0.94, height * 0.98, -1))
    for (let i = 0; i < 50; i++) particles.push(makeShowerParticle(width))

    const startTime = performance.now()
    const duration = 4500
    let rafId = 0

    function frame(now: number) {
      const elapsed = now - startTime
      ctx!.clearRect(0, 0, width, height)

      for (const p of particles) {
        p.vy += p.gravity * 0.055
        p.vx *= 1 - p.drag
        p.vy *= 1 - p.drag * 0.25
        p.wobble += p.wobbleSpeed
        p.x += p.vx + Math.sin(p.wobble) * 0.7
        p.y += p.vy
        p.rotation += p.rotationSpeed
        p.tilt += p.tiltSpeed

        if (elapsed > duration * 0.6) {
          p.opacity = Math.max(0, 1 - (elapsed - duration * 0.6) / (duration * 0.4))
        }

        ctx!.save()
        ctx!.translate(p.x, p.y)
        ctx!.rotate(p.rotation)
        ctx!.globalAlpha = p.opacity
        ctx!.fillStyle = p.color

        if (p.shape === 'circle') {
          ctx!.beginPath()
          ctx!.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx!.fill()
        } else if (p.shape === 'strip') {
          const flutter = Math.sin(p.tilt)
          ctx!.fillRect(-p.size * 0.9, (-p.size / 5) * flutter, p.size * 1.8, p.size / 3)
        } else {
          const flutter = Math.cos(p.tilt)
          ctx!.scale(1, flutter === 0 ? 0.01 : flutter)
          ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
        }
        ctx!.restore()
      }

      if (elapsed < duration) {
        rafId = requestAnimationFrame(frame)
      } else {
        ctx!.clearRect(0, 0, width, height)
      }
    }

    rafId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9999]"
      aria-hidden="true"
    />
  )
}
