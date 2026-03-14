import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const textareaVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 border transition-colors focus-visible:ring-3 aria-invalid:ring-3 placeholder:text-muted-foreground flex field-sizing-content min-h-16 w-full outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-y",
  {
    variants: {
      variant: {
        default: "border-input bg-transparent dark:bg-input/30 ",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "border-transparent bg-transparent hover:bg-muted hover:text-foreground",
      },
      size: {
        default: "rounded-lg px-2.5 py-2 text-sm",
        xs: "rounded-sm px-2 py-1.5 text-xs",
        sm: "rounded-md px-2.5 py-1.5 text-[0.8rem]",
        lg: "rounded-lg px-2.5 py-2.5 text-sm",
        xl: "rounded-lg px-3 py-2.5 text-sm",
        xxl: "rounded-xl px-3.5 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type TextareaProps = Omit<React.ComponentProps<"textarea">, "size"> &
  VariantProps<typeof textareaVariants>;

function Textarea({
  className,
  variant = "default",
  size = "default",
  ...props
}: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      data-size={size}
      data-variant={variant}
      className={cn(textareaVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Textarea, textareaVariants };
