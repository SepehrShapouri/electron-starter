"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cva, type VariantProps } from "class-variance-authority";

import { AppIcon } from "@/components/app-icon";
import { cn } from "@/lib/utils";

const radioGroupItemVariants = cva(
  "border-input text-primary dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 flex rounded-full focus-visible:ring-3 aria-invalid:ring-3 group/radio-group-item peer relative aspect-square shrink-0 border outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50",
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

const radioGroupIndicatorVariants = cva(
  "group-aria-invalid/radio-group-item:text-destructive text-primary flex items-center justify-center",
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

const radioGroupDotVariants = cva(
  "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 fill-current",
  {
    variants: {
      size: {
        xs: "size-[6px]",
        sm: "size-[7px]",
        default: "size-2",
        lg: "size-[10px]",
        xl: "size-3",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid w-full gap-2", className)}
      {...props}
    />
  );
}

type RadioGroupItemProps = RadioPrimitive.Root.Props &
  VariantProps<typeof radioGroupItemVariants>;

function RadioGroupItem({
  className,
  size = "default",
  ...props
}: RadioGroupItemProps) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(radioGroupItemVariants({ size }), className)}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className={cn(radioGroupIndicatorVariants({ size }))}
      >
        <AppIcon
          name="IconFormCircle"
          fallbackName="IconCircle"
          iconFill="filled"
          className={cn(radioGroupDotVariants({ size }))}
        />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  );
}

export { RadioGroup, RadioGroupItem, radioGroupItemVariants };
