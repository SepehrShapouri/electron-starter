import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { AppIcon } from "@/components/app-icon"
import { cn } from "@/lib/utils"

const nativeSelectVariants = cva(
  "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground gap-1.5 border transition-colors select-none focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 focus-visible:ring-3 aria-invalid:ring-3 outline-none disabled:pointer-events-none disabled:cursor-not-allowed w-full min-w-0 appearance-none py-1.5",
  {
    variants: {
      variant: {
        default:
          "border-input bg-transparent dark:bg-input/30 dark:hover:bg-input/50",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "border-transparent bg-transparent hover:bg-muted hover:text-foreground",
      },
      size: {
        xs: "h-6 rounded-sm pr-6 pl-2 text-xs",
        sm: "h-7 rounded-md pr-7.5 pl-2.5 text-[0.8rem]",
        default: "h-8 rounded-lg pr-8 pl-2.5 text-sm",
        lg: "h-9 rounded-lg pr-8 pl-2.5 text-sm",
        xl: "h-10 rounded-lg pr-9 pl-3 text-sm",
        xxl: "h-12 rounded-xl pr-10 pl-3.5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const nativeSelectIconSizes = cva(
  "text-muted-foreground top-1/2 -translate-y-1/2 pointer-events-none absolute select-none right-2",
  {
    variants: {
      size: {
        xs: "size-3 right-2",
        sm: "size-3.5 right-2.5",
        default: "size-4 right-2.5",
        lg: "size-4 right-2.5",
        xl: "size-4 right-3",
        xxl: "size-5 right-3.5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> &
  VariantProps<typeof nativeSelectVariants>

function NativeSelect({
  className,
  variant = "default",
  size = "default",
  ...props
}: NativeSelectProps) {
  return (
    <div
      className={cn(
        "group/native-select relative w-fit has-[select:disabled]:opacity-50",
        className
      )}
      data-slot="native-select-wrapper"
      data-size={size}
    >
      <select
        data-slot="native-select"
        data-size={size}
        data-variant={variant}
        className={cn(nativeSelectVariants({ variant, size }))}
        {...props}
      />
      <AppIcon
        name="IconChevronDownMedium"
        className={cn(nativeSelectIconSizes({ size }))}
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  )
}

function NativeSelectOption({ ...props }: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" {...props} />
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn(className)}
      {...props}
    />
  )
}

export {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
  nativeSelectVariants,
}
