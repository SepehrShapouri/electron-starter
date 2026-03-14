"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cva, type VariantProps } from "class-variance-authority";

import { AppIcon } from "@/components/app-icon";
import { cn } from "@/lib/utils";

const checkboxVariants = cva(
  "border-input dark:bg-input/30 data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary data-checked:border-primary aria-invalid:aria-checked:border-primary aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 flex items-center justify-center border transition-colors group-has-disabled/field:opacity-50 focus-visible:ring-3 aria-invalid:ring-3 peer relative shrink-0 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        xs: "size-3 rounded-[4px]",
        sm: "size-3.5 rounded-[5px]",
        default: "size-4 rounded-[6px]",
        lg: "size-5 rounded-[7px]",
        xl: "size-6 rounded-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

const checkboxIndicatorVariants = cva(
  "grid place-content-center text-current transition-none",
  {
    variants: {
      size: {
        xs: "[&>svg]:size-3",
        sm: "[&>svg]:size-3.5",
        default: "[&>svg]:size-4",
        lg: "[&>svg]:size-4.5",
        xl: "[&>svg]:size-5.5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

type CheckboxProps = CheckboxPrimitive.Root.Props &
  VariantProps<typeof checkboxVariants>;

function Checkbox({ className, size = "default", ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(checkboxVariants({ size }), className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className={cn(checkboxIndicatorVariants({ size }))}
      >
        <AppIcon name="IconCheckmark2Small" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox, checkboxVariants };
