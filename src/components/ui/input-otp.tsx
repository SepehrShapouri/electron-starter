"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { MinusIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Variants (matches Input)
// ─────────────────────────────────────────────────────────────

const inputOTPSlotVariants = cva(
  " relative flex items-center justify-center border-y border-r text-sm font-medium shadow-xs transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md data-[active=true]:z-10 data-[active=true]:ring-[3px] data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:ring-red-7/20 dark:data-[active=true]:aria-invalid:ring-red-7/40 aria-invalid:border-red-7 data-[active=true]:aria-invalid:border-red-7",
  {
    variants: {
      size: {
        sm: "h-8 w-8 text-sm",
        default: "h-9 w-9 text-base",
        lg: "h-10 w-10 text-base",
        xl: "h-12 w-12 text-base first:rounded-l-lg last:rounded-r-lg",
      },
      variant: {
        default: "bg-floated",
        soft: "bg-neutral-a3 shadow-none",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
);

type InputOTPSlotProps = React.ComponentProps<"div"> &
  VariantProps<typeof inputOTPSlotVariants> & {
    index: number;
  };

// ─────────────────────────────────────────────────────────────
// Main Components
// ─────────────────────────────────────────────────────────────

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string;
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "flex items-center gap-2 has-disabled:opacity-50",
        containerClassName
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center", className)}
      {...props}
    />
  );
}

function InputOTPSlot({
  index,
  className,
  size = "default",
  variant = "default",
  ...props
}: InputOTPSlotProps) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(inputOTPSlotVariants({ size, variant }), className)}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="animate-caret-blink bg-foreground h-4 w-px duration-1000" />
        </div>
      )}
    </div>
  );
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props}>
      <MinusIcon />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
