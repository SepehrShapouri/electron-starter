import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center hover:scale-`99 cursor-pointer gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-neutral-12 text-neutral-1 shadow-xs hover:bg-neutral-12/80",
        destructive:
          "bg-red-9 text-white hover:bg-red-10 focus-visible:ring-red-3",
        primary:
          "bg-primary-9 text-white hover:bg-primary-10 focus-visible:ring-blue-3",
        accent:
          "bg-accent-9 text-white hover:bg-accent-10 focus-visible:ring-blue-3",
        outline: "border bg-background shadow-xs hover:bg-neutral-a2",
        secondary: "bg-neutral-a3 hover:bg-neutral-a4",
        primarySecondary: "bg-primary-a3 text-primary-12 hover:bg-primary-a4",
        accentSecondary: "bg-accent-a3 text-accent-12 hover:bg-accent-a4",
        destructiveSecondary: "bg-red-a3 text-red-12 hover:bg-red-a4",
        ghost: "hover:bg-neutral-a4",
        link: "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        xl: "h-12 rounded-lg px-8 has-[>svg]:px-6 text-base [&_svg:not([class*='size-'])]:size-5",
        icon: "size-9",
        iconSm: "size-8",
        iconLg: "size-10",
        iconXl: "size-12 rounded-lg [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
