import * as React from "react"
import { OTPInput, OTPInputContext } from "input-otp"
import { cva, type VariantProps } from "class-variance-authority"

import { AppIcon } from "@/components/app-icon"
import { cn } from "@/lib/utils"

const inputOTPSlotVariants = cva(
  "dark:bg-input/30 border-input data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:ring-destructive/20 dark:data-[active=true]:aria-invalid:ring-destructive/40 aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive bg-transparent border-y border-r transition-all outline-none first:border-l data-[active=true]:ring-3 relative flex items-center justify-center data-[active=true]:z-10",
  {
    variants: {
      size: {
        default: "h-8 w-8 text-sm first:rounded-l-lg last:rounded-r-lg",
        xs: "h-6 w-6 text-xs first:rounded-l-sm last:rounded-r-sm",
        sm: "h-7 w-7 text-[0.8rem] first:rounded-l-md last:rounded-r-md",
        lg: "h-9 w-9 text-sm first:rounded-l-lg last:rounded-r-lg",
        xl: "h-10 w-10 text-sm first:rounded-l-lg last:rounded-r-lg",
        xxl: "h-12 w-12 text-base first:rounded-l-xl last:rounded-r-xl",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

type InputOTPSize = NonNullable<VariantProps<typeof inputOTPSlotVariants>["size"]>

const InputOTPSizeContext = React.createContext<InputOTPSize>("default")

function InputOTP({
  className,
  containerClassName,
  children,
  size = "default",
  ...props
}: Omit<React.ComponentProps<typeof OTPInput>, "render" | "size"> & {
  children: React.ReactNode
  containerClassName?: string
  size?: InputOTPSize
}) {
  return (
    <InputOTPSizeContext.Provider value={size}>
      <OTPInput
        data-slot="input-otp"
        data-size={size}
        containerClassName={cn(
          "cn-input-otp flex items-center has-disabled:opacity-50",
          containerClassName
        )}
        spellCheck={false}
        className={cn("disabled:cursor-not-allowed", className)}
        {...props}
      >
        {children}
      </OTPInput>
    </InputOTPSizeContext.Provider>
  )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40 has-aria-invalid:border-destructive rounded-lg has-aria-invalid:ring-3 flex items-center", className)}
      {...props}
    />
  )
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number
}) {
  const inputOTPContext = React.useContext(OTPInputContext)
  const size = React.useContext(InputOTPSizeContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {}

  return (
    <div
      data-slot="input-otp-slot"
      data-size={size}
      data-active={isActive}
      className={cn(inputOTPSlotVariants({ size }), className)}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="animate-caret-blink bg-foreground h-4 w-px duration-1000" />
        </div>
      )}
    </div>
  )
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-separator"
      className="[&_svg:not([class*='size-'])]:size-4 flex items-center"
      role="separator"
      {...props}
    >
      <AppIcon name="IconMinusSmall" fallbackName="IconCircle" />
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
export type { InputOTPSize }
