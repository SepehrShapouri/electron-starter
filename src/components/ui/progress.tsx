"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const progressTrackVariants = cva(
  "bg-muted rounded-full relative flex w-full items-center overflow-x-hidden",
  {
    variants: {
      size: {
        xs: "h-0.5",
        sm: "h-1",
        default: "h-1.5",
        lg: "h-2",
        xl: "h-2.5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

type ProgressProps = ProgressPrimitive.Root.Props &
  VariantProps<typeof progressTrackVariants>

function Progress({
  className,
  children,
  value,
  size = "default",
  ...props
}: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn("flex flex-wrap gap-3", className)}
      {...props}
    >
      {children}
      <ProgressTrack size={size}>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  )
}

type ProgressTrackProps = ProgressPrimitive.Track.Props &
  VariantProps<typeof progressTrackVariants>

function ProgressTrack({
  className,
  size = "default",
  ...props
}: ProgressTrackProps) {
  return (
    <ProgressPrimitive.Track
      className={cn(progressTrackVariants({ size }), className)}
      data-slot="progress-track"
      {...props}
    />
  )
}

function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn("bg-primary h-full transition-all", className)}
      {...props}
    />
  )
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      className={cn("text-sm font-medium", className)}
      data-slot="progress-label"
      {...props}
    />
  )
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      className={cn("text-muted-foreground ml-auto text-sm tabular-nums", className)}
      data-slot="progress-value"
      {...props}
    />
  )
}

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
  progressTrackVariants,
}
