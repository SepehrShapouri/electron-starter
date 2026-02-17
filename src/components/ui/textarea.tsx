import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const textareaVariants = cva(
  "placeholder:text-muted-foreground selection:bg-accent-a4 selection:text-accent-12 flex w-full min-w-0 rounded-md border shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "min-h-8 px-2.5 py-1.5 text-sm",
        default: "min-h-16 px-3 py-2 text-base",
        lg: "min-h-20 px-3 py-2.5 text-base",
        xl: "min-h-24 px-4 py-3 text-base rounded-lg",
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

interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size">,
    VariantProps<typeof textareaVariants> {}

function Textarea({
  className,
  size,
  variant,
  ...props
}: TextareaProps & { size?: "sm" | "default" | "lg" | "xl" }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        textareaVariants({ size, variant }),
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-red-7/20 dark:aria-invalid:ring-red-7/40 aria-invalid:border-red-7",
        className
      )}
      {...props}
    />
  );
}

export { Textarea, textareaVariants };
