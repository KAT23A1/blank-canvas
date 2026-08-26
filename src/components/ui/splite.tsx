'use client'

import { Suspense, lazy, useEffect, useState } from 'react'
const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
  scene: string
  className?: string
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
    <Suspense fallback={fallback}>
      <Spline scene={scene} className={className} />
    </Suspense>
  )
}
