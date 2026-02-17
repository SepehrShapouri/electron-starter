import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  "file:text-foreground placeholder:text-muted-foreground selection:bg-accent-4 selection:text-accent-11 flex w-full min-w-0 rounded-md border shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "h-8 px-2.5 text-sm",
        default: "h-9 px-3 text-base",
        lg: "h-10 px-3 text-base",
        xl: "h-12 px-4 text-base rounded-lg",
      },
      variant: {
        default: "bg-floated",
        soft: "border-transparent bg-neutral-a3 shadow-none",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
);

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

function Input({
  className,
  type,
  size,
  variant,
  ...props
}: InputProps & { size?: "sm" | "default" | "lg" | "xl" }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        inputVariants({ size, variant }),
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-red-7/20 dark:aria-invalid:ring-red-7/40 aria-invalid:border-red-7",
        className
      )}
      {...props}
    />
  );
}

export { Input, inputVariants };
