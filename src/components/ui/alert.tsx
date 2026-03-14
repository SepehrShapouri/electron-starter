import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva("grid gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4 w-full relative group/alert", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground border-primary *:data-[slot=alert-description]:text-primary-foreground",
      soft: "bg-muted text-foreground border-border *:data-[slot=alert-description]:text-muted-foreground",
      outline: "bg-background text-foreground border-border *:data-[slot=alert-description]:text-muted-foreground",
      destructive: "bg-red-9 text-white border-red-9 *:data-[slot=alert-description]:text-white",
      "destructive-soft": "bg-red-a3 text-red-11 border-red-a5 *:data-[slot=alert-description]:text-red-11/90",
      "destructive-outline": "bg-background text-red-11 border-red-a5 *:data-[slot=alert-description]:text-red-11/90",
      blue: "bg-blue-9 text-white border-blue-9 *:data-[slot=alert-description]:text-white",
      "blue-soft": "bg-blue-a3 text-blue-11 border-blue-a5 *:data-[slot=alert-description]:text-blue-11/90",
      "blue-outline": "bg-background text-blue-11 border-blue-a5 *:data-[slot=alert-description]:text-blue-11/90",
      green: "bg-green-9 text-white border-green-9 *:data-[slot=alert-description]:text-white",
      "green-soft": "bg-green-a3 text-green-11 border-green-a5 *:data-[slot=alert-description]:text-green-11/90",
      "green-outline": "bg-background text-green-11 border-green-a5 *:data-[slot=alert-description]:text-green-11/90",
      yellow: "bg-yellow-9 text-black border-yellow-9 *:data-[slot=alert-description]:text-black",
      "yellow-soft": "bg-yellow-a3 text-yellow-11 border-yellow-a5 *:data-[slot=alert-description]:text-yellow-11/90",
      "yellow-outline": "bg-background text-yellow-11 border-yellow-a5 *:data-[slot=alert-description]:text-yellow-11/90",
      purple: "bg-purple-9 text-white border-purple-9 *:data-[slot=alert-description]:text-white",
      "purple-soft": "bg-purple-a3 text-purple-11 border-purple-a5 *:data-[slot=alert-description]:text-purple-11/90",
      "purple-outline": "bg-background text-purple-11 border-purple-a5 *:data-[slot=alert-description]:text-purple-11/90",
      beige: "bg-beige-9 text-white border-beige-9 *:data-[slot=alert-description]:text-white",
      "beige-soft": "bg-beige-a3 text-beige-11 border-beige-a5 *:data-[slot=alert-description]:text-beige-11/90",
      "beige-outline": "bg-background text-beige-11 border-beige-a5 *:data-[slot=alert-description]:text-beige-11/90",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-medium group-has-[>svg]/alert:col-start-2 [&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground text-sm text-balance md:text-pretty [&_p:not(:last-child)]:mb-4 [&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2 right-2", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
