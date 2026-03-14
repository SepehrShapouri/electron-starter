import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 disabled:bg-input/50 dark:disabled:bg-input/80 text-base transition-colors file:text-sm file:font-medium focus-visible:ring-3 aria-invalid:ring-3 md:text-sm file:text-foreground placeholder:text-muted-foreground w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "shadow-xs border-input focus-visible:border-ring aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 border bg-transparent",
        soft: "bg-neutral-a3 border-none",
      },
      size: {
        default: "h-8 rounded-lg px-2.5 py-1 file:h-6",
        xs: "h-6 rounded-sm px-2 text-xs file:h-4",
        sm: "h-7 rounded-md px-2.5 text-[0.8rem] file:h-5",
        lg: "h-9 rounded-lg px-2.5 file:h-7",
        xl: "h-10 rounded-lg px-3 file:h-8",
        xxl: "h-12 rounded-xl px-3.5 text-base file:h-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type InputProps = Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants>;

function Input({
  className,
  type,
  variant = "default",
  size = "default",
  ...props
}: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Input, inputVariants };
