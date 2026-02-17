import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center font-medium justify-center rounded-full border w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-red-7/40 aria-invalid:border-red-5 transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-neutral-12 text-neutral-1 [a&]:hover:bg-neutral-12/80",
        primary:
          "border-transparent bg-primary-9 text-white [a&]:hover:bg-primary-10",
        accent:
          "border-transparent bg-accent-9 text-white [a&]:hover:bg-accent-10",
        destructive:
          "border-transparent bg-red-9 text-white [a&]:hover:bg-red-10",
        success:
          "border-transparent bg-green-9 text-white [a&]:hover:bg-green-10",
        warning:
          "border-transparent bg-yellow-9 text-black [a&]:hover:bg-yellow-10",
        secondary:
          "border-transparent bg-neutral-a3 text-foreground [a&]:hover:bg-neutral-a4",
        secondaryPrimary:
          "border-transparent bg-primary-a3 text-primary-12 [a&]:hover:bg-primary-a4",
        secondaryAccent:
          "border-transparent bg-accent-a3 text-accent-12 [a&]:hover:bg-accent-a4",
        secondaryDestructive:
          "border-transparent bg-red-a3 text-red-12 [a&]:hover:bg-red-a4",
        secondarySuccess:
          "border-transparent bg-green-a3 text-green-12 [a&]:hover:bg-green-a",
        secondaryWarning:
          "border-transparent bg-yellow-a3 text-yellow-12 [a&]:hover:bg-yellow-a4",
        outline: "text-foreground [a&]:hover:bg-background-2",
        outlinePrimary:
          "text-primary-12 border-primary-a4 [a&]:hover:bg-primary-a4",
        outlineAccent:
          "text-accent-12 border-accent-a4 [a&]:hover:bg-accent-a2",
        outlineDestructive: "text-red-12 border-red-a4 [a&]:hover:bg-red-a4",
        outlineSuccess: "text-green-12 border-green-a4 [a&]:hover:bg-green-a4",
        outlineWarning:
          "text-yellow-12 border-yellow-a4 [a&]:hover:bg-yellow-a4",
      },
      size: {
        sm: "text-xs px-2 py-0.5 [&>svg]:size-3 gap-1",
        default: "text-sm px-2 py-0.5 [&>svg]:size-4 gap-1",
        lg: "text-sm px-3 py-1.5 [&>svg]:size-4 gap-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
