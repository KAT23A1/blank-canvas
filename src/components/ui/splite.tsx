'use client'

import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react'

// A stale/removed build chunk makes the dynamic import reject. Without a
// boundary that rejection bubbles up and blanks the whole page, so we retry
// once and then fall back to nothing.
const Spline = lazy(() =>
  import('@splinetool/react-spline').catch(async (err) => {
    await new Promise((r) => setTimeout(r, 600))
    return import('@splinetool/react-spline').catch(() => {
      console.warn('Spline scene unavailable', err)
      return { default: () => null } as unknown as typeof import('@splinetool/react-spline')
    })
  }),
)

interface SplineSceneProps {
  scene: string
  className?: string
}

class SplineBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  override state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override componentDidCatch(error: unknown) {
    console.warn('Spline scene failed to load', error)
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  // Spline needs WebGL — only mount it in the browser, never during SSR.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const fallback = (
    <div className="flex h-full w-full items-center justify-center">
      <span className="loader" />
    </div>
  )

  if (!mounted) return fallback

  return (
    <SplineBoundary fallback={<div className="h-full w-full" aria-hidden />}>
      <Suspense fallback={fallback}>
        <Spline scene={scene} className={className} />
      </Suspense>
    </SplineBoundary>
  )
}
