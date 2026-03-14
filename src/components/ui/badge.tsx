import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "rounded-4xl border border-transparent font-medium transition-all inline-flex items-center justify-center w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive overflow-hidden group/badge",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground dark:hover:bg-muted aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-red-9 hover:bg-red-10 text-white focus-visible:border-red-10 focus-visible:ring-red-a4",
        "destructive-soft":
          "bg-red-a3 hover:bg-red-a4 text-red-11 focus-visible:border-red-a4 focus-visible:ring-red-a4",
        blue: "bg-blue-9 hover:bg-blue-10 text-white focus-visible:border-blue-10 focus-visible:ring-blue-a4",
        "blue-soft":
          "bg-blue-a3 hover:bg-blue-a4 text-blue-11 focus-visible:border-blue-a4 focus-visible:ring-blue-a4",
        green:
          "bg-green-9 hover:bg-green-10 text-white focus-visible:border-green-10 focus-visible:ring-green-a4",
        "green-soft":
          "bg-green-a3 hover:bg-green-a4 text-green-11 focus-visible:border-green-a4 focus-visible:ring-green-a4",
        yellow:
          "bg-yellow-9 hover:bg-yellow-10 text-black focus-visible:border-yellow-10 focus-visible:ring-yellow-a4",
        "yellow-soft":
          "bg-yellow-a3 hover:bg-yellow-a4 text-yellow-11 focus-visible:border-yellow-a4 focus-visible:ring-yellow-a4",
        purple:
          "bg-purple-9 hover:bg-purple-10 text-white focus-visible:border-purple-10 focus-visible:ring-purple-a4",
        "purple-soft":
          "bg-purple-a3 hover:bg-purple-a4 text-purple-11 focus-visible:border-purple-a4 focus-visible:ring-purple-a4",
        beige:
          "bg-beige-9 hover:bg-beige-10 text-white focus-visible:border-beige-10 focus-visible:ring-beige-a4",
        "beige-soft":
          "bg-beige-a3 hover:bg-beige-a4 text-beige-11 focus-visible:border-beige-a4 focus-visible:ring-beige-a4",
        "destructive-outline": "border-red-a5 text-red-11",
        "blue-outline": "border-blue-a5 text-blue-11",
        "green-outline": "border-green-a5 text-green-11",
        "yellow-outline": "border-yellow-a5 text-yellow-11",
        "purple-outline": "border-purple-a5 text-purple-11",
        "beige-outline": "border-beige-a5 text-beige-11",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-5 gap-1 px-2 py-0.5 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3!",
        xs: "h-4 gap-1 px-1.5 py-0 text-[0.625rem] has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 [&>svg]:size-2.5!",
        sm: "h-4.5 gap-1 px-2 py-0 text-[0.6875rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-2.5!",
        lg: "h-6 gap-1.5 px-2.5 py-0.5 text-sm has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&>svg]:size-3.5!",
        xl: "h-7 gap-1.5 px-3 py-1 text-sm has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&>svg]:size-4!",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ className, variant, size })),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
      size,
    },
  })
}

export { Badge, badgeVariants }
