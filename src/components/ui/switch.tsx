"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const switchVariants = cva(
  "data-checked:bg-blue-9 data-unchecked:bg-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 dark:data-unchecked:bg-input/80 shrink-0 rounded-full border border-transparent focus-visible:ring-3 aria-invalid:ring-3 peer group/switch relative inline-flex items-center transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 data-disabled:cursor-not-allowed data-disabled:opacity-50",
  {
    variants: {
      size: {
        xs: "h-3.5 w-6",
        sm: "h-4 w-7",
        default: "h-4.5 w-8",
        lg: "h-5.5 w-10",
        xl: "h-6.5 w-12",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

const switchThumbVariants = cva(
  "bg-white rounded-full pointer-events-none block ring-0 transition-transform data-checked:translate-x-[calc(100%-2px)] data-unchecked:translate-x-0",
  {
    variants: {
      size: {
        xs: "size-3",
        sm: "size-3.5",
        default: "size-4",
        lg: "size-5",
        xl: "size-6",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

type SwitchProps = SwitchPrimitive.Root.Props &
  VariantProps<typeof switchVariants>;

function Switch({ className, size = "default", ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(switchVariants({ size }), className)}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(switchThumbVariants({ size }))}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch, switchVariants };
