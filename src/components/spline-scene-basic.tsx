'use client'

import { SplineScene } from '@/components/ui/splite'
import { Card } from '@/components/ui/card'
import { Spotlight } from '@/components/ui/spotlight'

export function SplineSceneBasic() {
  return (
    <Card className="relative mx-auto h-[500px] w-full max-w-4xl overflow-hidden bg-background">
      <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" size={300} />

      <div className="flex h-full flex-col md:flex-row">
        {/* Left content */}
        <div className="relative z-10 flex flex-1 flex-col justify-center p-8">
          <span className="mb-4 w-fit rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Interactive 3D
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Bring your UI to life
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Beautiful 3D scenes create immersive experiences that capture
            attention and enhance your design.
          </p>
        </div>

        {/* Right content */}
        <div className="relative min-h-[240px] flex-1">
          <SplineScene
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="h-full w-full"
          />
        </div>
      </div>
    </Card>
  )
}
